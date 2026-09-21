import { DiffChange, DiffReport } from "../diff/diff.types";

export interface EvolutionChangeGroup {
  endpoints: string[];
  schemas: string[];
  parameters: string[];
  securitySchemes: string[];
}

export interface EvolutionModifiedGroup {
  endpoints: string[];
  schemas: string[];
  securitySchemes: string[];
}

export interface EvolutionVersionItem {
  id: string;
  name?: string;
  version: string;
  openApiVersion: string;
  specType: "openapi" | "swagger";
  createdAt: string;
  endpointCount: number;
  schemaCount: number;
  securitySchemeCount: number;
  governanceScore: number | null;
  governanceReportId?: string | null;
  changesFromPrevious: {
    breaking: number;
    nonBreaking: number;
    info: number;
  } | null;
}

export interface EvolutionTransitionMetrics {
  endpointGrowth: number;
  schemaGrowth: number;
  securityGrowth: number;
  breakingChangesCount: number;
  nonBreakingChangesCount: number;
  infoChangesCount: number;
  governanceScoreBefore: number | null;
  governanceScoreAfter: number | null;
  governanceScoreDelta: number | null;
}

export interface EvolutionTransition {
  fromVersionId: string;
  fromVersion: string;
  toVersionId: string;
  toVersion: string;
  metrics: EvolutionTransitionMetrics;
  summary: {
    added: EvolutionChangeGroup;
    removed: EvolutionChangeGroup;
    modified: EvolutionModifiedGroup;
    breaking: DiffChange[];
  };
  diffReport: DiffReport;
}

export interface ProjectEvolutionReport {
  project: {
    id: string;
    name: string;
    description?: string;
  };
  versions: EvolutionVersionItem[];
  transitions: EvolutionTransition[];
  summary: {
    totalVersions: number;
    initialVersion: string | null;
    currentVersion: string | null;
    totalEndpointsGrowth: number;
    totalSchemasGrowth: number;
    totalBreakingChangesAcrossHistory: number;
  };
}
