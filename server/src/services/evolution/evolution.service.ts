import { Types } from "mongoose";
import { Project } from "../../models/Project";
import { ApiVersion, IApiVersion } from "../../models/ApiVersion";
import { GovernanceReportModel } from "../../models/GovernanceReport";
import { diffEngine } from "../diff/diff.engine";
import { ApiError } from "../../utils/api-error";
import {
  ProjectEvolutionReport,
  EvolutionVersionItem,
  EvolutionTransition,
  EvolutionChangeGroup,
  EvolutionModifiedGroup,
} from "./evolution.types";

export class EvolutionService {
  /**
   * Generates a complete chronological API Evolution and Decision Timeline for a project.
   * Compares each sequential version against its predecessor using the deterministic DiffEngine.
   */
  public static async getProjectEvolution(
    projectId: string,
    userId: string
  ): Promise<ProjectEvolutionReport> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found");
    }

    // 1. Verify project exists and check ownership
    const project = await Project.findById(projectId);
    if (!project) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found");
    }

    if (project.owner.toString() !== userId) {
      throw new ApiError(403, "FORBIDDEN", "You do not have access to this project");
    }

    // 2. Load all ApiVersions ordered chronologically
    const versions: IApiVersion[] = await ApiVersion.find({ projectId })
      .sort({ createdAt: 1, _id: 1 })
      .exec();

    // If project has no versions yet
    if (versions.length === 0) {
      return {
        project: {
          id: project._id.toString(),
          name: project.name,
          description: project.description,
        },
        versions: [],
        transitions: [],
        summary: {
          totalVersions: 0,
          initialVersion: null,
          currentVersion: null,
          totalEndpointsGrowth: 0,
          totalSchemasGrowth: 0,
          totalBreakingChangesAcrossHistory: 0,
        },
      };
    }

    // 3. Load latest saved governance reports for these versions (do not invent scores)
    const versionIds = versions.map((v) => v._id);
    const govReports = await GovernanceReportModel.find({
      apiVersionId: { $in: versionIds },
    })
      .sort({ createdAt: -1 })
      .exec();

    const govMap = new Map<string, { score: number; reportId: string }>();
    for (const rep of govReports) {
      const vId = rep.apiVersionId.toString();
      if (!govMap.has(vId)) {
        govMap.set(vId, { score: rep.score, reportId: rep._id.toString() });
      }
    }

    // 4. Build version items
    const versionItems: EvolutionVersionItem[] = versions.map((v) => {
      const govInfo = govMap.get(v._id.toString());
      return {
        id: v._id.toString(),
        name: v.name,
        version: v.version,
        openApiVersion: v.openApiVersion,
        specType: v.specType,
        createdAt: v.createdAt ? v.createdAt.toISOString() : new Date().toISOString(),
        endpointCount: v.endpointsCount ?? v.canonicalModel?.endpoints?.length ?? 0,
        schemaCount: v.schemasCount ?? v.canonicalModel?.schemas?.length ?? 0,
        securitySchemeCount: v.canonicalModel?.securitySchemes?.length ?? 0,
        governanceScore: govInfo ? govInfo.score : null,
        governanceReportId: govInfo ? govInfo.reportId : null,
        changesFromPrevious: null,
      };
    });

    // 5. Compare sequential versions using existing DiffEngine
    const transitions: EvolutionTransition[] = [];

    for (let i = 1; i < versions.length; i++) {
      const prevVersion = versions[i - 1];
      const currVersion = versions[i];
      const prevItem = versionItems[i - 1];
      const currItem = versionItems[i];

      // Execute diff using existing single-source DiffEngine
      const diffReport = diffEngine.compare(
        prevVersion.canonicalModel,
        currVersion.canonicalModel
      );

      // Record summary deltas on version item
      currItem.changesFromPrevious = {
        breaking: diffReport.summary.breakingCount,
        nonBreaking: diffReport.summary.nonBreakingCount,
        info: diffReport.summary.infoCount,
      };

      // Calculate growth metrics
      const endpointGrowth = currItem.endpointCount - prevItem.endpointCount;
      const schemaGrowth = currItem.schemaCount - prevItem.schemaCount;
      const securityGrowth = currItem.securitySchemeCount - prevItem.securitySchemeCount;

      const govBefore = prevItem.governanceScore;
      const govAfter = currItem.governanceScore;
      const governanceScoreDelta =
        govBefore !== null && govAfter !== null ? govAfter - govBefore : null;

      // Group categorized changes from diffReport.changes
      const added: EvolutionChangeGroup = {
        endpoints: diffReport.changes
          .filter((c) => c.category === "endpoint" && c.changeType === "added")
          .map((c) => c.path),
        schemas: diffReport.changes
          .filter((c) => c.category === "schema" && c.changeType === "added")
          .map((c) => c.path),
        parameters: diffReport.changes
          .filter((c) => c.category === "parameter" && c.changeType === "added")
          .map((c) => c.path),
        securitySchemes: diffReport.changes
          .filter((c) => c.category === "security" && c.changeType === "added")
          .map((c) => c.path),
      };

      const removed: EvolutionChangeGroup = {
        endpoints: diffReport.changes
          .filter((c) => c.category === "endpoint" && c.changeType === "removed")
          .map((c) => c.path),
        schemas: diffReport.changes
          .filter((c) => c.category === "schema" && c.changeType === "removed")
          .map((c) => c.path),
        parameters: diffReport.changes
          .filter((c) => c.category === "parameter" && c.changeType === "removed")
          .map((c) => c.path),
        securitySchemes: diffReport.changes
          .filter((c) => c.category === "security" && c.changeType === "removed")
          .map((c) => c.path),
      };

      const modified: EvolutionModifiedGroup = {
        endpoints: diffReport.changes
          .filter(
            (c) =>
              (c.category === "endpoint" ||
                c.category === "parameter" ||
                c.category === "response") &&
              c.changeType === "modified"
          )
          .map((c) => c.path),
        schemas: diffReport.changes
          .filter((c) => c.category === "schema" && c.changeType === "modified")
          .map((c) => c.path),
        securitySchemes: diffReport.changes
          .filter((c) => c.category === "security" && c.changeType === "modified")
          .map((c) => c.path),
      };

      const breaking = diffReport.changes.filter((c) => c.severity === "breaking");

      transitions.push({
        fromVersionId: prevVersion._id.toString(),
        fromVersion: prevVersion.version,
        toVersionId: currVersion._id.toString(),
        toVersion: currVersion.version,
        metrics: {
          endpointGrowth,
          schemaGrowth,
          securityGrowth,
          breakingChangesCount: diffReport.summary.breakingCount,
          nonBreakingChangesCount: diffReport.summary.nonBreakingCount,
          infoChangesCount: diffReport.summary.infoCount,
          governanceScoreBefore: govBefore,
          governanceScoreAfter: govAfter,
          governanceScoreDelta,
        },
        summary: {
          added,
          removed,
          modified,
          breaking,
        },
        diffReport,
      });
    }

    // 6. Overall project evolution summary
    const initialItem = versionItems[0];
    const latestItem = versionItems[versionItems.length - 1];

    const totalEndpointsGrowth = latestItem.endpointCount - initialItem.endpointCount;
    const totalSchemasGrowth = latestItem.schemaCount - initialItem.schemaCount;
    const totalBreakingChangesAcrossHistory = transitions.reduce(
      (sum, t) => sum + t.metrics.breakingChangesCount,
      0
    );

    return {
      project: {
        id: project._id.toString(),
        name: project.name,
        description: project.description,
      },
      versions: versionItems,
      transitions,
      summary: {
        totalVersions: versions.length,
        initialVersion: initialItem.version,
        currentVersion: latestItem.version,
        totalEndpointsGrowth,
        totalSchemasGrowth,
        totalBreakingChangesAcrossHistory,
      },
    };
  }
}
