import { CanonicalApiModel } from "../parser/canonical-model";
import { openApiParser } from "../parser";
import { governanceEngine } from "./governance.engine";
import { GovernanceReport } from "./governance.types";

export interface GovernanceResult {
  success: boolean;
  data?: GovernanceReport;
  error?: string;
  details?: unknown;
}

export class GovernanceService {
  /**
   * Analyzes an existing CanonicalApiModel directly
   */
  public analyzeCanonicalModel(model: CanonicalApiModel): GovernanceResult {
    try {
      const report = governanceEngine.analyze(model);
      return {
        success: true,
        data: report,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to analyze Canonical API Model: ${err.message}`,
        details: err,
      };
    }
  }

  /**
   * Parses an OpenAPI YAML/JSON string using the existing Phase 2 parser,
   * then evaluates the canonical model through the GovernanceEngine.
   */
  public async analyzeSpec(specContent: string): Promise<GovernanceResult> {
    try {
      const parseResult = await openApiParser.parse(specContent);

      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error || "Failed to parse specification.",
          details: parseResult.details,
        };
      }

      return this.analyzeCanonicalModel(parseResult.data);
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error during governance evaluation: ${err.message}`,
        details: err,
      };
    }
  }
}

export const governanceService = new GovernanceService();