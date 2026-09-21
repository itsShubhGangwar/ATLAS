import { CanonicalApiModel } from "../parser/canonical-model";
import { openApiParser } from "../parser";
import { GraphBuilder } from "./graph.builder";
import { GraphModel } from "./graph.types";

export interface GraphBuildResult {
  success: boolean;
  data?: GraphModel;
  error?: string;
  details?: unknown;
}

export class GraphService {
  /**
   * Builds GraphModel directly from an existing CanonicalApiModel
   */
  public buildFromCanonicalModel(model: CanonicalApiModel): GraphBuildResult {
    try {
      const graph = GraphBuilder.build(model);
      return {
        success: true,
        data: graph,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to build graph from Canonical API Model: ${err.message}`,
        details: err,
      };
    }
  }

  /**
   * Ingests a raw OpenAPI specification (YAML/JSON), invokes the existing Phase 2
   * openApiParser to produce CanonicalApiModel, then transforms it into GraphModel.
   *
   * Reuses the existing parser - zero duplicated parsing logic!
   */
  public async buildFromSpec(specContent: string): Promise<GraphBuildResult> {
    try {
      const parseResult = await openApiParser.parse(specContent);

      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error || "Failed to parse specification.",
          details: parseResult.details,
        };
      }

      return this.buildFromCanonicalModel(parseResult.data);
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error during graph generation: ${err.message}`,
        details: err,
      };
    }
  }
}

export const graphService = new GraphService();