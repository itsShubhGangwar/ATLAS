import mongoose, { Types } from "mongoose";
import { Project, IProject } from "../../models/Project";
import { ApiVersion, IApiVersion } from "../../models/ApiVersion";
import { GovernanceReportModel, IGovernanceReportModel } from "../../models/GovernanceReport";
import { DiffReportModel, IDiffReportModel } from "../../models/DiffReport";
import { openApiParser } from "../parser";
import { governanceEngine } from "../governance";
import { diffEngine } from "../diff";
import { ApiError } from "../../utils/api-error";

export interface CreateProjectDTO {
  name: string;
  description?: string;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
}

export interface DashboardMetrics {
  projectsCount: number;
  versionsCount: number;
  endpointsCount: number;
  schemasCount: number;
  recentGovernanceScore: number | null;
  recentActivity: Array<{
    id: string;
    type: "version_uploaded" | "governance_run" | "diff_generated";
    title: string;
    description: string;
    timestamp: Date;
    projectId: string;
    projectName: string;
  }>;
}

export class ProjectService {
  /**
   * Helper to verify project existence and user ownership
   */
  public async getVerifiedProject(projectId: string, userId: string): Promise<IProject> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid project identifier.");
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    }

    if (!project.owner.equals(new Types.ObjectId(userId))) {
      throw new ApiError(403, "FORBIDDEN", "You do not have permission to access this project.");
    }

    return project;
  }

  /**
   * Helper to verify version existence and project association
   */
  public async getVerifiedVersion(
    projectId: string,
    versionId: string,
    userId: string
  ): Promise<{ project: IProject; version: IApiVersion }> {
    const project = await this.getVerifiedProject(projectId, userId);

    if (!mongoose.Types.ObjectId.isValid(versionId)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid version identifier.");
    }

    const version = await ApiVersion.findById(versionId);
    if (!version || !version.projectId.equals(project._id)) {
      throw new ApiError(404, "VERSION_NOT_FOUND", "API version not found in this project.");
    }

    return { project, version };
  }

  // --- Project CRUD ---

  public async createProject(dto: CreateProjectDTO, userId: string): Promise<IProject> {
    const { name, description } = dto;

    if (!name || name.trim().length === 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "Project name is required.");
    }

    if (name.trim().length > 100) {
      throw new ApiError(400, "VALIDATION_ERROR", "Project name cannot exceed 100 characters.");
    }

    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      owner: new Types.ObjectId(userId),
    });

    return project;
  }

  public async listProjects(userId: string): Promise<any[]> {
    const userObjectId = new Types.ObjectId(userId);
    const projects = await Project.find({ owner: userObjectId }).sort({ updatedAt: -1 });

    // Aggregate version counts and latest version per project
    const projectIds = projects.map((p) => p._id);
    const versions = await ApiVersion.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 });

    const versionsByProject = new Map<string, IApiVersion[]>();
    for (const v of versions) {
      const pid = v.projectId.toString();
      if (!versionsByProject.has(pid)) {
        versionsByProject.set(pid, []);
      }
      versionsByProject.get(pid)!.push(v);
    }

    return projects.map((p) => {
      const pVersions = versionsByProject.get(p._id.toString()) || [];
      const latest = pVersions[0];
      return {
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        owner: p.owner.toString(),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        versionsCount: pVersions.length,
        latestVersion: latest
          ? {
              id: latest._id.toString(),
              version: latest.version,
              openApiVersion: latest.openApiVersion,
              specType: latest.specType,
              endpointsCount: latest.endpointsCount,
              schemasCount: latest.schemasCount,
              createdAt: latest.createdAt,
            }
          : null,
      };
    });
  }

  public async getProjectById(projectId: string, userId: string): Promise<IProject> {
    return this.getVerifiedProject(projectId, userId);
  }

  public async updateProject(
    projectId: string,
    dto: UpdateProjectDTO,
    userId: string
  ): Promise<IProject> {
    const project = await this.getVerifiedProject(projectId, userId);

    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "Project name cannot be empty.");
      }
      if (dto.name.trim().length > 100) {
        throw new ApiError(400, "VALIDATION_ERROR", "Project name cannot exceed 100 characters.");
      }
      project.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      project.description = dto.description.trim();
    }

    await project.save();
    return project;
  }

  public async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = await this.getVerifiedProject(projectId, userId);

    // Cascade delete project dependencies
    await ApiVersion.deleteMany({ projectId: project._id });
    await GovernanceReportModel.deleteMany({ projectId: project._id });
    await DiffReportModel.deleteMany({ projectId: project._id });
    await project.deleteOne();
  }

  // --- API Version CRUD ---

  public async createVersion(
    projectId: string,
    specContent: string,
    customName: string | undefined,
    userId: string
  ): Promise<IApiVersion> {
    const project = await this.getVerifiedProject(projectId, userId);

    if (!specContent || !specContent.trim()) {
      throw new ApiError(400, "INVALID_SPEC", "Specification content is empty or missing.");
    }

    // Parse via existing Phase 2 OpenAPI parser
    const parseResult = await openApiParser.parse(specContent);
    if (!parseResult.success) {
      throw new ApiError(400, "INVALID_SPEC", parseResult.error || "Failed to parse specification.", parseResult.details);
    }

    const canonicalModel = parseResult.data;
    const versionStr = canonicalModel.metadata?.version || "1.0.0";
    const openApiVer = canonicalModel.metadata?.openApiVersion || "3.0.0";
    const specType = canonicalModel.metadata?.specType || "openapi";

    const apiVersion = await ApiVersion.create({
      projectId: project._id,
      name: customName?.trim() || canonicalModel.metadata?.title || `v${versionStr}`,
      version: versionStr,
      openApiVersion: openApiVer,
      specType,
      originalSpec: specContent,
      canonicalModel,
      endpointsCount: canonicalModel.endpoints?.length || 0,
      schemasCount: canonicalModel.schemas?.length || 0,
    });

    // Touch project updatedAt
    project.updatedAt = new Date();
    await project.save();

    return apiVersion;
  }

  public async listVersions(projectId: string, userId: string): Promise<any[]> {
    const project = await this.getVerifiedProject(projectId, userId);
    const versions = await ApiVersion.find({ projectId: project._id })
      .select("-originalSpec -canonicalModel")
      .sort({ createdAt: -1 });

    return versions.map((v) => ({
      id: v._id.toString(),
      projectId: v.projectId.toString(),
      name: v.name,
      version: v.version,
      openApiVersion: v.openApiVersion,
      specType: v.specType,
      endpointsCount: v.endpointsCount,
      schemasCount: v.schemasCount,
      createdAt: v.createdAt,
    }));
  }

  public async getVersionById(
    projectId: string,
    versionId: string,
    userId: string
  ): Promise<IApiVersion> {
    const { version } = await this.getVerifiedVersion(projectId, versionId, userId);
    return version;
  }

  public async deleteVersion(
    projectId: string,
    versionId: string,
    userId: string
  ): Promise<void> {
    const { version } = await this.getVerifiedVersion(projectId, versionId, userId);
    await GovernanceReportModel.deleteMany({ apiVersionId: version._id });
    await DiffReportModel.deleteMany({
      $or: [{ baseVersionId: version._id }, { newVersionId: version._id }],
    });
    await version.deleteOne();
  }

  // --- Saved Governance ---

  public async runAndSaveGovernance(
    projectId: string,
    versionId: string,
    userId: string
  ): Promise<IGovernanceReportModel> {
    const { project, version } = await this.getVerifiedVersion(projectId, versionId, userId);

    // Run deterministic governance engine on persisted canonicalModel (Zero reparsing)
    const report = governanceEngine.analyze(version.canonicalModel);

    // Persist report
    const saved = await GovernanceReportModel.create({
      projectId: project._id,
      apiVersionId: version._id,
      score: report.score,
      findings: report.findings,
      summary: report.summary,
      rulesRun: report.rulesRun,
    });

    return saved;
  }

  public async getLatestGovernance(
    projectId: string,
    versionId: string,
    userId: string
  ): Promise<IGovernanceReportModel | null> {
    const { version } = await this.getVerifiedVersion(projectId, versionId, userId);
    const report = await GovernanceReportModel.findOne({ apiVersionId: version._id }).sort({
      createdAt: -1,
    });
    return report;
  }

  // --- Saved Diff ---

  public async compareAndSaveDiff(
    projectId: string,
    baseVersionId: string,
    newVersionId: string,
    userId: string
  ): Promise<any> {
    const project = await this.getVerifiedProject(projectId, userId);

    if (!mongoose.Types.ObjectId.isValid(baseVersionId) || !mongoose.Types.ObjectId.isValid(newVersionId)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid base or new version identifier.");
    }

    const baseVersion = await ApiVersion.findById(baseVersionId);
    const newVersion = await ApiVersion.findById(newVersionId);

    if (!baseVersion || !baseVersion.projectId.equals(project._id)) {
      throw new ApiError(404, "VERSION_NOT_FOUND", "Base version not found in this project.");
    }

    if (!newVersion || !newVersion.projectId.equals(project._id)) {
      throw new ApiError(404, "VERSION_NOT_FOUND", "New version not found in this project.");
    }

    // Run existing Diff Engine on both canonical models (Zero reparsing)
    const diffReport = diffEngine.compare(baseVersion.canonicalModel, newVersion.canonicalModel);

    // Persist diff report
    const saved = await DiffReportModel.create({
      projectId: project._id,
      baseVersionId: baseVersion._id,
      newVersionId: newVersion._id,
      summary: diffReport.summary,
      changes: diffReport.changes,
    });

    return {
      _id: saved._id,
      id: saved._id.toString(),
      projectId: saved.projectId.toString(),
      baseVersionId: saved.baseVersionId.toString(),
      baseVersion: diffReport.baseVersion,
      newVersionId: saved.newVersionId.toString(),
      newVersion: diffReport.newVersion,
      baseTitle: diffReport.baseTitle,
      newTitle: diffReport.newTitle,
      summary: saved.summary,
      changes: saved.changes,
      createdAt: saved.createdAt,
    };
  }

  public async listDiffReports(projectId: string, userId: string): Promise<any[]> {
    const project = await this.getVerifiedProject(projectId, userId);
    const reports = await DiffReportModel.find({ projectId: project._id })
      .populate("baseVersionId", "version name")
      .populate("newVersionId", "version name")
      .sort({ createdAt: -1 })
      .limit(20);

    return reports.map((r: any) => ({
      id: r._id.toString(),
      projectId: r.projectId.toString(),
      baseVersionId: r.baseVersionId?._id?.toString() || r.baseVersionId?.toString(),
      baseVersion: r.baseVersionId?.version || "unknown",
      newVersionId: r.newVersionId?._id?.toString() || r.newVersionId?.toString(),
      newVersion: r.newVersionId?.version || "unknown",
      summary: r.summary,
      changes: r.changes,
      createdAt: r.createdAt,
    }));
  }

  // --- Dashboard Metrics ---

  public async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    const userObjectId = new Types.ObjectId(userId);
    const projects = await Project.find({ owner: userObjectId });
    const projectIds = projects.map((p) => p._id);

    const versions = await ApiVersion.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 });

    // Latest version per project for distinct endpoints and schemas tally
    const latestVersionsMap = new Map<string, IApiVersion>();
    for (const v of versions) {
      const pid = v.projectId.toString();
      if (!latestVersionsMap.has(pid)) {
        latestVersionsMap.set(pid, v);
      }
    }

    let endpointsCount = 0;
    let schemasCount = 0;
    for (const v of latestVersionsMap.values()) {
      endpointsCount += v.endpointsCount || 0;
      schemasCount += v.schemasCount || 0;
    }

    // Recent governance reports
    const recentGov = await GovernanceReportModel.findOne({ projectId: { $in: projectIds } }).sort({
      createdAt: -1,
    });

    // Recent activity list
    const projectMap = new Map(projects.map((p) => [p._id.toString(), p.name]));
    const activities: DashboardMetrics["recentActivity"] = [];

    // Recent 5 versions
    for (const v of versions.slice(0, 5)) {
      activities.push({
        id: `version-${v._id}`,
        type: "version_uploaded",
        title: `API Version ${v.version} Uploaded`,
        description: `${v.name || v.version} (${v.endpointsCount} endpoints, ${v.schemasCount} schemas)`,
        timestamp: v.createdAt,
        projectId: v.projectId.toString(),
        projectName: projectMap.get(v.projectId.toString()) || "Project",
      });
    }

    // Recent 3 governance reports
    const govReports = await GovernanceReportModel.find({ projectId: { $in: projectIds } })
      .sort({ createdAt: -1 })
      .limit(3);
    for (const g of govReports) {
      activities.push({
        id: `gov-${g._id}`,
        type: "governance_run",
        title: `Governance Audit Completed (Score: ${g.score})`,
        description: `Score: ${g.score}/100 with ${g.findings?.length || 0} findings`,
        timestamp: g.createdAt,
        projectId: g.projectId.toString(),
        projectName: projectMap.get(g.projectId.toString()) || "Project",
      });
    }

    // Recent 3 diff reports
    const diffReports = await DiffReportModel.find({ projectId: { $in: projectIds } })
      .populate("baseVersionId", "version")
      .populate("newVersionId", "version")
      .sort({ createdAt: -1 })
      .limit(3);
    for (const d of diffReports as any[]) {
      activities.push({
        id: `diff-${d._id}`,
        type: "diff_generated",
        title: `API Version Comparison Generated`,
        description: `${d.baseVersionId?.version || "v1"} vs ${d.newVersionId?.version || "v2"} (${d.summary?.totalChanges || 0} changes, ${d.summary?.breakingCount || 0} breaking)`,
        timestamp: d.createdAt,
        projectId: d.projectId.toString(),
        projectName: projectMap.get(d.projectId.toString()) || "Project",
      });
    }

    // Sort combined activities by timestamp desc
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      projectsCount: projects.length,
      versionsCount: versions.length,
      endpointsCount,
      schemasCount,
      recentGovernanceScore: recentGov ? recentGov.score : null,
      recentActivity: activities.slice(0, 8),
    };
  }
}

export const projectService = new ProjectService();
