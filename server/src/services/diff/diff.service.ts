import { CanonicalApiModel } from "../parser/canonical-model";
import { openApiParser } from "../parser";
import { diffEngine } from "./diff.engine";
import { DiffReport } from "./diff.types";

export interface DiffResult {
  success: boolean;
  data?: DiffReport;
  error?: string;
  details?: unknown;
}

export class DiffService {
  /**
   * Compares two existing CanonicalApiModels directly
   */
  public compareModels(baseModel: CanonicalApiModel, newModel: CanonicalApiModel): DiffResult {
    try {
      const report = diffEngine.compare(baseModel, newModel);
      return {
        success: true,
        data: report,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to compare Canonical API Models: ${err.message}`,
        details: err,
      };
    }
  }

  /**
   * Compares two raw OpenAPI specifications by parsing both via Phase 2 parser,
   * then passing their CanonicalApiModels to the DiffEngine.
   */
  public async compareSpecs(baseSpecContent: string, newSpecContent: string): Promise<DiffResult> {
    try {
      const baseResult = await openApiParser.parse(baseSpecContent);
      if (!baseResult.success) {
        return {
          success: false,
          error: `Failed to parse base specification: ${baseResult.error}`,
          details: baseResult.details,
        };
      }

      const newResult = await openApiParser.parse(newSpecContent);
      if (!newResult.success) {
        return {
          success: false,
          error: `Failed to parse new specification: ${newResult.error}`,
          details: newResult.details,
        };
      }

      return this.compareModels(baseResult.data, newResult.data);
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error during specification comparison: ${err.message}`,
        details: err,
      };
    }
  }
}

export const diffService = new DiffService();
