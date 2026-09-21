import {
  CanonicalApiModel,
  ApiEndpoint,
  ApiSchema,
  ApiSecurityScheme,
  ApiParameter,
  ApiResponse,
} from "../parser/canonical-model";
import { DiffChange, DiffReport, DiffSummary } from "./diff.types";

export class DiffEngine {
  /**
   * Compare two Canonical API Models and return a detailed DiffReport
   */
  public compare(baseModel: CanonicalApiModel, newModel: CanonicalApiModel): DiffReport {
    const changes: DiffChange[] = [];
    let changeIndex = 0;

    const addChange = (change: Omit<DiffChange, "id">) => {
      changeIndex += 1;
      changes.push({
        id: `diff-${change.category}-${change.changeType}-${changeIndex}`,
        ...change,
      });
    };

    // 1. Compare Metadata
    this.compareMetadata(baseModel, newModel, addChange);

    // 2. Compare Endpoints
    this.compareEndpoints(baseModel.endpoints || [], newModel.endpoints || [], addChange);

    // 3. Compare Schemas
    this.compareSchemas(baseModel.schemas || [], newModel.schemas || [], addChange);

    // 4. Compare Security Schemes
    this.compareSecuritySchemes(
      baseModel.securitySchemes || [],
      newModel.securitySchemes || [],
      addChange
    );

    const breakingCount = changes.filter((c) => c.severity === "breaking").length;
    const nonBreakingCount = changes.filter((c) => c.severity === "non-breaking").length;
    const infoCount = changes.filter((c) => c.severity === "info").length;

    const summary: DiffSummary = {
      totalChanges: changes.length,
      breakingCount,
      nonBreakingCount,
      infoCount,
      hasBreakingChanges: breakingCount > 0,
    };

    return {
      baseVersion: baseModel.metadata?.version || "unknown",
      newVersion: newModel.metadata?.version || "unknown",
      baseTitle: baseModel.metadata?.title || "API",
      newTitle: newModel.metadata?.title || "API",
      summary,
      changes,
    };
  }

  private compareMetadata(
    baseModel: CanonicalApiModel,
    newModel: CanonicalApiModel,
    addChange: (c: Omit<DiffChange, "id">) => void
  ): void {
    const baseMeta = baseModel.metadata;
    const newMeta = newModel.metadata;

    if (!baseMeta && !newMeta) return;

    if (baseMeta?.title !== newMeta?.title) {
      addChange({
        category: "metadata",
        changeType: "modified",
        severity: "info",
        path: "metadata.title",
        description: `API title changed from "${baseMeta?.title}" to "${newMeta?.title}".`,
        oldValue: baseMeta?.title,
        newValue: newMeta?.title,
      });
    }

    if (baseMeta?.version !== newMeta?.version) {
      addChange({
        category: "metadata",
        changeType: "modified",
        severity: "info",
        path: "metadata.version",
        description: `API version changed from "${baseMeta?.version}" to "${newMeta?.version}".`,
        oldValue: baseMeta?.version,
        newValue: newMeta?.version,
      });
    }

    if (baseMeta?.description !== newMeta?.description) {
      addChange({
        category: "metadata",
        changeType: "modified",
        severity: "info",
        path: "metadata.description",
        description: `API description was updated.`,
        oldValue: baseMeta?.description,
        newValue: newMeta?.description,
      });
    }
  }

  private compareEndpoints(
    baseEndpoints: ApiEndpoint[],
    newEndpoints: ApiEndpoint[],
    addChange: (c: Omit<DiffChange, "id">) => void
  ): void {
    const baseMap = new Map<string, ApiEndpoint>();
    const newMap = new Map<string, ApiEndpoint>();

    for (const ep of baseEndpoints) {
      baseMap.set(`${ep.method.toUpperCase()} ${ep.path}`, ep);
    }
    for (const ep of newEndpoints) {
      newMap.set(`${ep.method.toUpperCase()} ${ep.path}`, ep);
    }

    // Check for removed endpoints (BREAKING)
    for (const [key, baseEp] of baseMap.entries()) {
      if (!newMap.has(key)) {
        addChange({
          category: "endpoint",
          changeType: "removed",
          severity: "breaking",
          path: `paths.${baseEp.path}.${baseEp.method.toLowerCase()}`,
          description: `Endpoint ${key} was removed. Existing client integrations will break.`,
          oldValue: key,
        });
      }
    }

    // Check for added endpoints (NON-BREAKING)
    for (const [key, newEp] of newMap.entries()) {
      if (!baseMap.has(key)) {
        addChange({
          category: "endpoint",
          changeType: "added",
          severity: "non-breaking",
          path: `paths.${newEp.path}.${newEp.method.toLowerCase()}`,
          description: `New endpoint ${key} was added.`,
          newValue: key,
        });
      }
    }

    // Compare common endpoints
    for (const [key, baseEp] of baseMap.entries()) {
      const newEp = newMap.get(key);
      if (!newEp) continue;

      const endpointPath = `paths.${baseEp.path}.${baseEp.method.toLowerCase()}`;

      // Metadata diff
      if (baseEp.summary !== newEp.summary) {
        addChange({
          category: "endpoint",
          changeType: "modified",
          severity: "info",
          path: `${endpointPath}.summary`,
          description: `Summary for ${key} was modified.`,
          oldValue: baseEp.summary,
          newValue: newEp.summary,
        });
      }

      // Compare Parameters
      this.compareParameters(endpointPath, key, baseEp.parameters || [], newEp.parameters || [], addChange);

      // Compare Request Body
      this.compareRequestBody(endpointPath, key, baseEp, newEp, addChange);

      // Compare Responses
      this.compareResponses(endpointPath, key, baseEp.responses || [], newEp.responses || [], addChange);

      // Compare Security bindings
      this.compareEndpointSecurity(endpointPath, key, baseEp, newEp, addChange);
    }
  }

  private compareParameters(
    endpointPath: string,
    endpointKey: string,
    baseParams: ApiParameter[],
    newParams: ApiParameter[],
    addChange: (c: Omit<DiffChange, "id">) => void
  ): void {
    const baseMap = new Map<string, ApiParameter>();
    const newMap = new Map<string, ApiParameter>();

    for (const p of baseParams) {
      baseMap.set(`${p.location}:${p.name}`, p);
    }
    for (const p of newParams) {
      newMap.set(`${p.location}:${p.name}`, p);
    }

    // Removed parameters
    for (const [key, baseParam] of baseMap.entries()) {
      if (!newMap.has(key)) {
        const isBreaking = baseParam.required;
        addChange({
          category: "parameter",
          changeType: "removed",
          severity: isBreaking ? "breaking" : "non-breaking",
          path: `${endpointPath}.parameters.${baseParam.name}`,
          description: `${baseParam.required ? "Required" : "Optional"} parameter '${baseParam.name}' in ${baseParam.location} was removed from ${endpointKey}.`,
          oldValue: baseParam,
        });
      }
    }

    // Added parameters
    for (const [key, newParam] of newMap.entries()) {
      if (!baseMap.has(key)) {
        const isBreaking = newParam.required;
        addChange({
          category: "parameter",
          changeType: "added",
          severity: isBreaking ? "breaking" : "non-breaking",
          path: `${endpointPath}.parameters.${newParam.name}`,
          description: `New ${newParam.required ? "REQUIRED" : "optional"} parameter '${newParam.name}' in ${newParam.location} was added to ${endpointKey}.`,
          newValue: newParam,
        });
      }
    }

    // Common parameters
    for (const [key, baseParam] of baseMap.entries()) {
      const newParam = newMap.get(key);
      if (!newParam) continue;

      const paramPath = `${endpointPath}.parameters.${baseParam.name}`;

      // Parameter made required
      if (!baseParam.required && newParam.required) {
        addChange({
          category: "parameter",
          changeType: "modified",
          severity: "breaking",
          path: `${paramPath}.required`,
          description: `Parameter '${baseParam.name}' in ${baseParam.location} was changed from optional to required in ${endpointKey}.`,
          oldValue: false,
          newValue: true,
        });
      } else if (baseParam.required && !newParam.required) {
        addChange({
          category: "parameter",
          changeType: "modified",
          severity: "non-breaking",
          path: `${paramPath}.required`,
          description: `Parameter '${baseParam.name}' in ${baseParam.location} was relaxed from required to optional in ${endpointKey}.`,
          oldValue: true,
          newValue: false,
        });
      }

      // Schema type changed
      if (baseParam.schemaType && newParam.schemaType && baseParam.schemaType !== newParam.schemaType) {
        addChange({
          category: "parameter",
          changeType: "modified",
          severity: "breaking",
          path: `${paramPath}.schemaType`,
          description: `Parameter '${baseParam.name}' type changed from ${baseParam.schemaType} to ${newParam.schemaType} in ${endpointKey}.`,
          oldValue: baseParam.schemaType,
          newValue: newParam.schemaType,
        });
      }
    }
  }

  private compareRequestBody(
    endpointPath: string,
    endpointKey: string,
    baseEp: ApiEndpoint,
    newEp: ApiEndpoint,
    addChange: (c: Omit<DiffChange, "id">) => void
  ): void {
    const baseRb = baseEp.requestBody;
    const newRb = newEp.requestBody;

    if (!baseRb && newRb) {
      addChange({
        category: "endpoint",
        changeType: "added",
        severity: newRb.required ? "breaking" : "non-breaking",
        path: `${endpointPath}.requestBody`,
        description: `Endpoint ${endpointKey} now accepts a ${newRb.required ? "REQUIRED" : "optional"} request body.`,
        newValue: newRb,
      });
      return;
    }

    if (baseRb && !newRb) {
      addChange({
        category: "endpoint",
        changeType: "removed",
        severity: "non-breaking",
        path: `${endpointPath}.requestBody`,
        description: `Request body was removed from endpoint ${endpointKey}.`,
        oldValue: baseRb,
      });
      return;
    }

    if (baseRb && newRb) {
      if (!baseRb.required && newRb.required) {
        addChange({
          category: "endpoint",
          changeType: "modified",
          severity: "breaking",
          path: `${endpointPath}.requestBody.required`,
          description: `Request body in ${endpointKey} changed from optional to required.`,
          oldValue: false,
          newValue: true,
        });
      }

      if (baseRb.contentType !== newRb.contentType) {
        addChange({
          category: "endpoint",
          changeType: "modified",
          severity: "breaking",
          path: `${endpointPath}.requestBody.contentType`,
          description: `Request body content type changed from '${baseRb.contentType}' to '${newRb.contentType}' in ${endpointKey}.`,
          oldValue: baseRb.contentType,
          newValue: newRb.contentType,
        });
      }

      if (baseRb.schemaRef && newRb.schemaRef && baseRb.schemaRef !== newRb.schemaRef) {
        addChange({
          category: "endpoint",
          changeType: "modified",
          severity: "breaking",
          path: `${endpointPath}.requestBody.schemaRef`,
          description: `Request body schema reference changed from '${baseRb.schemaRef}' to '${newRb.schemaRef}' in ${endpointKey}.`,
          oldValue: baseRb.schemaRef,
          newValue: newRb.schemaRef,
        });
      }
    }
  }

  private compareResponses(
    endpointPath: string,
    endpointKey: string,
    baseResponses: ApiResponse[],
    newResponses: ApiResponse[],
    addChange: (c: Omit<DiffChange, "id">) => void
  ): void {
    const baseMap = new Map<string, ApiResponse>();
    const newMap = new Map<string, ApiResponse>();

    for (const r of baseResponses) {
      baseMap.set(r.statusCode, r);
    }
    for (const r of newResponses) {
      newMap.set(r.statusCode, r);
    }

    // Removed responses
    for (const [statusCode, baseRes] of baseMap.entries()) {
      if (!newMap.has(statusCode)) {
        addChange({
          category: "response",
          changeType: "removed",
          severity: "breaking",
          path: `${endpointPath}.responses.${statusCode}`,
          description: `Response status '${statusCode}' was removed from ${endpointKey}.`,
          oldValue: baseRes,
        });
      }
    }

    // Added responses
    for (const [statusCode, newRes] of newMap.entries()) {
      if (!baseMap.has(statusCode)) {
        addChange({
          category: "response",
          changeType: "added",
          severity: "non-breaking",
          path: `${endpointPath}.responses.${statusCode}`,
          description: `New response status '${statusCode}' added to ${endpointKey}.`,
          newValue: newRes,
        });
      }
    }

    // Common responses
    for (const [statusCode, baseRes] of baseMap.entries()) {
      const newRes = newMap.get(statusCode);
      if (!newRes) continue;

      if (baseRes.schemaRef && newRes.schemaRef && baseRes.schemaRef !== newRes.schemaRef) {
        addChange({
          category: "response",
          changeType: "modified",
          severity: "breaking",
          path: `${endpointPath}.responses.${statusCode}.schemaRef`,
          description: `Response ${statusCode} schema reference changed from '${baseRes.schemaRef}' to '${newRes.schemaRef}' in ${endpointKey}.`,
          oldValue: baseRes.schemaRef,
          newValue: newRes.schemaRef,
        });
      }
    }
  }

  private compareEndpointSecurity(
    endpointPath: string,
    endpointKey: string,
    baseEp: ApiEndpoint,
    newEp: ApiEndpoint,
    addChange: (c: Omit<DiffChange, "id">) => void
  ): void {
    const baseSchemes = new Set(baseEp.security?.map((s) => s.schemeName) || []);
    const newSchemes = new Set(newEp.security?.map((s) => s.schemeName) || []);

    // Added security scheme requirement on endpoint (BREAKING for clients without token)
    for (const s of newSchemes) {
      if (!baseSchemes.has(s)) {
        addChange({
          category: "security",
          changeType: "added",
          severity: "breaking",
          path: `${endpointPath}.security.${s}`,
          description: `Endpoint ${endpointKey} now requires security scheme '${s}'.`,
          newValue: s,
        });
      }
    }

    // Removed security scheme requirement (NON-BREAKING)
    for (const s of baseSchemes) {
      if (!newSchemes.has(s)) {
        addChange({
          category: "security",
          changeType: "removed",
          severity: "non-breaking",
          path: `${endpointPath}.security.${s}`,
          description: `Endpoint ${endpointKey} no longer requires security scheme '${s}'.`,
          oldValue: s,
        });
      }
    }
  }

  private compareSchemas(
    baseSchemas: ApiSchema[],
    newSchemas: ApiSchema[],
    addChange: (c: Omit<DiffChange, "id">) => void
  ): void {
    const baseMap = new Map<string, ApiSchema>();
    const newMap = new Map<string, ApiSchema>();

    for (const s of baseSchemas) {
      baseMap.set(s.name, s);
    }
    for (const s of newSchemas) {
      newMap.set(s.name, s);
    }

    // Removed schema (BREAKING)
    for (const [name, baseSchema] of baseMap.entries()) {
      if (!newMap.has(name)) {
        addChange({
          category: "schema",
          changeType: "removed",
          severity: "breaking",
          path: `components.schemas.${name}`,
          description: `Schema '${name}' was removed.`,
          oldValue: baseSchema,
        });
      }
    }

    // Added schema (NON-BREAKING)
    for (const [name, newSchema] of newMap.entries()) {
      if (!baseMap.has(name)) {
        addChange({
          category: "schema",
          changeType: "added",
          severity: "non-breaking",
          path: `components.schemas.${name}`,
          description: `New schema '${name}' was added.`,
          newValue: newSchema,
        });
      }
    }

    // Common schemas
    for (const [name, baseSchema] of baseMap.entries()) {
      const newSchema = newMap.get(name);
      if (!newSchema) continue;

      const schemaPath = `components.schemas.${name}`;

      if (baseSchema.type !== newSchema.type) {
        addChange({
          category: "schema",
          changeType: "modified",
          severity: "breaking",
          path: `${schemaPath}.type`,
          description: `Schema '${name}' type changed from '${baseSchema.type}' to '${newSchema.type}'.`,
          oldValue: baseSchema.type,
          newValue: newSchema.type,
        });
      }

      // Compare Properties
      const baseProps = new Map(baseSchema.properties?.map((p) => [p.name, p]) || []);
      const newProps = new Map(newSchema.properties?.map((p) => [p.name, p]) || []);

      // Removed property (BREAKING)
      for (const [propName, baseProp] of baseProps.entries()) {
        if (!newProps.has(propName)) {
          addChange({
            category: "schema",
            changeType: "removed",
            severity: "breaking",
            path: `${schemaPath}.properties.${propName}`,
            description: `Property '${propName}' was removed from schema '${name}'.`,
            oldValue: baseProp,
          });
        }
      }

      // Added property
      for (const [propName, newProp] of newProps.entries()) {
        if (!baseProps.has(propName)) {
          const isRequired = newSchema.required?.includes(propName) || newProp.required;
          addChange({
            category: "schema",
            changeType: "added",
            severity: isRequired ? "breaking" : "non-breaking",
            path: `${schemaPath}.properties.${propName}`,
            description: `New ${isRequired ? "REQUIRED" : "optional"} property '${propName}' was added to schema '${name}'.`,
            newValue: newProp,
          });
        }
      }

      // Common properties
      for (const [propName, baseProp] of baseProps.entries()) {
        const newProp = newProps.get(propName);
        if (!newProp) continue;

        const propPath = `${schemaPath}.properties.${propName}`;
        const wasRequired = baseSchema.required?.includes(propName) || baseProp.required;
        const isNowRequired = newSchema.required?.includes(propName) || newProp.required;

        if (!wasRequired && isNowRequired) {
          addChange({
            category: "schema",
            changeType: "modified",
            severity: "breaking",
            path: `${propPath}.required`,
            description: `Property '${propName}' in schema '${name}' changed from optional to required.`,
            oldValue: false,
            newValue: true,
          });
        } else if (wasRequired && !isNowRequired) {
          addChange({
            category: "schema",
            changeType: "modified",
            severity: "non-breaking",
            path: `${propPath}.required`,
            description: `Property '${propName}' in schema '${name}' was relaxed from required to optional.`,
            oldValue: true,
            newValue: false,
          });
        }

        if (baseProp.type !== newProp.type) {
          addChange({
            category: "schema",
            changeType: "modified",
            severity: "breaking",
            path: `${propPath}.type`,
            description: `Property '${propName}' in schema '${name}' type changed from '${baseProp.type}' to '${newProp.type}'.`,
            oldValue: baseProp.type,
            newValue: newProp.type,
          });
        }

        if (baseProp.reference && newProp.reference && baseProp.reference !== newProp.reference) {
          addChange({
            category: "schema",
            changeType: "modified",
            severity: "breaking",
            path: `${propPath}.reference`,
            description: `Property '${propName}' in schema '${name}' reference changed from '${baseProp.reference}' to '${newProp.reference}'.`,
            oldValue: baseProp.reference,
            newValue: newProp.reference,
          });
        }
      }
    }
  }

  private compareSecuritySchemes(
    baseSchemes: ApiSecurityScheme[],
    newSchemes: ApiSecurityScheme[],
    addChange: (c: Omit<DiffChange, "id">) => void
  ): void {
    const baseMap = new Map<string, ApiSecurityScheme>();
    const newMap = new Map<string, ApiSecurityScheme>();

    for (const s of baseSchemes) {
      baseMap.set(s.name, s);
    }
    for (const s of newSchemes) {
      newMap.set(s.name, s);
    }

    // Removed security scheme (BREAKING)
    for (const [name, baseScheme] of baseMap.entries()) {
      if (!newMap.has(name)) {
        addChange({
          category: "security",
          changeType: "removed",
          severity: "breaking",
          path: `components.securitySchemes.${name}`,
          description: `Security scheme '${name}' was removed.`,
          oldValue: baseScheme,
        });
      }
    }

    // Added security scheme (NON-BREAKING)
    for (const [name, newScheme] of newMap.entries()) {
      if (!baseMap.has(name)) {
        addChange({
          category: "security",
          changeType: "added",
          severity: "non-breaking",
          path: `components.securitySchemes.${name}`,
          description: `New security scheme '${name}' was added.`,
          newValue: newScheme,
        });
      }
    }

    // Common security schemes
    for (const [name, baseScheme] of baseMap.entries()) {
      const newScheme = newMap.get(name);
      if (!newScheme) continue;

      const secPath = `components.securitySchemes.${name}`;

      if (baseScheme.type !== newScheme.type) {
        addChange({
          category: "security",
          changeType: "modified",
          severity: "breaking",
          path: `${secPath}.type`,
          description: `Security scheme '${name}' type changed from '${baseScheme.type}' to '${newScheme.type}'.`,
          oldValue: baseScheme.type,
          newValue: newScheme.type,
        });
      }

      if (baseScheme.location !== newScheme.location) {
        addChange({
          category: "security",
          changeType: "modified",
          severity: "breaking",
          path: `${secPath}.location`,
          description: `Security scheme '${name}' location changed from '${baseScheme.location}' to '${newScheme.location}'.`,
          oldValue: baseScheme.location,
          newValue: newScheme.location,
        });
      }
    }
  }
}

export const diffEngine = new DiffEngine();
