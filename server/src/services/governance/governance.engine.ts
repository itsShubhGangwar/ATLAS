import { CanonicalApiModel } from "../parser/canonical-model";
import {
  GovernanceRule,
  GovernanceFinding,
  GovernanceReport,
  GovernanceSummary,
  GovernanceSeverity,
} from "./governance.types";
import { DEFAULT_GOVERNANCE_RULES } from "./governance.rules";

const SEVERITY_DEDUCTIONS: Record<GovernanceSeverity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
};

export class GovernanceEngine {
  private rules: GovernanceRule[] = [];

  constructor(rules: GovernanceRule[] = DEFAULT_GOVERNANCE_RULES) {
    this.rules = [...rules];
  }

  public registerRule(rule: GovernanceRule): void {
    this.rules.push(rule);
  }

  public getRules(): GovernanceRule[] {
    return [...this.rules];
  }

  /**
   * Deterministically evaluates the CanonicalApiModel against all registered governance rules.
   */
  public analyze(model: CanonicalApiModel): GovernanceReport {
    const findings: GovernanceFinding[] = [];

    // Evaluate all rules
    for (const rule of this.rules) {
      try {
        const ruleFindings = rule.evaluate(model);
        if (Array.isArray(ruleFindings)) {
          findings.push(...ruleFindings);
        }
      } catch (err: any) {
        console.warn(`[GovernanceEngine] Error evaluating rule '${rule.id}': ${err.message}`);
      }
    }

    // Calculate Summary Counts
    const summary: GovernanceSummary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    let totalDeduction = 0;
    for (const finding of findings) {
      if (summary[finding.severity] !== undefined) {
        summary[finding.severity]++;
      }
      totalDeduction += SEVERITY_DEDUCTIONS[finding.severity] || 0;
    }

    // Transparent score: Start at 100, deduct points, clamp between 0 and 100
    const rawScore = 100 - totalDeduction;
    const score = Math.max(0, Math.min(100, rawScore));

    return {
      score,
      findings,
      summary,
      rulesRun: this.rules.length,
    };
  }
}

export const governanceEngine = new GovernanceEngine();