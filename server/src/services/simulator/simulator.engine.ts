import {
  CanonicalApiModel,
  ApiEndpoint,
  ApiSchema,
  ApiSecurityScheme,
  HttpMethod,
} from "../parser/canonical-model";
import { WhatIfChange } from "./simulator.types";
import { ApiError } from "../../utils/api-error";

export class SimulatorEngine {
  /**
   * Helper to strip #/components/schemas/ or #/definitions/
   */
  private static extractSchemaName(ref?: string): string | null {
    if (!ref) return null;
    if (ref.startsWith("#/components/schemas/")) {
      return ref.replace("#/components/schemas/", "");
    }
    if (ref.startsWith("#/definitions/")) {
      return ref.replace("#/definitions/", "");
    }
    return ref;
  }

  /**
   * Applies a hypothetical change to a fresh in-memory clone of CanonicalApiModel.
   * Throws ApiError if requested component or property does not exist.
   * Guarantees the original input model is never mutated.
   */
  public static applyChange(
    originalModel: CanonicalApiModel,
    change: WhatIfChange
  ): CanonicalApiModel {
    if (!originalModel) {
      throw new ApiError(400, "INVALID_MODEL", "Original Canonical API Model is required.");
    }
    if (!change || !change.type) {
      throw new ApiError(400, "INVALID_CHANGE", "What-if change specification is required.");
    }

    // Safe deep-clone
    const model: CanonicalApiModel = JSON.parse(JSON.stringify(originalModel));
    model.endpoints = model.endpoints || [];
    model.schemas = model.schemas || [];
    model.securitySchemes = model.securitySchemes || [];

    switch (change.type) {
      // -------------------------------------------------------------
      // 1. REMOVE_ENDPOINT
      // -------------------------------------------------------------
      case "REMOVE_ENDPOINT": {
        const method = change.method.toUpperCase() as HttpMethod;
        const index = model.endpoints.findIndex(
          (ep) => ep.path === change.path && ep.method.toUpperCase() === method
        );
        if (index === -1) {
          throw new ApiError(
            404,
            "ENDPOINT_NOT_FOUND",
            `Endpoint '${method} ${change.path}' does not exist.`
          );
        }
        model.endpoints.splice(index, 1);
        break;
      }

      // -------------------------------------------------------------
      // 2. ADD_ENDPOINT
      // -------------------------------------------------------------
      case "ADD_ENDPOINT": {
        const method = change.method.toUpperCase() as HttpMethod;
        const exists = model.endpoints.some(
          (ep) => ep.path === change.path && ep.method.toUpperCase() === method
        );
        if (exists) {
          throw new ApiError(
            409,
            "ENDPOINT_ALREADY_EXISTS",
            `Endpoint '${method} ${change.path}' already exists.`
          );
        }

        const cleanPathSlug = change.path.replace(/[^a-zA-Z0-9]/g, "-").replace(/^-+|-+$/g, "");
        const newEndpoint: ApiEndpoint = {
          id: `${method.toLowerCase()}-${cleanPathSlug || "root"}`,
          path: change.path,
          method,
          summary: change.summary || `Simulated ${method} ${change.path}`,
          description: change.description || "Synthesized via What-If Simulator",
          tags: change.tags && change.tags.length > 0 ? change.tags : ["Simulated"],
          parameters: [],
          responses: change.responses && change.responses.length > 0
            ? change.responses
            : [{ statusCode: "200", description: "Successful response" }],
          security: [],
        };

        model.endpoints.push(newEndpoint);
        break;
      }

      // -------------------------------------------------------------
      // 3. REMOVE_AUTHENTICATION
      // -------------------------------------------------------------
      case "REMOVE_AUTHENTICATION": {
        const method = change.method.toUpperCase() as HttpMethod;
        const endpoint = model.endpoints.find(
          (ep) => ep.path === change.path && ep.method.toUpperCase() === method
        );
        if (!endpoint) {
          throw new ApiError(
            404,
            "ENDPOINT_NOT_FOUND",
            `Endpoint '${method} ${change.path}' does not exist.`
          );
        }
        endpoint.security = [];
        break;
      }

      // -------------------------------------------------------------
      // 4. ADD_AUTHENTICATION
      // -------------------------------------------------------------
      case "ADD_AUTHENTICATION": {
        const method = change.method.toUpperCase() as HttpMethod;
        const endpoint = model.endpoints.find(
          (ep) => ep.path === change.path && ep.method.toUpperCase() === method
        );
        if (!endpoint) {
          throw new ApiError(
            404,
            "ENDPOINT_NOT_FOUND",
            `Endpoint '${method} ${change.path}' does not exist.`
          );
        }

        const secExists = model.securitySchemes.some((s) => s.name === change.securityScheme);
        if (!secExists) {
          throw new ApiError(
            404,
            "SECURITY_SCHEME_NOT_FOUND",
            `Security scheme '${change.securityScheme}' does not exist.`
          );
        }

        endpoint.security = endpoint.security || [];
        const alreadyBound = endpoint.security.some((s) => s.schemeName === change.securityScheme);
        if (!alreadyBound) {
          endpoint.security.push({
            schemeName: change.securityScheme,
            scopes: change.scopes || [],
          });
        }
        break;
      }

      // -------------------------------------------------------------
      // 5. MAKE_PARAMETER_REQUIRED
      // -------------------------------------------------------------
      case "MAKE_PARAMETER_REQUIRED": {
        const method = change.method.toUpperCase() as HttpMethod;
        const endpoint = model.endpoints.find(
          (ep) => ep.path === change.path && ep.method.toUpperCase() === method
        );
        if (!endpoint) {
          throw new ApiError(
            404,
            "ENDPOINT_NOT_FOUND",
            `Endpoint '${method} ${change.path}' does not exist.`
          );
        }

        endpoint.parameters = endpoint.parameters || [];
        const param = endpoint.parameters.find((p) => p.name === change.parameter);
        if (!param) {
          throw new ApiError(
            404,
            "PARAMETER_NOT_FOUND",
            `Parameter '${change.parameter}' does not exist on endpoint '${method} ${change.path}'.`
          );
        }

        param.required = true;
        break;
      }

      // -------------------------------------------------------------
      // 6. REMOVE_PARAMETER
      // -------------------------------------------------------------
      case "REMOVE_PARAMETER": {
        const method = change.method.toUpperCase() as HttpMethod;
        const endpoint = model.endpoints.find(
          (ep) => ep.path === change.path && ep.method.toUpperCase() === method
        );
        if (!endpoint) {
          throw new ApiError(
            404,
            "ENDPOINT_NOT_FOUND",
            `Endpoint '${method} ${change.path}' does not exist.`
          );
        }

        endpoint.parameters = endpoint.parameters || [];
        const pIndex = endpoint.parameters.findIndex((p) => p.name === change.parameter);
        if (pIndex === -1) {
          throw new ApiError(
            404,
            "PARAMETER_NOT_FOUND",
            `Parameter '${change.parameter}' does not exist on endpoint '${method} ${change.path}'.`
          );
        }

        endpoint.parameters.splice(pIndex, 1);
        break;
      }

      // -------------------------------------------------------------
      // 7. REMOVE_RESPONSE_FIELD
      // -------------------------------------------------------------
      case "REMOVE_RESPONSE_FIELD": {
        const method = change.method.toUpperCase() as HttpMethod;
        const endpoint = model.endpoints.find(
          (ep) => ep.path === change.path && ep.method.toUpperCase() === method
        );
        if (!endpoint) {
          throw new ApiError(
            404,
            "ENDPOINT_NOT_FOUND",
            `Endpoint '${method} ${change.path}' does not exist.`
          );
        }

        endpoint.responses = endpoint.responses || [];
        const response = endpoint.responses.find((r) => r.statusCode === change.statusCode);
        if (!response) {
          throw new ApiError(
            404,
            "RESPONSE_NOT_FOUND",
            `Response '${change.statusCode}' does not exist on endpoint '${method} ${change.path}'.`
          );
        }

        let propertyRemoved = false;

        // If response points to a referenced schema, remove the property from that schema
        if (response.schemaRef) {
          const schemaName = SimulatorEngine.extractSchemaName(response.schemaRef);
          const targetSchema = model.schemas.find((s) => s.name === schemaName);
          if (!targetSchema) {
            throw new ApiError(
              404,
              "SCHEMA_NOT_FOUND",
              `Referenced response schema '${schemaName}' does not exist.`
            );
          }

          targetSchema.properties = targetSchema.properties || [];
          const propIndex = targetSchema.properties.findIndex((p) => p.name === change.field);
          if (propIndex === -1) {
            throw new ApiError(
              404,
              "PROPERTY_NOT_FOUND",
              `Field '${change.field}' does not exist in response schema '${schemaName}'.`
            );
          }

          targetSchema.properties.splice(propIndex, 1);
          if (Array.isArray(targetSchema.required)) {
            targetSchema.required = targetSchema.required.filter((r) => r !== change.field);
          }
          propertyRemoved = true;
        } else if (response.schema && typeof response.schema === "object") {
          // Inline schema
          const raw = response.schema as any;
          if (raw.properties && raw.properties[change.field]) {
            delete raw.properties[change.field];
            if (Array.isArray(raw.required)) {
              raw.required = raw.required.filter((r: string) => r !== change.field);
            }
            propertyRemoved = true;
          }
        }

        if (!propertyRemoved) {
          throw new ApiError(
            404,
            "PROPERTY_NOT_FOUND",
            `Field '${change.field}' not found in response schema for status '${change.statusCode}'.`
          );
        }
        break;
      }

      // -------------------------------------------------------------
      // 8. REMOVE_SCHEMA_PROPERTY
      // -------------------------------------------------------------
      case "REMOVE_SCHEMA_PROPERTY": {
        const schema = model.schemas.find((s) => s.name === change.schema);
        if (!schema) {
          throw new ApiError(
            404,
            "SCHEMA_NOT_FOUND",
            `Schema '${change.schema}' does not exist.`
          );
        }

        schema.properties = schema.properties || [];
        const propIndex = schema.properties.findIndex((p) => p.name === change.property);
        if (propIndex === -1) {
          throw new ApiError(
            404,
            "PROPERTY_NOT_FOUND",
            `Property '${change.property}' does not exist in schema '${change.schema}'.`
          );
        }

        schema.properties.splice(propIndex, 1);
        if (Array.isArray(schema.required)) {
          schema.required = schema.required.filter((r) => r !== change.property);
        }
        break;
      }

      default: {
        throw new ApiError(
          400,
          "UNSUPPORTED_CHANGE_TYPE",
          `Unsupported what-if change type: '${(change as any).type}'.`
        );
      }
    }

    return model;
  }
}
