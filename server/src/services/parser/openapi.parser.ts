import { validate } from "@readme/openapi-parser";
import {
  CanonicalApiModel,
  ApiMetadata,
  ApiEndpoint,
  ApiParameter,
  ApiRequestBody,
  ApiResponse,
  ApiEndpointSecurity,
  ApiSchema,
  ApiSchemaProperty,
  ApiSecurityScheme,
  HttpMethod,
} from "./canonical-model";
import {
  ParseOptions,
  ParseResult,
} from "./parser.types";
import {
  safeParseYamlOrJson,
  detectSpecVersion,
  extractRefName,
  generateEndpointId,
  findSchemaReferences,
} from "./parser.utils";

const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
  "TRACE",
];

export class OpenApiParserService {
  /**
   * Parses an OpenAPI / Swagger document (YAML or JSON string or object)
   * and transforms it into the ATLAS Canonical API Model.
   */
  public async parse(
    input: string | Record<string, unknown>,
    options: ParseOptions = { validate: true }
  ): Promise<ParseResult> {
    try {
      let doc: any;

      // Step 1: Parse input string if not already an object
      if (typeof input === "string") {
        const parseResult = safeParseYamlOrJson(input);
        if (parseResult.error || !parseResult.doc) {
          return {
            success: false,
            error: parseResult.error || "Failed to parse specification file as YAML or JSON.",
          };
        }
        doc = parseResult.doc;
      } else if (input && typeof input === "object") {
        doc = input;
      } else {
        return {
          success: false,
          error: "Invalid input: specification must be a YAML/JSON string or an object.",
        };
      }

      // Step 2: Detect supported specification version
      const detectedVersion = detectSpecVersion(doc);
      if (!detectedVersion) {
        return {
          success: false,
          error:
            "Unsupported or invalid specification format. ATLAS requires an OpenAPI 3.0.x, 3.1.x, or Swagger 2.0 document with 'openapi' or 'swagger' declared at the root.",
        };
      }

      // Validate required root structure
      if (!doc.paths || typeof doc.paths !== "object" || Array.isArray(doc.paths)) {
        return {
          success: false,
          error: "Invalid OpenAPI specification: 'paths' field is required and must be an object.",
        };
      }

      // Step 3: Validate against OpenAPI / Swagger schema specifications if requested
      if (options.validate !== false) {
        try {
          // Clone document to prevent in-place mutation by validator
          const clonedDoc = JSON.parse(JSON.stringify(doc));
          await validate(clonedDoc as any, {
            resolve: { external: false } as any,
          });
        } catch (valErr: any) {
          return {
            success: false,
            error: `OpenAPI specification validation failed: ${valErr.message}`,
            details: valErr,
          };
        }
      }

      // Step 4: Transform into Canonical API Model
      const canonicalModel = this.transformToCanonicalModel(doc, detectedVersion);

      return {
        success: true,
        data: canonicalModel,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error during OpenAPI parsing: ${err.message}`,
        details: err,
      };
    }
  }

  /**
   * Transforms raw OpenAPI / Swagger document into CanonicalApiModel
   */
  private transformToCanonicalModel(
    doc: any,
    detectedVersion: { version: string; specType: "openapi" | "swagger" }
  ): CanonicalApiModel {
    const metadata = this.extractMetadata(doc, detectedVersion);
    const securitySchemes = this.extractSecuritySchemes(doc);
    const schemas = this.extractSchemas(doc);
    const endpoints = this.extractEndpoints(doc);

    return {
      metadata,
      endpoints,
      schemas,
      securitySchemes,
    };
  }

  /**
   * Extracts API metadata
   */
  private extractMetadata(
    doc: any,
    detectedVersion: { version: string; specType: "openapi" | "swagger" }
  ): ApiMetadata {
    const info = doc.info || {};
    return {
      title: typeof info.title === "string" && info.title.trim() ? info.title.trim() : "Untitled API",
      description: typeof info.description === "string" ? info.description.trim() : undefined,
      version: typeof info.version === "string" && info.version.trim() ? info.version.trim() : "1.0.0",
      openApiVersion: detectedVersion.version,
      specType: detectedVersion.specType,
    };
  }

  /**
   * Extracts security schemes from components.securitySchemes (OAS 3) or securityDefinitions (Swagger 2.0)
   */
  private extractSecuritySchemes(doc: any): ApiSecurityScheme[] {
    const schemes: ApiSecurityScheme[] = [];
    const rawSchemes = doc.components?.securitySchemes || doc.securityDefinitions || {};

    for (const [name, rawScheme] of Object.entries<any>(rawSchemes)) {
      if (!rawScheme || typeof rawScheme !== "object") continue;

      let type: ApiSecurityScheme["type"] = "apiKey";
      if (rawScheme.type === "http") type = "http";
      else if (rawScheme.type === "oauth2") type = "oauth2";
      else if (rawScheme.type === "openIdConnect") type = "openIdConnect";
      else if (rawScheme.type === "basic") type = "basic";
      else if (rawScheme.type === "apiKey") type = "apiKey";

      schemes.push({
        name,
        type,
        scheme: rawScheme.scheme,
        bearerFormat: rawScheme.bearerFormat,
        description: rawScheme.description,
        location: rawScheme.in,
        flows: rawScheme.flows,
      });
    }

    return schemes;
  }

  /**
   * Extracts schema models from components.schemas (OAS 3) or definitions (Swagger 2.0)
   */
  private extractSchemas(doc: any): ApiSchema[] {
    const schemas: ApiSchema[] = [];
    const rawSchemas = doc.components?.schemas || doc.definitions || {};

    for (const [name, rawSchema] of Object.entries<any>(rawSchemas)) {
      if (!rawSchema || typeof rawSchema !== "object") continue;

      const properties: ApiSchemaProperty[] = [];
      const requiredList: string[] = Array.isArray(rawSchema.required) ? rawSchema.required : [];

      if (rawSchema.properties && typeof rawSchema.properties === "object") {
        for (const [propName, propDef] of Object.entries<any>(rawSchema.properties)) {
          if (!propDef || typeof propDef !== "object") continue;

          let propType = propDef.type;
          let reference: string | undefined;
          let itemsType: string | undefined;

          if (propDef.$ref) {
            reference = extractRefName(propDef.$ref);
            propType = propType || "reference";
          }

          if (propDef.type === "array" && propDef.items) {
            if (propDef.items.$ref) {
              reference = extractRefName(propDef.items.$ref);
              itemsType = reference;
            } else if (propDef.items.type) {
              itemsType = propDef.items.type;
            }
          }

          properties.push({
            name: propName,
            type: propType || "any",
            description: propDef.description,
            format: propDef.format,
            required: requiredList.includes(propName),
            reference,
            itemsType,
          });
        }
      }

      const references = findSchemaReferences(rawSchema);

      schemas.push({
        name,
        type: rawSchema.type || (rawSchema.properties ? "object" : "any"),
        description: rawSchema.description,
        properties,
        required: requiredList,
        references,
        rawSchema,
      });
    }

    return schemas;
  }

  /**
   * Extracts endpoints and operations from doc.paths
   */
  private extractEndpoints(doc: any): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];
    const paths = doc.paths || {};
    const globalSecurity = Array.isArray(doc.security) ? doc.security : [];

    for (const [pathKey, pathItem] of Object.entries<any>(paths)) {
      if (!pathItem || typeof pathItem !== "object") continue;

      // Extract path-level parameters
      const pathLevelParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

      for (const method of HTTP_METHODS) {
        const methodLower = method.toLowerCase();
        const operation = pathItem[methodLower];
        if (!operation || typeof operation !== "object") continue;

        // Merge parameters: path level + operation level
        const opParams = Array.isArray(operation.parameters) ? operation.parameters : [];
        const mergedRawParams = [...pathLevelParams, ...opParams];

        const parameters: ApiParameter[] = [];
        let bodyParam: any = null;

        for (const p of mergedRawParams) {
          if (!p || typeof p !== "object") continue;

          // Swagger 2.0 body parameter check
          if (p.in === "body") {
            bodyParam = p;
            continue;
          }

          if (["path", "query", "header", "cookie"].includes(p.in)) {
            parameters.push({
              name: p.name || "",
              location: p.in,
              required: p.required === true || p.in === "path",
              description: p.description,
              schemaType: p.schema?.type || p.type || "string",
              schema: p.schema || { type: p.type, format: p.format },
            });
          }
        }

        // Extract requestBody (OpenAPI 3.x vs Swagger 2.0)
        let requestBody: ApiRequestBody | undefined;

        if (operation.requestBody && typeof operation.requestBody === "object") {
          const content = operation.requestBody.content || {};
          const contentTypes = Object.keys(content);
          const primaryContentType = contentTypes[0] || "application/json";
          const mediaObj = content[primaryContentType] || {};
          const schema = mediaObj.schema || {};

          requestBody = {
            description: operation.requestBody.description,
            required: operation.requestBody.required === true,
            contentType: primaryContentType,
            schemaType: schema.type,
            schemaRef: schema.$ref ? extractRefName(schema.$ref) : undefined,
            schema,
          };
        } else if (bodyParam) {
          // Swagger 2.0 in: "body" fallback
          const schema = bodyParam.schema || {};
          requestBody = {
            description: bodyParam.description,
            required: bodyParam.required === true,
            contentType: "application/json",
            schemaType: schema.type,
            schemaRef: schema.$ref ? extractRefName(schema.$ref) : undefined,
            schema,
          };
        }

        // Extract responses
        const responses: ApiResponse[] = [];
        const rawResponses = operation.responses || {};

        for (const [statusCode, respObj] of Object.entries<any>(rawResponses)) {
          if (!respObj || typeof respObj !== "object") continue;

          let contentType: string | undefined;
          let schema: any;
          let schemaRef: string | undefined;
          let schemaType: string | undefined;

          // OpenAPI 3.x response content
          if (respObj.content && typeof respObj.content === "object") {
            const contentKeys = Object.keys(respObj.content);
            if (contentKeys.length > 0) {
              contentType = contentKeys[0];
              const mediaObj = respObj.content[contentType];
              if (mediaObj?.schema) {
                schema = mediaObj.schema;
                schemaType = schema.type;
                if (schema.$ref) {
                  schemaRef = extractRefName(schema.$ref);
                } else if (schema.type === "array" && schema.items && schema.items.$ref) {
                  schemaRef = extractRefName(schema.items.$ref);
                }
              }
            }
          } else if (respObj.schema) {
            // Swagger 2.0 response schema
            schema = respObj.schema;
            contentType = "application/json";
            schemaType = schema.type;
            if (schema.$ref) {
              schemaRef = extractRefName(schema.$ref);
            } else if (schema.type === "array" && schema.items && schema.items.$ref) {
              schemaRef = extractRefName(schema.items.$ref);
            }
          }

          responses.push({
            statusCode,
            description: typeof respObj.description === "string" ? respObj.description : "",
            contentType,
            schemaRef,
            schemaType,
            schema,
          });
        }

        // Extract security requirements
        const securityRequirements: ApiEndpointSecurity[] = [];
        const opSecurity = operation.security !== undefined ? operation.security : globalSecurity;

        if (Array.isArray(opSecurity)) {
          for (const secReq of opSecurity) {
            if (secReq && typeof secReq === "object") {
              for (const [schemeName, scopes] of Object.entries<any>(secReq)) {
                securityRequirements.push({
                  schemeName,
                  scopes: Array.isArray(scopes) ? scopes : [],
                });
              }
            }
          }
        }

        const id = generateEndpointId(method, pathKey, operation.operationId);

        endpoints.push({
          id,
          path: pathKey,
          method,
          operationId: operation.operationId,
          summary: operation.summary,
          description: operation.description,
          tags: Array.isArray(operation.tags) ? operation.tags : [],
          parameters,
          requestBody,
          responses,
          security: securityRequirements,
        });
      }
    }

    return endpoints;
  }
}

export const openApiParser = new OpenApiParserService();