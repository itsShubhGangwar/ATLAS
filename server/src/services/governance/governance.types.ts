import { CanonicalApiModel } from "../parser/canonical-model";

export type GovernanceSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface GovernanceFinding {
  id: string;
  ruleId: string;
  severity: GovernanceSeverity;
  title: string;
  description: string;
  category: string;
  targetType: "api" | "endpoint" | "schema" | "security";
  targetId: string;
  remediation?: string;
  patch?: unknown;
}

export interface GovernanceSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface GovernanceReport {
  score: number;
  findings: GovernanceFinding[];
  summary: GovernanceSummary;
  rulesRun: number;
}

export interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  severity: GovernanceSeverity;
  category: string;
  evaluate(model: CanonicalApiModel): GovernanceFinding[];
}