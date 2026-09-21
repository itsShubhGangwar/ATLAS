import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { connectDB, disconnectDB } from "../../../config/db";
import { projectService } from "../project.service";
import { authService } from "../../auth";
import { User } from "../../../models/User";
import { Project } from "../../../models/Project";
import { ApiVersion } from "../../../models/ApiVersion";
import { GovernanceReportModel } from "../../../models/GovernanceReport";
import { DiffReportModel } from "../../../models/DiffReport";
import { ApiError } from "../../../utils/api-error";

describe("Project & API Version Management Service", () => {
  let userAId: string;
  let userBId: string;
  let projectId: string;
  let version1Id: string;
  let version2Id: string;

  const v1Yaml = fs.readFileSync(
    path.resolve(__dirname, "../../parser/fixtures/sample-openapi.yaml"),
    "utf-8"
  );
  const v2Yaml = fs.readFileSync(
    path.resolve(__dirname, "../../diff/fixtures/sample-openapi-v2.yaml"),
    "utf-8"
  );

  before(async () => {
    await connectDB();
    await User.deleteMany({ email: /@projecttest\.com$/ });

    const resA = await authService.register({
      name: "Engineer One",
      email: "one@projecttest.com",
      password: "password123",
    });
    userAId = resA.user.id;

    const resB = await authService.register({
      name: "Engineer Two",
      email: "two@projecttest.com",
      password: "password123",
    });
    userBId = resB.user.id;
  });

  after(async () => {
    const userIds = [userAId, userBId];
    await Project.deleteMany({ owner: { $in: userIds } });
    await User.deleteMany({ email: /@projecttest\.com$/ });
    await disconnectDB();
  });

  it("1. should create a project for authenticated user", async () => {
    const project = await projectService.createProject(
      { name: "Payments Gateway API", description: "Internal payments processing" },
      userAId
    );

    assert.ok(project._id);
    assert.equal(project.name, "Payments Gateway API");
    assert.equal(project.owner.toString(), userAId);
    projectId = project._id.toString();
  });

  it("2. should list own projects and enforce user isolation", async () => {
    const projectsA = await projectService.listProjects(userAId);
    assert.equal(projectsA.length, 1);
    assert.equal(projectsA[0].id, projectId);

    const projectsB = await projectService.listProjects(userBId);
    assert.equal(projectsB.length, 0); // User B has 0 projects
  });

  it("3. should reject unauthorized access to another user's project", async () => {
    await assert.rejects(
      async () => {
        await projectService.getProjectById(projectId, userBId);
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "FORBIDDEN");
        return true;
      }
    );
  });

  it("4. should update project details by owner and reject non-owner", async () => {
    // Owner update
    const updated = await projectService.updateProject(
      projectId,
      { description: "Updated payments description" },
      userAId
    );
    assert.equal(updated.description, "Updated payments description");

    // Non-owner update rejected
    await assert.rejects(
      async () => {
        await projectService.updateProject(projectId, { name: "Hacked Name" }, userBId);
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  it("5. should upload and parse valid OpenAPI specification into a persisted ApiVersion", async () => {
    const version = await projectService.createVersion(
      projectId,
      v1Yaml,
      "v1.0.0 Release",
      userAId
    );

    assert.ok(version._id);
    assert.equal(version.version, "1.0.0");
    assert.equal(version.openApiVersion, "3.0.3");
    assert.equal(version.projectId.toString(), projectId);
    assert.ok(version.endpointsCount > 0);
    assert.ok(version.schemasCount > 0);
    assert.ok(version.canonicalModel);
    assert.equal(version.canonicalModel.metadata.title, "ATLAS Sample Task & User API");

    version1Id = version._id.toString();
  });

  it("6. should reject invalid OpenAPI specifications with 400 INVALID_SPEC", async () => {
    await assert.rejects(
      async () => {
        await projectService.createVersion(projectId, "invalid: content: foo", undefined, userAId);
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "INVALID_SPEC");
        return true;
      }
    );
  });

  it("7. should list versions with summary metadata and exclude heavy spec strings", async () => {
    const list = await projectService.listVersions(projectId, userAId);
    assert.equal(list.length, 1);
    assert.equal(list[0].id, version1Id);
    assert.equal(list[0].version, "1.0.0");
    assert.equal((list[0] as any).originalSpec, undefined);
    assert.equal((list[0] as any).canonicalModel, undefined);
  });

  it("8. should retrieve full version details by ID for owner", async () => {
    const version = await projectService.getVersionById(projectId, version1Id, userAId);
    assert.equal(version._id.toString(), version1Id);
    assert.ok(version.canonicalModel);
    assert.ok(version.originalSpec);
  });

  it("9. should run governance analysis on persisted canonical model and save report", async () => {
    const report = await projectService.runAndSaveGovernance(projectId, version1Id, userAId);

    assert.ok(report._id);
    assert.equal(report.projectId.toString(), projectId);
    assert.equal(report.apiVersionId.toString(), version1Id);
    assert.ok(typeof report.score === "number");
    assert.ok(report.rulesRun === 8);
    assert.ok(Array.isArray(report.findings));

    // Verify stored in DB
    const inDb = await GovernanceReportModel.findById(report._id);
    assert.ok(inDb);
    assert.equal(inDb.score, report.score);
  });

  it("10. should retrieve latest saved governance report for a version", async () => {
    const latest = await projectService.getLatestGovernance(projectId, version1Id, userAId);
    assert.ok(latest);
    assert.equal(latest.apiVersionId.toString(), version1Id);
  });

  it("11. should upload version 2, compare with version 1, and persist DiffReport", async () => {
    const v2 = await projectService.createVersion(projectId, v2Yaml, "v2.0.0 Update", userAId);
    version2Id = v2._id.toString();

    const diff = await projectService.compareAndSaveDiff(
      projectId,
      version1Id,
      version2Id,
      userAId
    );

    assert.ok(diff._id);
    assert.equal(diff.projectId.toString(), projectId);
    assert.equal(diff.baseVersionId.toString(), version1Id);
    assert.equal(diff.newVersionId.toString(), version2Id);
    assert.equal(diff.summary.hasBreakingChanges, true);
    assert.ok(diff.summary.breakingCount > 0);

    const inDb = await DiffReportModel.findById(diff._id);
    assert.ok(inDb);
    assert.equal(inDb.summary.hasBreakingChanges, true);
  });

  it("12. should retrieve saved diff reports list for a project", async () => {
    const diffs = await projectService.listDiffReports(projectId, userAId);
    assert.ok(diffs.length >= 1);
    assert.equal(diffs[0].baseVersionId, version1Id);
    assert.equal(diffs[0].newVersionId, version2Id);
  });

  it("13. should calculate real dashboard metrics for user", async () => {
    const metrics = await projectService.getDashboardMetrics(userAId);
    assert.equal(metrics.projectsCount, 1);
    assert.equal(metrics.versionsCount, 2);
    assert.ok(metrics.endpointsCount > 0);
    assert.ok(metrics.schemasCount > 0);
    assert.ok(typeof metrics.recentGovernanceScore === "number");
    assert.ok(metrics.recentActivity.length >= 3);
  });

  it("14. should cascade delete project and all associated versions and reports", async () => {
    await projectService.deleteProject(projectId, userAId);

    // Verify project deleted
    const projectInDb = await Project.findById(projectId);
    assert.equal(projectInDb, null);

    // Verify versions deleted
    const versionsInDb = await ApiVersion.find({ projectId });
    assert.equal(versionsInDb.length, 0);

    // Verify governance reports deleted
    const govInDb = await GovernanceReportModel.find({ projectId });
    assert.equal(govInDb.length, 0);

    // Verify diff reports deleted
    const diffInDb = await DiffReportModel.find({ projectId });
    assert.equal(diffInDb.length, 0);
  });
});
