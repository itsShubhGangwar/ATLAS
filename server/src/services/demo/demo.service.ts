import { openApiParser } from "../parser/openapi.parser";
import { GraphBuilder } from "../graph/graph.builder";
import { governanceEngine } from "../governance/governance.engine";
import { diffEngine } from "../diff/diff.engine";
import { CanonicalApiModel } from "../parser/canonical-model";
import { GraphModel } from "../graph/graph.types";
import { GovernanceReport } from "../governance/governance.types";
import { DiffReport } from "../diff/diff.types";
import { ProjectEvolutionReport } from "../evolution/evolution.types";
import { ATLAS_WORKFLOW_V1_0_YAML } from "./fixtures/atlas-dense-workflow-api";
import {
  ATLAS_WORKFLOW_V0_8_SPEC,
  ATLAS_WORKFLOW_V0_9_SPEC,
  ATLAS_WORKFLOW_V0_9_5_SPEC,
} from "./fixtures/historical-specs";

export class DemoService {
  private static cachedData: {
    project: any;
    version: any;
    canonicalModel: CanonicalApiModel;
    graph: GraphModel;
    governance: GovernanceReport;
    evolution: ProjectEvolutionReport;
    baseV1Model: CanonicalApiModel;
  } | null = null;

  public static async getWorkflowDemo(): Promise<any> {
    if (this.cachedData) {
      return this.cachedData;
    }

    // Parse v1.0.0 (current dense workflow specification)
    const parsedCurrent = await openApiParser.parse(ATLAS_WORKFLOW_V1_0_YAML);
    if (!parsedCurrent.success) {
      throw new Error(`Failed to parse demo v1.0.0: ${parsedCurrent.error}`);
    }
    const canonicalModel = parsedCurrent.data;

    // Build real graph using existing GraphBuilder
    const graph = GraphBuilder.build(canonicalModel);

    // Run real governance using existing governanceEngine
    const governance = governanceEngine.analyze(canonicalModel);

    // Parse previous versions for Diff and Evolution without any mock data
    const parsedV0_8 = await openApiParser.parse(ATLAS_WORKFLOW_V0_8_SPEC);
    const parsedV0_9 = await openApiParser.parse(ATLAS_WORKFLOW_V0_9_SPEC);
    const parsedV0_9_5 = await openApiParser.parse(ATLAS_WORKFLOW_V0_9_5_SPEC);

    if (!parsedV0_8.success || !parsedV0_9.success || !parsedV0_9_5.success) {
      throw new Error("Failed to parse historical demo specifications");
    }

    const m0_8 = parsedV0_8.data;
    const m0_9 = parsedV0_9.data;
    const m0_9_5 = parsedV0_9_5.data;
    const m1_0 = canonicalModel;

    // Diff sequential versions using existing diffEngine
    const diff1 = diffEngine.compare(m0_8, m0_9);
    const diff2 = diffEngine.compare(m0_9, m0_9_5);
    const diff3 = diffEngine.compare(m0_9_5, m1_0);

    const gov0_8 = governanceEngine.analyze(m0_8);
    const gov0_9 = governanceEngine.analyze(m0_9);
    const gov0_9_5 = governanceEngine.analyze(m0_9_5);
    const gov1_0 = governance;

    const evolutionVersions = [
      {
        id: "demo-v0.8.0",
        name: "Core Auth & Identity Launch",
        version: "0.8.0",
        openApiVersion: "3.0.3",
        specType: "openapi" as const,
        createdAt: "2026-01-15T10:00:00.000Z",
        endpointCount: m0_8.endpoints.length,
        schemaCount: m0_8.schemas.length,
        securitySchemeCount: m0_8.securitySchemes.length,
        governanceScore: gov0_8.score,
        governanceReportId: "gov-demo-08",
        changesFromPrevious: null,
      },
      {
        id: "demo-v0.9.0",
        name: "Teams & Projects Expansion",
        version: "0.9.0",
        openApiVersion: "3.0.3",
        specType: "openapi" as const,
        createdAt: "2026-04-10T14:30:00.000Z",
        endpointCount: m0_9.endpoints.length,
        schemaCount: m0_9.schemas.length,
        securitySchemeCount: m0_9.securitySchemes.length,
        governanceScore: gov0_9.score,
        governanceReportId: "gov-demo-09",
        changesFromPrevious: {
          breaking: diff1.summary.breakingCount,
          nonBreaking: diff1.summary.nonBreakingCount,
          info: diff1.summary.infoCount,
        },
      },
      {
        id: "demo-v0.9.5",
        name: "Tasks & Assignment Workflows",
        version: "0.9.5",
        openApiVersion: "3.0.3",
        specType: "openapi" as const,
        createdAt: "2026-07-22T09:15:00.000Z",
        endpointCount: m0_9_5.endpoints.length,
        schemaCount: m0_9_5.schemas.length,
        securitySchemeCount: m0_9_5.securitySchemes.length,
        governanceScore: gov0_9_5.score,
        governanceReportId: "gov-demo-095",
        changesFromPrevious: {
          breaking: diff2.summary.breakingCount,
          nonBreaking: diff2.summary.nonBreakingCount,
          info: diff2.summary.infoCount,
        },
      },
      {
        id: "demo-v1.0.0",
        name: "Dense Platform & Collaboration Release",
        version: "1.0.0",
        openApiVersion: "3.0.3",
        specType: "openapi" as const,
        createdAt: "2026-09-18T16:45:00.000Z",
        endpointCount: m1_0.endpoints.length,
        schemaCount: m1_0.schemas.length,
        securitySchemeCount: m1_0.securitySchemes.length,
        governanceScore: gov1_0.score,
        governanceReportId: "gov-demo-100",
        changesFromPrevious: {
          breaking: diff3.summary.breakingCount,
          nonBreaking: diff3.summary.nonBreakingCount,
          info: diff3.summary.infoCount,
        },
      },
    ];

    const buildTransition = (
      fromId: string,
      fromV: string,
      toId: string,
      toV: string,
      mFrom: CanonicalApiModel,
      mTo: CanonicalApiModel,
      diff: DiffReport,
      gFrom: number,
      gTo: number
    ) => ({
      fromVersionId: fromId,
      fromVersion: fromV,
      toVersionId: toId,
      toVersion: toV,
      metrics: {
        endpointGrowth: mTo.endpoints.length - mFrom.endpoints.length,
        schemaGrowth: mTo.schemas.length - mFrom.schemas.length,
        securityGrowth: mTo.securitySchemes.length - mFrom.securitySchemes.length,
        breakingChangesCount: diff.summary.breakingCount,
        nonBreakingChangesCount: diff.summary.nonBreakingCount,
        infoChangesCount: diff.summary.infoCount,
        governanceScoreBefore: gFrom,
        governanceScoreAfter: gTo,
        governanceScoreDelta: gTo - gFrom,
      },
      summary: {
        added: {
          endpoints: diff.changes
            .filter((c) => c.category === "endpoint" && c.changeType === "added")
            .map((c) => c.path),
          schemas: diff.changes
            .filter((c) => c.category === "schema" && c.changeType === "added")
            .map((c) => c.path),
          parameters: diff.changes
            .filter((c) => c.category === "parameter" && c.changeType === "added")
            .map((c) => c.path),
          securitySchemes: diff.changes
            .filter((c) => c.category === "security" && c.changeType === "added")
            .map((c) => c.path),
        },
        removed: {
          endpoints: diff.changes
            .filter((c) => c.category === "endpoint" && c.changeType === "removed")
            .map((c) => c.path),
          schemas: diff.changes
            .filter((c) => c.category === "schema" && c.changeType === "removed")
            .map((c) => c.path),
          parameters: diff.changes
            .filter((c) => c.category === "parameter" && c.changeType === "removed")
            .map((c) => c.path),
          securitySchemes: diff.changes
            .filter((c) => c.category === "security" && c.changeType === "removed")
            .map((c) => c.path),
        },
        modified: {
          endpoints: diff.changes
            .filter((c) => c.category === "endpoint" && c.changeType === "modified")
            .map((c) => c.path),
          schemas: diff.changes
            .filter((c) => c.category === "schema" && c.changeType === "modified")
            .map((c) => c.path),
          securitySchemes: diff.changes
            .filter((c) => c.category === "security" && c.changeType === "modified")
            .map((c) => c.path),
        },
        breaking: diff.changes.filter((c) => c.severity === "breaking"),
      },
      diffReport: diff,
    });

    const transitions = [
      buildTransition("demo-v0.8.0", "0.8.0", "demo-v0.9.0", "0.9.0", m0_8, m0_9, diff1, gov0_8.score, gov0_9.score),
      buildTransition("demo-v0.9.0", "0.9.0", "demo-v0.9.5", "0.9.5", m0_9, m0_9_5, diff2, gov0_9.score, gov0_9_5.score),
      buildTransition("demo-v0.9.5", "0.9.5", "demo-v1.0.0", "1.0.0", m0_9_5, m1_0, diff3, gov0_9_5.score, gov1_0.score),
    ];

    const evolution: ProjectEvolutionReport = {
      project: {
        id: "demo-atlas-workflow",
        name: "Atlas Workflow API",
        description: "Dense API topology demonstration",
      },
      versions: evolutionVersions,
      transitions,
      summary: {
        totalVersions: evolutionVersions.length,
        initialVersion: "0.8.0",
        currentVersion: "1.0.0",
        totalEndpointsGrowth: m1_0.endpoints.length - m0_8.endpoints.length,
        totalSchemasGrowth: m1_0.schemas.length - m0_8.schemas.length,
        totalBreakingChangesAcrossHistory: transitions.reduce(
          (acc, t) => acc + t.metrics.breakingChangesCount,
          0
        ),
      },
    };

    this.cachedData = {
      project: {
        id: "demo-atlas-workflow",
        name: "Atlas Workflow API",
        description: "Dense API topology demonstration",
        versionsCount: 4,
        latestVersion: {
          id: "demo-v1.0.0",
          version: "1.0.0",
          openApiVersion: "3.0.3",
          specType: "openapi",
          endpointsCount: canonicalModel.endpoints.length,
          schemasCount: canonicalModel.schemas.length,
          createdAt: "2026-09-18T16:45:00.000Z",
        },
      },
      version: {
        id: "demo-v1.0.0",
        projectId: "demo-atlas-workflow",
        name: "Dense Platform & Collaboration Release",
        version: "1.0.0",
        openApiVersion: "3.0.3",
        specType: "openapi",
        endpointsCount: canonicalModel.endpoints.length,
        schemasCount: canonicalModel.schemas.length,
        createdAt: "2026-09-18T16:45:00.000Z",
        originalSpec: ATLAS_WORKFLOW_V1_0_YAML,
        canonicalModel,
      },
      canonicalModel,
      graph,
      governance,
      evolution,
      baseV1Model: m0_9_5,
    };

    return this.cachedData;
  }

  // Alias for backward compatibility
  public static async getCommerceHubDemo(): Promise<any> {
    return this.getWorkflowDemo();
  }
}
