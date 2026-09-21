import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { connectDB, disconnectDB } from "../../../config/db";
import { projectService } from "../../project/project.service";
import { authService } from "../../auth";
import { EvolutionService } from "../evolution.service";
import { User } from "../../../models/User";
import { Project } from "../../../models/Project";
import { ApiVersion } from "../../../models/ApiVersion";
import { GovernanceReportModel } from "../../../models/GovernanceReport";
import { ApiError } from "../../../utils/api-error";

describe("API Evolution / Decision Timeline Service", () => {
  let userAId: string;
  let userBId: string;
  let singleVersionProjectId: string;
  let multiVersionProjectId: string;
  let emptyProjectId: string;

  let v1Id: string;
  let v2Id: string;
  let v3Id: string;

  const specV1 = `
openapi: 3.0.0
info:
  title: Inventory API
  version: 1.0.0
paths:
  /items:
    get:
      summary: List items
      responses:
        '200':
          description: OK
components:
  schemas:
    Item:
      type: object
      properties:
        id:
          type: string
`;

  const specV2 = `
openapi: 3.0.0
info:
  title: Inventory API
  version: 1.1.0
paths:
  /items:
    get:
      summary: List items
      responses:
        '200':
          description: OK
  /items/{id}:
    get:
      summary: Get item by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: OK
components:
  schemas:
    Item:
      type: object
      properties:
        id:
          type: string
    ItemDetail:
      type: object
      properties:
        id:
          type: string
        description:
          type: string
`;

  const specV3 = `
openapi: 3.0.0
info:
  title: Inventory API
  version: 2.0.0
paths:
  /items:
    get:
      summary: List items
      responses:
        '200':
          description: OK
components:
  schemas:
    Item:
      type: object
      properties:
        id:
          type: string
`;

  before(async () => {
    await connectDB();
    await User.deleteMany({ email: /@evolutiontest\.com$/ });

    const resA = await authService.register({
      name: "Evolution Engineer A",
      email: "eng_a@evolutiontest.com",
      password: "password123",
    });
    userAId = resA.user.id;

    const resB = await authService.register({
      name: "Evolution Engineer B",
      email: "eng_b@evolutiontest.com",
      password: "password123",
    });
    userBId = resB.user.id;

    // Create empty project
    const emptyProj = await projectService.createProject(
      { name: "Empty API Project", description: "No versions yet" },
      userAId
    );
    emptyProjectId = emptyProj._id.toString();

    // Create single version project
    const singleProj = await projectService.createProject(
      { name: "Single Version Project", description: "Only one version" },
      userAId
    );
    singleVersionProjectId = singleProj._id.toString();
    await projectService.createVersion(singleVersionProjectId, specV1, "v1.0.0 Initial", userAId);

    // Create multi-version project (v1, v2, v3)
    const multiProj = await projectService.createProject(
      { name: "Multi Version Evolution Project", description: "Full lifecycle tracking" },
      userAId
    );
    multiVersionProjectId = multiProj._id.toString();

    // Ensure sequential timestamps
    const createdV1 = await projectService.createVersion(multiVersionProjectId, specV1, "v1.0.0 Initial", userAId);
    v1Id = createdV1._id.toString();

    await new Promise((resolve) => setTimeout(resolve, 60));
    const createdV2 = await projectService.createVersion(multiVersionProjectId, specV2, "v1.1.0 Feature Additions", userAId);
    v2Id = createdV2._id.toString();

    await new Promise((resolve) => setTimeout(resolve, 60));
    const createdV3 = await projectService.createVersion(multiVersionProjectId, specV3, "v2.0.0 Breaking Redesign", userAId);
    v3Id = createdV3._id.toString();

    // Run governance on v1 and v2, but leave v3 WITHOUT a governance report
    await projectService.runAndSaveGovernance(multiVersionProjectId, v1Id, userAId);
    await projectService.runAndSaveGovernance(multiVersionProjectId, v2Id, userAId);
  });

  after(async () => {
    const userIds = [userAId, userBId];
    await Project.deleteMany({ owner: { $in: userIds } });
    await ApiVersion.deleteMany({ projectId: { $in: [singleVersionProjectId, multiVersionProjectId, emptyProjectId] } });
    await GovernanceReportModel.deleteMany({ projectId: { $in: [singleVersionProjectId, multiVersionProjectId, emptyProjectId] } });
    await User.deleteMany({ email: /@evolutiontest\.com$/ });
    await disconnectDB();
  });

  it("1. should handle single-version project with changesFromPrevious: null and 0 transitions", async () => {
    const report = await EvolutionService.getProjectEvolution(singleVersionProjectId, userAId);

    assert.equal(report.versions.length, 1);
    assert.equal(report.transitions.length, 0);
    assert.equal(report.versions[0].version, "1.0.0");
    assert.equal(report.versions[0].changesFromPrevious, null);
    assert.equal(report.summary.totalVersions, 1);
    assert.equal(report.summary.initialVersion, "1.0.0");
    assert.equal(report.summary.currentVersion, "1.0.0");
    assert.equal(report.summary.totalEndpointsGrowth, 0);
    assert.equal(report.summary.totalSchemasGrowth, 0);
    assert.equal(report.summary.totalBreakingChangesAcrossHistory, 0);
  });

  it("2. should generate pairwise transitions for multi-version project (N-1 transitions)", async () => {
    const report = await EvolutionService.getProjectEvolution(multiVersionProjectId, userAId);

    assert.equal(report.versions.length, 3);
    assert.equal(report.transitions.length, 2);
    assert.equal(report.summary.totalVersions, 3);
    assert.equal(report.summary.initialVersion, "1.0.0");
    assert.equal(report.summary.currentVersion, "2.0.0");
  });

  it("3. should preserve strict chronological ordering of versions", async () => {
    const report = await EvolutionService.getProjectEvolution(multiVersionProjectId, userAId);

    assert.equal(report.versions[0].version, "1.0.0");
    assert.equal(report.versions[1].version, "1.1.0");
    assert.equal(report.versions[2].version, "2.0.0");

    assert.equal(report.transitions[0].fromVersion, "1.0.0");
    assert.equal(report.transitions[0].toVersion, "1.1.0");
    assert.equal(report.transitions[1].fromVersion, "1.1.0");
    assert.equal(report.transitions[1].toVersion, "2.0.0");
  });

  it("4. should track endpoint growth correctly across transitions and total summary", async () => {
    const report = await EvolutionService.getProjectEvolution(multiVersionProjectId, userAId);

    assert.equal(report.versions[0].endpointCount, 1);
    assert.equal(report.versions[1].endpointCount, 2);
    assert.equal(report.versions[2].endpointCount, 1);

    assert.equal(report.transitions[0].metrics.endpointGrowth, 1);
    assert.equal(report.transitions[1].metrics.endpointGrowth, -1);
    assert.equal(report.summary.totalEndpointsGrowth, 0);
  });

  it("5. should track schema growth correctly across transitions and total summary", async () => {
    const report = await EvolutionService.getProjectEvolution(multiVersionProjectId, userAId);

    assert.equal(report.versions[0].schemaCount, 1);
    assert.equal(report.versions[1].schemaCount, 2);
    assert.equal(report.versions[2].schemaCount, 1);

    assert.equal(report.transitions[0].metrics.schemaGrowth, 1);
    assert.equal(report.transitions[1].metrics.schemaGrowth, -1);
    assert.equal(report.summary.totalSchemasGrowth, 0);
  });

  it("6. should detect and track breaking changes across transitions", async () => {
    const report = await EvolutionService.getProjectEvolution(multiVersionProjectId, userAId);

    assert.equal(report.transitions[0].metrics.breakingChangesCount, 0);
    assert.equal(report.transitions[0].summary.breaking.length, 0);

    assert.ok(report.transitions[1].metrics.breakingChangesCount > 0);
    assert.ok(report.transitions[1].summary.breaking.length > 0);
    assert.ok(
      report.transitions[1].summary.breaking.some((c) => c.category === "endpoint" && c.changeType === "removed")
    );

    assert.equal(
      report.summary.totalBreakingChangesAcrossHistory,
      report.transitions[0].metrics.breakingChangesCount + report.transitions[1].metrics.breakingChangesCount
    );
  });

  it("7. should record non-breaking additions in transition summary", async () => {
    const report = await EvolutionService.getProjectEvolution(multiVersionProjectId, userAId);

    const trans0 = report.transitions[0];
    assert.ok(trans0.summary.added.endpoints.some((e) => e.includes("/items/{id}")));
    assert.ok(trans0.summary.added.schemas.some((s) => s.includes("ItemDetail")));
  });

  it("8. should compute governance score delta when both versions have governance reports", async () => {
    const report = await EvolutionService.getProjectEvolution(multiVersionProjectId, userAId);

    const v1Item = report.versions[0];
    const v2Item = report.versions[1];
    assert.notEqual(v1Item.governanceScore, null);
    assert.notEqual(v2Item.governanceScore, null);

    const trans0 = report.transitions[0];
    assert.equal(trans0.metrics.governanceScoreBefore, v1Item.governanceScore);
    assert.equal(trans0.metrics.governanceScoreAfter, v2Item.governanceScore);
    assert.equal(
      trans0.metrics.governanceScoreDelta,
      (v2Item.governanceScore as number) - (v1Item.governanceScore as number)
    );
  });

  it("9. should preserve null governance score and delta when a version lacks a governance report", async () => {
    const report = await EvolutionService.getProjectEvolution(multiVersionProjectId, userAId);

    const v3Item = report.versions[2];
    assert.equal(v3Item.governanceScore, null);
    assert.equal(v3Item.governanceReportId, null);

    const trans1 = report.transitions[1];
    assert.equal(trans1.metrics.governanceScoreAfter, null);
    assert.equal(trans1.metrics.governanceScoreDelta, null);
  });

  it("10. should reject access to project evolution for non-owner (403 FORBIDDEN)", async () => {
    await assert.rejects(
      async () => {
        await EvolutionService.getProjectEvolution(multiVersionProjectId, userBId);
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "FORBIDDEN");
        return true;
      }
    );
  });

  it("11. should handle empty project with 0 versions and zero summary gracefully", async () => {
    const report = await EvolutionService.getProjectEvolution(emptyProjectId, userAId);

    assert.equal(report.versions.length, 0);
    assert.equal(report.transitions.length, 0);
    assert.equal(report.summary.totalVersions, 0);
    assert.equal(report.summary.initialVersion, null);
    assert.equal(report.summary.currentVersion, null);
    assert.equal(report.summary.totalEndpointsGrowth, 0);
    assert.equal(report.summary.totalSchemasGrowth, 0);
    assert.equal(report.summary.totalBreakingChangesAcrossHistory, 0);
  });

  it("12. should reject non-existent or invalid project ID (404 PROJECT_NOT_FOUND)", async () => {
    const nonExistentId = new Types.ObjectId().toString();
    await assert.rejects(
      async () => {
        await EvolutionService.getProjectEvolution(nonExistentId, userAId);
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, "PROJECT_NOT_FOUND");
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await EvolutionService.getProjectEvolution("invalid-object-id-123", userAId);
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, "PROJECT_NOT_FOUND");
        return true;
      }
    );
  });
});
