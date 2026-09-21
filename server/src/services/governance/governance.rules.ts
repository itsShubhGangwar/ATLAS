import { CanonicalApiModel } from "../parser/canonical-model";
import { GovernanceRule, GovernanceFinding } from "./governance.types";

const SENSITIVE_PATTERN = /^(password|passwd|secret|token|api_?key|ssn)$/i;
const PAGINATION_PARAM_NAMES = new Set(["limit", "pagesize", "page_size", "offset"]);

/**
 * Rule 1: Detect endpoints with no security requirements
 */
export const publicEndpointRule: GovernanceRule = {
  id: "gov-public-endpoint",
  name: "Public Endpoint Detection",
  description: "Detects endpoints that have no authentication requirements defined in the specification.",
  severity: "medium",
  category: "Security",
  evaluate(model: CanonicalApiModel): GovernanceFinding[] {
    const findings: GovernanceFinding[] = [];
    const endpoints = Array.isArray(model.endpoints) ? model.endpoints : [];

    for (const ep of endpoints) {
      if (!ep.security || ep.security.length === 0) {
        findings.push({
          id: `finding:public-endpoint:${ep.method}:${ep.path}`,
          ruleId: "gov-public-endpoint",
          severity: "medium",
          title: "Public endpoint",
          description: `Endpoint ${ep.method} ${ep.path} has no security requirements defined in the API specification and is publicly accessible.`,
          category: "Security",
          targetType: "endpoint",
          targetId: `${ep.method} ${ep.path}`,
          remediation: "Review whether this endpoint should require authentication (e.g. Bearer JWT, API Key) or if it is intentionally public.",
        });
      }
    }

    return findings;
  },
};

/**
 * Rule 2: Detect endpoints missing an operationId
 */
export const missingOperationIdRule: GovernanceRule = {
  id: "gov-missing-operation-id",
  name: "Missing Operation ID",
  description: "Detects endpoints that do not define a unique operationId.",
  severity: "low",
  category: "Design",
  evaluate(model: CanonicalApiModel): GovernanceFinding[] {
    const findings: GovernanceFinding[] = [];
    const endpoints = Array.isArray(model.endpoints) ? model.endpoints : [];

    for (const ep of endpoints) {
      if (!ep.operationId || !ep.operationId.trim()) {
        findings.push({
          id: `finding:missing-op-id:${ep.method}:${ep.path}`,
          ruleId: "gov-missing-operation-id",
          severity: "low",
          title: "Missing operationId",
          description: `Endpoint ${ep.method} ${ep.path} does not declare an operationId.`,
          category: "Design",
          targetType: "endpoint",
          targetId: `${ep.method} ${ep.path}`,
          remediation: "Add a unique and descriptive operationId for clearer API documentation and typed SDK method generation.",
        });
      }
    }

    return findings;
  },
};

/**
 * Rule 3: Detect responses missing a description
 */
export const missingResponseDescriptionRule: GovernanceRule = {
  id: "gov-missing-response-description",
  name: "Missing Response Description",
  description: "Detects responses where the description is missing, empty, or whitespace.",
  severity: "low",
  category: "Documentation",
  evaluate(model: CanonicalApiModel): GovernanceFinding[] {
    const findings: GovernanceFinding[] = [];
    const endpoints = Array.isArray(model.endpoints) ? model.endpoints : [];

    for (const ep of endpoints) {
      const responses = Array.isArray(ep.responses) ? ep.responses : [];
      for (const resp of responses) {
        if (!resp.description || !resp.description.trim()) {
          findings.push({
            id: `finding:missing-resp-desc:${ep.method}:${ep.path}:${resp.statusCode}`,
            ruleId: "gov-missing-response-description",
            severity: "low",
            title: "Missing response description",
            description: `Response status ${resp.statusCode} on ${ep.method} ${ep.path} has an empty or missing description.`,
            category: "Documentation",
            targetType: "endpoint",
            targetId: `${ep.method} ${ep.path} [${resp.statusCode}]`,
            remediation: "Provide a clear description explaining the condition under which this HTTP status is returned.",
          });
        }
      }
    }

    return findings;
  },
};

/**
 * Rule 4: Unbounded array or pagination query parameters
 */
export const unboundedPaginationRule: GovernanceRule = {
  id: "gov-unbounded-pagination",
  name: "Unbounded Pagination Parameter",
  description: "Detects common pagination parameters without a maximum constraint in their schema.",
  severity: "medium",
  category: "Performance",
  evaluate(model: CanonicalApiModel): GovernanceFinding[] {
    const findings: GovernanceFinding[] = [];
    const endpoints = Array.isArray(model.endpoints) ? model.endpoints : [];

    for (const ep of endpoints) {
      const params = Array.isArray(ep.parameters) ? ep.parameters : [];
      for (const param of params) {
        if (param.location === "query" && PAGINATION_PARAM_NAMES.has(param.name.toLowerCase())) {
          const schema = param.schema || {};
          const max = (schema as any).maximum ?? (schema as any).max;
          if (max === undefined || max === null) {
            findings.push({
              id: `finding:unbounded-param:${ep.method}:${ep.path}:${param.name}`,
              ruleId: "gov-unbounded-pagination",
              severity: "medium",
              title: "Unbounded pagination parameter",
              description: `Pagination query parameter '${param.name}' on ${ep.method} ${ep.path} does not specify a maximum value limit.`,
              category: "Performance",
              targetType: "endpoint",
              targetId: `${ep.method} ${ep.path} (?${param.name})`,
              remediation: "Define an integer 'maximum' constraint in the parameter schema (e.g. maximum: 100) to protect database resources from excessive batch queries.",
            });
          }
        }
      }
    }

    return findings;
  },
};

/**
 * Rule 5: Detect sensitive-looking field names in schemas
 */
export const sensitiveFieldsRule: GovernanceRule = {
  id: "gov-sensitive-fields",
  name: "Sensitive Field Name Detection",
  description: "Detects schema property names containing sensitive keywords such as password, secret, token, or apiKey.",
  severity: "medium",
  category: "Data Protection",
  evaluate(model: CanonicalApiModel): GovernanceFinding[] {
    const findings: GovernanceFinding[] = [];
    const schemas = Array.isArray(model.schemas) ? model.schemas : [];

    for (const schema of schemas) {
      const properties = Array.isArray(schema.properties) ? schema.properties : [];
      for (const prop of properties) {
        if (SENSITIVE_PATTERN.test(prop.name.trim())) {
          findings.push({
            id: `finding:sensitive-field:${schema.name}:${prop.name}`,
            ruleId: "gov-sensitive-fields",
            severity: "medium",
            title: "Sensitive field identifier detected",
            description: `Schema '${schema.name}' contains property '${prop.name}' which matches a sensitive credential identifier.`,
            category: "Data Protection",
            targetType: "schema",
            targetId: `${schema.name}.${prop.name}`,
            remediation: "Verify that credentials, tokens, or personal identifiers are not exposed in plaintext in read responses or serialized log streams.",
          });
        }
      }
    }

    return findings;
  },
};

/**
 * Rule 6: Detect HTTP Basic authentication
 */
export const httpBasicAuthRule: GovernanceRule = {
  id: "gov-http-basic-auth",
  name: "HTTP Basic Authentication Detection",
  description: "Detects security schemes using HTTP Basic authentication.",
  severity: "medium",
  category: "Security",
  evaluate(model: CanonicalApiModel): GovernanceFinding[] {
    const findings: GovernanceFinding[] = [];
    const securitySchemes = Array.isArray(model.securitySchemes) ? model.securitySchemes : [];

    for (const sec of securitySchemes) {
      const isBasic =
        sec.type === "basic" ||
        (sec.type === "http" && typeof sec.scheme === "string" && sec.scheme.toLowerCase() === "basic");

      if (isBasic) {
        findings.push({
          id: `finding:http-basic-auth:${sec.name}`,
          ruleId: "gov-http-basic-auth",
          severity: "medium",
          title: "HTTP Basic authentication in use",
          description: `Security scheme '${sec.name}' utilizes HTTP Basic authentication.`,
          category: "Security",
          targetType: "security",
          targetId: `security:${sec.name}`,
          remediation: "HTTP Basic transmits credentials in base64. Ensure TLS/HTTPS is strictly enforced across all environments, and consider upgrading to Bearer JWT or OAuth2.",
        });
      }
    }

    return findings;
  },
};

/**
 * Rule 7: Detect missing or weak API metadata
 */
export const missingApiMetadataRule: GovernanceRule = {
  id: "gov-missing-api-metadata",
  name: "Missing API Metadata",
  description: "Detects missing or weak API metadata (title, description, or version).",
  severity: "low",
  category: "Metadata",
  evaluate(model: CanonicalApiModel): GovernanceFinding[] {
    const findings: GovernanceFinding[] = [];
    const metadata = model.metadata || { title: "", version: "" };

    const isUntitled = !metadata.title || metadata.title.trim() === "" || metadata.title.toLowerCase() === "untitled api";
    const isMissingDesc = !metadata.description || metadata.description.trim() === "";

    if (isUntitled || isMissingDesc) {
      findings.push({
        id: "finding:missing-metadata:api",
        ruleId: "gov-missing-api-metadata",
        severity: "low",
        title: "Missing or incomplete API metadata",
        description: isUntitled
          ? "API specification info object does not specify a descriptive title."
          : "API specification info object is missing a high-level description.",
        category: "Metadata",
        targetType: "api",
        targetId: "spec:metadata",
        remediation: "Provide a descriptive title, overview documentation, and semantic versioning in the API specification metadata.",
      });
    }

    return findings;
  },
};

/**
 * Rule 8: Detect empty schema descriptions
 */
export const emptySchemaDescriptionRule: GovernanceRule = {
  id: "gov-empty-schema-description",
  name: "Empty Schema Description",
  description: "Detects schemas where the description property is missing or empty.",
  severity: "low",
  category: "Documentation",
  evaluate(model: CanonicalApiModel): GovernanceFinding[] {
    const findings: GovernanceFinding[] = [];
    const schemas = Array.isArray(model.schemas) ? model.schemas : [];

    for (const schema of schemas) {
      if (!schema.description || !schema.description.trim()) {
        findings.push({
          id: `finding:empty-schema-desc:${schema.name}`,
          ruleId: "gov-empty-schema-description",
          severity: "low",
          title: "Empty schema description",
          description: `Schema '${schema.name}' does not provide a description.`,
          category: "Documentation",
          targetType: "schema",
          targetId: `schema:${schema.name}`,
          remediation: "Add an informative description for the schema explaining its domain entity purpose and usage in request/response bodies.",
        });
      }
    }

    return findings;
  },
};

export const DEFAULT_GOVERNANCE_RULES: GovernanceRule[] = [
  publicEndpointRule,
  missingOperationIdRule,
  missingResponseDescriptionRule,
  unboundedPaginationRule,
  sensitiveFieldsRule,
  httpBasicAuthRule,
  missingApiMetadataRule,
  emptySchemaDescriptionRule,
];