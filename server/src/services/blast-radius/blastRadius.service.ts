import {
  CanonicalApiModel,
  ApiEndpoint,
  ApiSchema,
  ApiSecurityScheme,
} from "../parser/canonical-model";
import {
  BlastRadiusTarget,
  BlastRadiusResult,
  BlastRadiusImpactLevel,
  AffectedEndpoint,
  AffectedSchema,
  AffectedSecurityScheme,
  BlastRadiusRelationship,
} from "./blastRadius.types";
import { ApiError } from "../../utils/api-error";

export class BlastRadiusService {
  /**
   * Analyzes the blast radius of a component (endpoint, schema, or security scheme)
   * within a given Canonical API Model.
   */
  public analyze(model: CanonicalApiModel, target: BlastRadiusTarget): BlastRadiusResult {
    if (!model) {
      throw new ApiError(400, "INVALID_MODEL", "Canonical API Model is required for blast radius analysis.");
    }
    if (!target || !target.type || !target.id) {
      throw new ApiError(400, "INVALID_TARGET", "A valid target with 'type' and 'id' is required.");
    }

    switch (target.type) {
      case "endpoint":
        return this.analyzeEndpoint(model, target);
      case "schema":
        return this.analyzeSchema(model, target);
      case "security":
        return this.analyzeSecurityScheme(model, target);
      default:
        throw new ApiError(400, "UNSUPPORTED_TARGET_TYPE", `Unsupported target type: '${(target as any).type}'. Must be 'endpoint', 'schema', or 'security'.`);
    }
  }

  // --- Helper: Extract clean schema name from schemaRef ---
  private extractSchemaName(ref?: string): string | null {
    if (!ref) return null;
    if (ref.startsWith("#/components/schemas/")) {
      return ref.replace("#/components/schemas/", "");
    }
    if (ref.startsWith("#/definitions/")) {
      return ref.replace("#/definitions/", "");
    }
    return ref;
  }

  // --- 1. Analyze Endpoint ---
  private analyzeEndpoint(model: CanonicalApiModel, target: BlastRadiusTarget): BlastRadiusResult {
    const endpoints = model.endpoints || [];
    const schemas = model.schemas || [];
    const securitySchemes = model.securitySchemes || [];

    // Normalize endpoint target ID: could be "endpoint:GET:/users/{id}", "GET /users/{id}", or endpoint.id
    const rawId = target.id.trim();
    let matchMethod: string | null = null;
    let matchPath: string | null = null;

    if (rawId.startsWith("endpoint:")) {
      const parts = rawId.substring("endpoint:".length).split(":");
      if (parts.length >= 2) {
        matchMethod = parts[0].toUpperCase();
        matchPath = parts.slice(1).join(":");
      }
    } else if (rawId.includes(" ")) {
      const [m, ...p] = rawId.split(" ");
      matchMethod = m.toUpperCase();
      matchPath = p.join(" ");
    }

    const endpoint = endpoints.find((ep) => {
      if (matchMethod && matchPath) {
        return ep.method.toUpperCase() === matchMethod && ep.path === matchPath;
      }
      return ep.id === rawId || `${ep.method.toUpperCase()} ${ep.path}` === rawId;
    });

    if (!endpoint) {
      throw new ApiError(404, "TARGET_NOT_FOUND", `Endpoint '${target.id}' not found in API model.`);
    }

    const endpointNodeId = `endpoint:${endpoint.method.toUpperCase()}:${endpoint.path}`;
    const targetLabel = `${endpoint.method.toUpperCase()} ${endpoint.path}`;

    const affectedEndpointsMap = new Map<string, AffectedEndpoint>();
    const affectedSchemasMap = new Map<string, AffectedSchema>();
    const affectedSecurityMap = new Map<string, AffectedSecurityScheme>();
    const affectedTagsSet = new Set<string>();
    const relationships: BlastRadiusRelationship[] = [];
    const reasons: string[] = [];

    // Direct tags
    for (const tag of endpoint.tags || []) {
      affectedTagsSet.add(tag);
      relationships.push({
        source: endpointNodeId,
        target: `tag:${tag}`,
        type: "TAGGED_WITH",
        description: `Endpoint is tagged with '${tag}'`,
      });
    }

    // Direct Parameters
    const paramsCount = endpoint.parameters ? endpoint.parameters.length : 0;
    if (paramsCount > 0) {
      reasons.push(`Endpoint accepts ${paramsCount} parameter(s) (${endpoint.parameters.map((p) => p.name).join(", ")})`);
    }

    // Request Body Schema
    const endpointSchemaNames = new Set<string>();
    if (endpoint.requestBody?.schemaRef) {
      const reqSchemaName = this.extractSchemaName(endpoint.requestBody.schemaRef);
      if (reqSchemaName) {
        endpointSchemaNames.add(reqSchemaName);
        affectedSchemasMap.set(reqSchemaName, {
          name: reqSchemaName,
          reason: "Consumed as request body schema",
        });
        relationships.push({
          source: endpointNodeId,
          target: `schema:${reqSchemaName}`,
          type: "REQUEST_BODY",
          description: `Consumes request body schema '${reqSchemaName}'`,
        });
      }
    }

    // Response Schemas
    for (const res of endpoint.responses || []) {
      const respSchemaName = this.extractSchemaName(res.schemaRef);
      if (respSchemaName) {
        endpointSchemaNames.add(respSchemaName);
        affectedSchemasMap.set(respSchemaName, {
          name: respSchemaName,
          reason: `Returned in HTTP ${res.statusCode} response`,
        });
        relationships.push({
          source: endpointNodeId,
          target: `schema:${respSchemaName}`,
          type: "RETURNS",
          description: `Returns schema '${respSchemaName}' on HTTP ${res.statusCode}`,
        });
      }
    }

    // Security Schemes
    for (const sec of endpoint.security || []) {
      if (sec.schemeName) {
        const secDef = securitySchemes.find((s) => s.name === sec.schemeName);
        affectedSecurityMap.set(sec.schemeName, {
          name: sec.schemeName,
          reason: "Enforces security requirement on this endpoint",
          type: secDef?.type,
        });
        relationships.push({
          source: endpointNodeId,
          target: `security:${sec.schemeName}`,
          type: "SECURED_BY",
          description: `Requires security scheme '${sec.schemeName}'`,
        });
      }
    }

    // Identify sibling endpoints sharing the same schemas
    for (const schemaName of endpointSchemaNames) {
      const otherEndpoints = endpoints.filter(
        (other) =>
          other !== endpoint &&
          (this.extractSchemaName(other.requestBody?.schemaRef) === schemaName ||
            other.responses?.some((r) => this.extractSchemaName(r.schemaRef) === schemaName))
      );

      for (const sibling of otherEndpoints) {
        const sibId = `endpoint:${sibling.method.toUpperCase()}:${sibling.path}`;
        if (!affectedEndpointsMap.has(sibId)) {
          affectedEndpointsMap.set(sibId, {
            id: sibId,
            path: sibling.path,
            method: sibling.method.toUpperCase(),
            reason: `Shares schema '${schemaName}' with this endpoint`,
          });
          relationships.push({
            source: endpointNodeId,
            target: sibId,
            type: "SHARED_SCHEMA",
            description: `Interconnected via shared schema '${schemaName}'`,
          });
        }
      }
    }

    // Sub-schemas referenced by affected schemas
    for (const schemaName of Array.from(affectedSchemasMap.keys())) {
      const schemaDef = schemas.find((s) => s.name === schemaName);
      if (schemaDef && Array.isArray(schemaDef.references)) {
        for (const subRef of schemaDef.references) {
          if (!affectedSchemasMap.has(subRef)) {
            affectedSchemasMap.set(subRef, {
              name: subRef,
              reason: `Nested reference from schema '${schemaName}'`,
            });
            relationships.push({
              source: `schema:${schemaName}`,
              target: `schema:${subRef}`,
              type: "USES_SCHEMA",
              description: `Schema '${schemaName}' references '${subRef}'`,
            });
          }
        }
      }
    }

    // Compile reasons
    if (affectedSchemasMap.size > 0) {
      reasons.push(`Directly bound to ${affectedSchemasMap.size} schema(s): ${Array.from(affectedSchemasMap.keys()).join(", ")}`);
    }
    if (affectedEndpointsMap.size > 0) {
      reasons.push(`Shares schemas with ${affectedEndpointsMap.size} sibling endpoint(s)`);
    }
    if (affectedSecurityMap.size > 0) {
      reasons.push(`Secured by ${affectedSecurityMap.size} authentication scheme(s): ${Array.from(affectedSecurityMap.keys()).join(", ")}`);
    }
    if (reasons.length === 0) {
      reasons.push("Isolated endpoint with no parameter, schema, or security bindings.");
    }

    // Determine Impact Level
    const siblingCount = affectedEndpointsMap.size;
    const schemasCount = affectedSchemasMap.size;
    let impactLevel: BlastRadiusImpactLevel = "LOW";

    if (siblingCount >= 3 || schemasCount >= 3) {
      impactLevel = "HIGH";
    } else if (siblingCount > 0 || schemasCount > 0 || affectedSecurityMap.size > 0) {
      impactLevel = "MEDIUM";
    } else {
      impactLevel = "LOW";
    }

    const affectedEndpoints = Array.from(affectedEndpointsMap.values());
    const affectedSchemas = Array.from(affectedSchemasMap.values());
    const affectedSecuritySchemes = Array.from(affectedSecurityMap.values());
    const affectedTags = Array.from(affectedTagsSet);

    return {
      target: { type: "endpoint", id: endpointNodeId },
      targetLabel,
      impactLevel,
      affectedEndpoints,
      affectedSchemas,
      affectedSecuritySchemes,
      affectedTags,
      relationships,
      reasons,
      metrics: {
        totalAffected: affectedEndpoints.length + affectedSchemas.length + affectedSecuritySchemes.length + affectedTags.length,
        endpointsCount: affectedEndpoints.length,
        schemasCount: affectedSchemas.length,
        securityCount: affectedSecuritySchemes.length,
        tagsCount: affectedTags.length,
      },
    };
  }

  // --- 2. Analyze Schema ---
  private analyzeSchema(model: CanonicalApiModel, target: BlastRadiusTarget): BlastRadiusResult {
    const schemas = model.schemas || [];
    const endpoints = model.endpoints || [];

    const rawId = target.id.trim();
    const schemaName = rawId.startsWith("schema:") ? rawId.substring("schema:".length) : rawId;

    const schema = schemas.find((s) => s.name === schemaName);
    if (!schema) {
      throw new ApiError(404, "TARGET_NOT_FOUND", `Schema '${target.id}' not found in API model.`);
    }

    const schemaNodeId = `schema:${schema.name}`;
    const targetLabel = `Schema: ${schema.name}`;

    const affectedEndpointsMap = new Map<string, AffectedEndpoint>();
    const affectedSchemasMap = new Map<string, AffectedSchema>();
    const affectedSecurityMap = new Map<string, AffectedSecurityScheme>();
    const affectedTagsSet = new Set<string>();
    const relationships: BlastRadiusRelationship[] = [];
    const reasons: string[] = [];

    // Find endpoints returning this schema
    const returningEndpoints = endpoints.filter((ep) =>
      ep.responses?.some((r) => this.extractSchemaName(r.schemaRef) === schema.name)
    );
    for (const ep of returningEndpoints) {
      const epId = `endpoint:${ep.method.toUpperCase()}:${ep.path}`;
      affectedEndpointsMap.set(epId, {
        id: epId,
        path: ep.path,
        method: ep.method.toUpperCase(),
        reason: "Returns this schema in response payload",
      });
      relationships.push({
        source: epId,
        target: schemaNodeId,
        type: "RETURNS",
        description: `Endpoint returns schema '${schema.name}'`,
      });
      for (const t of ep.tags || []) affectedTagsSet.add(t);
    }

    // Find endpoints accepting this schema in request body
    const consumingEndpoints = endpoints.filter(
      (ep) => this.extractSchemaName(ep.requestBody?.schemaRef) === schema.name
    );
    for (const ep of consumingEndpoints) {
      const epId = `endpoint:${ep.method.toUpperCase()}:${ep.path}`;
      if (!affectedEndpointsMap.has(epId)) {
        affectedEndpointsMap.set(epId, {
          id: epId,
          path: ep.path,
          method: ep.method.toUpperCase(),
          reason: "Consumes this schema in request body",
        });
      }
      relationships.push({
        source: epId,
        target: schemaNodeId,
        type: "REQUEST_BODY",
        description: `Endpoint consumes schema '${schema.name}'`,
      });
      for (const t of ep.tags || []) affectedTagsSet.add(t);
    }

    // Find other schemas referencing this schema
    const referencingSchemas = schemas.filter(
      (s) =>
        s.name !== schema.name &&
        (s.references?.includes(schema.name) ||
          s.properties?.some((p) => this.extractSchemaName(p.reference) === schema.name))
    );
    for (const refSchema of referencingSchemas) {
      affectedSchemasMap.set(refSchema.name, {
        name: refSchema.name,
        reason: `References '${schema.name}' as a property or dependency`,
        type: refSchema.type,
      });
      relationships.push({
        source: `schema:${refSchema.name}`,
        target: schemaNodeId,
        type: "USES_SCHEMA",
        description: `Schema '${refSchema.name}' depends on '${schema.name}'`,
      });
    }

    // Schemas this schema references
    for (const subRef of schema.references || []) {
      if (!affectedSchemasMap.has(subRef)) {
        const subDef = schemas.find((s) => s.name === subRef);
        affectedSchemasMap.set(subRef, {
          name: subRef,
          reason: `Referenced internally by '${schema.name}'`,
          type: subDef?.type,
        });
        relationships.push({
          source: schemaNodeId,
          target: `schema:${subRef}`,
          type: "USES_SCHEMA",
          description: `Schema '${schema.name}' references '${subRef}'`,
        });
      }
    }

    // Security schemes linked via affected endpoints
    for (const ep of [...returningEndpoints, ...consumingEndpoints]) {
      for (const sec of ep.security || []) {
        if (sec.schemeName && !affectedSecurityMap.has(sec.schemeName)) {
          affectedSecurityMap.set(sec.schemeName, {
            name: sec.schemeName,
            reason: `Secures dependent endpoint ${ep.method.toUpperCase()} ${ep.path}`,
          });
        }
      }
    }

    // Compile reasons
    if (returningEndpoints.length > 0) {
      reasons.push(`Returned by ${returningEndpoints.length} endpoint(s): ${returningEndpoints.map((e) => `${e.method} ${e.path}`).join(", ")}`);
    }
    if (consumingEndpoints.length > 0) {
      reasons.push(`Accepted as request body by ${consumingEndpoints.length} endpoint(s): ${consumingEndpoints.map((e) => `${e.method} ${e.path}`).join(", ")}`);
    }
    if (referencingSchemas.length > 0) {
      reasons.push(`Composed/referenced by ${referencingSchemas.length} other schema(s): ${referencingSchemas.map((s) => s.name).join(", ")}`);
    }
    if (schema.references && schema.references.length > 0) {
      reasons.push(`Directly depends on ${schema.references.length} child schema(s): ${schema.references.join(", ")}`);
    }
    if (reasons.length === 0) {
      reasons.push("Unreferenced isolated schema with no endpoint or model consumers.");
    }

    // Determine Impact Level
    const totalConsumerEndpoints = affectedEndpointsMap.size;
    const totalReferencingSchemas = referencingSchemas.length;
    let impactLevel: BlastRadiusImpactLevel = "LOW";

    if (totalConsumerEndpoints > 5 || totalReferencingSchemas > 3) {
      impactLevel = "CRITICAL";
    } else if (totalConsumerEndpoints >= 2 || totalReferencingSchemas >= 1) {
      impactLevel = "HIGH";
    } else if (totalConsumerEndpoints === 1) {
      impactLevel = "MEDIUM";
    } else {
      impactLevel = "LOW";
    }

    const affectedEndpoints = Array.from(affectedEndpointsMap.values());
    const affectedSchemas = Array.from(affectedSchemasMap.values());
    const affectedSecuritySchemes = Array.from(affectedSecurityMap.values());
    const affectedTags = Array.from(affectedTagsSet);

    return {
      target: { type: "schema", id: schemaNodeId },
      targetLabel,
      impactLevel,
      affectedEndpoints,
      affectedSchemas,
      affectedSecuritySchemes,
      affectedTags,
      relationships,
      reasons,
      metrics: {
        totalAffected: affectedEndpoints.length + affectedSchemas.length + affectedSecuritySchemes.length + affectedTags.length,
        endpointsCount: affectedEndpoints.length,
        schemasCount: affectedSchemas.length,
        securityCount: affectedSecuritySchemes.length,
        tagsCount: affectedTags.length,
      },
    };
  }

  // --- 3. Analyze Security Scheme ---
  private analyzeSecurityScheme(model: CanonicalApiModel, target: BlastRadiusTarget): BlastRadiusResult {
    const securitySchemes = model.securitySchemes || [];
    const endpoints = model.endpoints || [];

    const rawId = target.id.trim();
    const schemeName = rawId.startsWith("security:") ? rawId.substring("security:".length) : rawId;

    const securityDef = securitySchemes.find((s) => s.name === schemeName);
    if (!securityDef) {
      throw new ApiError(404, "TARGET_NOT_FOUND", `Security scheme '${target.id}' not found in API model.`);
    }

    const secNodeId = `security:${securityDef.name}`;
    const targetLabel = `Security Scheme: ${securityDef.name}`;

    const affectedEndpointsMap = new Map<string, AffectedEndpoint>();
    const affectedSchemasMap = new Map<string, AffectedSchema>();
    const affectedSecurityMap = new Map<string, AffectedSecurityScheme>();
    const affectedTagsSet = new Set<string>();
    const relationships: BlastRadiusRelationship[] = [];
    const reasons: string[] = [];

    // Find all endpoints protected by this security scheme
    const protectedEndpoints = endpoints.filter((ep) =>
      ep.security?.some((s) => s.schemeName === securityDef.name)
    );

    for (const ep of protectedEndpoints) {
      const epId = `endpoint:${ep.method.toUpperCase()}:${ep.path}`;
      affectedEndpointsMap.set(epId, {
        id: epId,
        path: ep.path,
        method: ep.method.toUpperCase(),
        reason: `Guarded by security scheme '${securityDef.name}'`,
      });
      relationships.push({
        source: epId,
        target: secNodeId,
        type: "SECURED_BY",
        description: `Endpoint requires '${securityDef.name}' authentication`,
      });
      for (const t of ep.tags || []) affectedTagsSet.add(t);

      // Collect schemas behind this security boundary
      if (ep.requestBody?.schemaRef) {
        const sName = this.extractSchemaName(ep.requestBody.schemaRef);
        if (sName && !affectedSchemasMap.has(sName)) {
          affectedSchemasMap.set(sName, {
            name: sName,
            reason: `Request body schema guarded by ${securityDef.name}`,
          });
        }
      }
      for (const res of ep.responses || []) {
        const sName = this.extractSchemaName(res.schemaRef);
        if (sName && !affectedSchemasMap.has(sName)) {
          affectedSchemasMap.set(sName, {
            name: sName,
            reason: `Response schema guarded by ${securityDef.name}`,
          });
        }
      }
    }

    // Compile reasons
    if (protectedEndpoints.length > 0) {
      reasons.push(`Enforces authentication boundary for ${protectedEndpoints.length} endpoint(s): ${protectedEndpoints.map((e) => `${e.method} ${e.path}`).join(", ")}`);
    } else {
      reasons.push("Dormant security scheme: Not referenced by any active endpoint in this specification.");
    }
    if (affectedTagsSet.size > 0) {
      reasons.push(`Covers operations across ${affectedTagsSet.size} functional tag(s): ${Array.from(affectedTagsSet).join(", ")}`);
    }
    if (affectedSchemasMap.size > 0) {
      reasons.push(`Protects data contracts for ${affectedSchemasMap.size} schema(s)`);
    }

    // Determine Impact Level
    const count = protectedEndpoints.length;
    let impactLevel: BlastRadiusImpactLevel = "LOW";

    if (count > 5) {
      impactLevel = "CRITICAL";
    } else if (count >= 2) {
      impactLevel = "HIGH";
    } else if (count === 1) {
      impactLevel = "MEDIUM";
    } else {
      impactLevel = "LOW";
    }

    const affectedEndpoints = Array.from(affectedEndpointsMap.values());
    const affectedSchemas = Array.from(affectedSchemasMap.values());
    const affectedSecuritySchemes = Array.from(affectedSecurityMap.values());
    const affectedTags = Array.from(affectedTagsSet);

    return {
      target: { type: "security", id: secNodeId },
      targetLabel,
      impactLevel,
      affectedEndpoints,
      affectedSchemas,
      affectedSecuritySchemes,
      affectedTags,
      relationships,
      reasons,
      metrics: {
        totalAffected: affectedEndpoints.length + affectedSchemas.length + affectedSecuritySchemes.length + affectedTags.length,
        endpointsCount: affectedEndpoints.length,
        schemasCount: affectedSchemas.length,
        securityCount: affectedSecuritySchemes.length,
        tagsCount: affectedTags.length,
      },
    };
  }
}

export const blastRadiusService = new BlastRadiusService();
