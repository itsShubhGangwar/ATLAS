import { CanonicalApiModel } from "../parser/canonical-model";
import { openApiParser } from "../parser";
import { typeScriptSdkGenerator } from "./typescript.generator";
import { GeneratedSdk, SdkOptions } from "./sdk.types";

export interface SdkResult {
  success: boolean;
  data?: GeneratedSdk;
  error?: string;
  details?: unknown;
}

export class SdkService {
  /**
   * Generates TypeScript SDK directly from a CanonicalApiModel
   */
  public generateFromCanonicalModel(
    model: CanonicalApiModel,
    options: SdkOptions = {}
  ): SdkResult {
    try {
      const sdk = typeScriptSdkGenerator.generate(model, options);
      return {
        success: true,
        data: sdk,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to generate TypeScript SDK: ${err.message}`,
        details: err,
      };
    }
  }

  /**
   * Generates TypeScript SDK from raw OpenAPI spec content
   */
  public async generateFromSpec(
    specContent: string,
    options: SdkOptions = {}
  ): Promise<SdkResult> {
    try {
      const parseResult = await openApiParser.parse(specContent);
      if (!parseResult.success) {
        return {
          success: false,
          error: `Failed to parse specification: ${parseResult.error}`,
          details: parseResult.details,
        };
      }

      return this.generateFromCanonicalModel(parseResult.data, options);
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error during SDK generation: ${err.message}`,
        details: err,
      };
    }
  }
}

export const sdkService = new SdkService();
