import {
  CanonicalApiModel,
  ApiEndpoint,
  ApiSchema,
  ApiSecurityScheme,
  ApiResponse,
} from "../parser/canonical-model";
import { DiffReport } from "../diff/diff.types";
import { GovernanceReport, GovernanceFinding } from "../governance/governance.types";
import { GraphModel } from "../graph/graph.types";
import { BlastRadiusResult, BlastRadiusImpactLevel } from "../blast-radius/blastRadius.types";

export type WhatIfChangeType =
  | "REMOVE_ENDPOINT"
  | "ADD_ENDPOINT"
  | "REMOVE_AUTHENTICATION"
  | "ADD_AUTHENTICATION"
  | "MAKE_PARAMETER_REQUIRED"
  | "REMOVE_PARAMETER"
  | "REMOVE_RESPONSE_FIELD"
  | "REMOVE_SCHEMA_PROPERTY";

export interface RemoveEndpointChange {
  type: "REMOVE_ENDPOINT";
  path: string;
  method: string;
}

export interface AddEndpointChange {
  type: "ADD_ENDPOINT";
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  responses?: ApiResponse[];
}

export interface RemoveAuthenticationChange {
  type: "REMOVE_AUTHENTICATION";
  path: string;
  method: string;
}

export interface AddAuthenticationChange {
  type: "ADD_AUTHENTICATION";
  path: string;
  method: string;
  securityScheme: string;
  scopes?: string[];
}

export interface MakeParameterRequiredChange {
  type: "MAKE_PARAMETER_REQUIRED";
  path: string;
  method: string;
  parameter: string;
}

export interface RemoveParameterChange {
  type: "REMOVE_PARAMETER";
  path: string;
  method: string;
  parameter: string;
}

export interface RemoveResponseFieldChange {
  type: "REMOVE_RESPONSE_FIELD";
  path: string;
  method: string;
  statusCode: string;
  field: string;
}

export interface RemoveSchemaPropertyChange {
  type: "REMOVE_SCHEMA_PROPERTY";
  schema: string;
  property: string;
}

export type WhatIfChange =
  | RemoveEndpointChange
  | AddEndpointChange
  | RemoveAuthenticationChange
  | AddAuthenticationChange
  | MakeParameterRequiredChange
  | RemoveParameterChange
  | RemoveResponseFieldChange
  | RemoveSchemaPropertyChange;

export interface GovernanceDelta {
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  newFindings: GovernanceFinding[];
  resolvedFindings: GovernanceFinding[];
  allFindings: GovernanceFinding[];
  beforeReport: GovernanceReport;
  afterReport: GovernanceReport;
}

export interface SimulationSummary {
  breakingChangesCount: number;
  nonBreakingChangesCount: number;
  infoChangesCount: number;
  isBreaking: boolean;
  governanceScoreBefore: number;
  governanceScoreAfter: number;
  governanceScoreDelta: number;
  newGovernanceFindingsCount: number;
  resolvedGovernanceFindingsCount: number;
  impactLevel: BlastRadiusImpactLevel;
  affectedEndpointsCount: number;
  affectedSchemasCount: number;
}

export interface SimulationResult {
  simulationId: string;
  originalVersion: string;
  change: WhatIfChange;
  summary: SimulationSummary;
  diff: DiffReport;
  governance: GovernanceDelta;
  blastRadius: BlastRadiusResult;
  simulatedModel: CanonicalApiModel;
  simulatedGraph: GraphModel;
}
