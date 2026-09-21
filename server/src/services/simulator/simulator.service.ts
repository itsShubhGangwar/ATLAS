import { CanonicalApiModel } from "../parser/canonical-model";
import { DiffEngine } from "../diff/diff.engine";
import { GovernanceEngine } from "../governance/governance.engine";
import { GraphBuilder } from "../graph/graph.builder";
import { blastRadiusService } from "../blast-radius/blastRadius.service";
import { BlastRadiusTarget } from "../blast-radius/blastRadius.types";
import { SimulatorEngine } from "./simulator.engine";
import {
  WhatIfChange,
  SimulationResult,
  SimulationSummary,
  GovernanceDelta,
} from "./simulator.types";
import { GovernanceFinding } from "../governance/governance.types";

export class SimulatorService {
  private diffEngine = new DiffEngine();
  private governanceEngine = new GovernanceEngine();

  /**
   * Runs a complete What-If simulation against an API model without mutating the original.
   */
  public simulate(
    originalModel: CanonicalApiModel,
    change: WhatIfChange,
    originalVersionLabel: string = "Current Specification"
  ): SimulationResult {
    // 1. Apply hypothetical change on isolated clone
    const simulatedModel = SimulatorEngine.applyChange(originalModel, change);

    // 2. Run Diff Engine (Original vs Simulated)
    const diff = this.diffEngine.compare(originalModel, simulatedModel);

    // 3. Run Governance Engine (Before vs After)
    const beforeReport = this.governanceEngine.analyze(originalModel);
    const afterReport = this.governanceEngine.analyze(simulatedModel);

    // Compute Governance Findings Delta
    const beforeKeySet = new Set(
      beforeReport.findings.map((f) => `${f.ruleId}:${f.targetType}:${f.targetId}`)
    );
    const afterKeySet = new Set(
      afterReport.findings.map((f) => `${f.ruleId}:${f.targetType}:${f.targetId}`)
    );

    const newFindings = afterReport.findings.filter(
      (f) => !beforeKeySet.has(`${f.ruleId}:${f.targetType}:${f.targetId}`)
    );
    const resolvedFindings = beforeReport.findings.filter(
      (f) => !afterKeySet.has(`${f.ruleId}:${f.targetType}:${f.targetId}`)
    );

    const governanceDelta: GovernanceDelta = {
      scoreBefore: beforeReport.score,
      scoreAfter: afterReport.score,
      scoreDelta: afterReport.score - beforeReport.score,
      newFindings,
      resolvedFindings,
      allFindings: afterReport.findings,
      beforeReport,
      afterReport,
    };

    // 4. Build Simulated Knowledge Graph
    const simulatedGraph = GraphBuilder.build(simulatedModel);

    // 5. Run Blast-Radius Analysis on the affected target
    const blastTarget = this.resolveBlastRadiusTarget(change);
    // For ADD_ENDPOINT, the target exists only in simulatedModel
    const blastModel = change.type === "ADD_ENDPOINT" ? simulatedModel : originalModel;
    const blastRadius = blastRadiusService.analyze(blastModel, blastTarget);

    // 6. Assemble unified SimulationSummary
    const summary: SimulationSummary = {
      breakingChangesCount: diff.summary.breakingCount,
      nonBreakingChangesCount: diff.summary.nonBreakingCount,
      infoChangesCount: diff.summary.infoCount,
      isBreaking: diff.summary.hasBreakingChanges,
      governanceScoreBefore: beforeReport.score,
      governanceScoreAfter: afterReport.score,
      governanceScoreDelta: governanceDelta.scoreDelta,
      newGovernanceFindingsCount: newFindings.length,
      resolvedGovernanceFindingsCount: resolvedFindings.length,
      impactLevel: blastRadius.impactLevel,
      affectedEndpointsCount: blastRadius.affectedEndpoints.length,
      affectedSchemasCount: blastRadius.affectedSchemas.length,
    };

    const simulationId = `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return {
      simulationId,
      originalVersion: originalVersionLabel,
      change,
      summary,
      diff,
      governance: governanceDelta,
      blastRadius,
      simulatedModel,
      simulatedGraph,
    };
  }

  /**
   * Helper to derive the relevant BlastRadiusTarget from the WhatIfChange
   */
  private resolveBlastRadiusTarget(change: WhatIfChange): BlastRadiusTarget {
    switch (change.type) {
      case "REMOVE_SCHEMA_PROPERTY":
        return {
          type: "schema",
          id: `schema:${change.schema}`,
        };
      case "REMOVE_ENDPOINT":
      case "ADD_ENDPOINT":
      case "REMOVE_AUTHENTICATION":
      case "ADD_AUTHENTICATION":
      case "MAKE_PARAMETER_REQUIRED":
      case "REMOVE_PARAMETER":
      case "REMOVE_RESPONSE_FIELD":
      default:
        return {
          type: "endpoint",
          id: `endpoint:${change.method.toUpperCase()}:${change.path}`,
        };
    }
  }
}

export const simulatorService = new SimulatorService();
