export type DiffSeverity = "breaking" | "non-breaking" | "info";

export type DiffCategory =
  | "endpoint"
  | "parameter"
  | "schema"
  | "response"
  | "security"
  | "metadata";

export type DiffChangeType = "added" | "removed" | "modified";

export interface DiffChange {
  id: string;
  category: DiffCategory;
  changeType: DiffChangeType;
  severity: DiffSeverity;
  path: string;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface DiffSummary {
  totalChanges: number;
  breakingCount: number;
  nonBreakingCount: number;
  infoCount: number;
  hasBreakingChanges: boolean;
}

export interface DiffReport {
  baseVersion: string;
  newVersion: string;
  baseTitle: string;
  newTitle: string;
  summary: DiffSummary;
  changes: DiffChange[];
}
