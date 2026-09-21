import YAML from "yaml";
import { DetectedSpecVersion } from "./parser.types";

/**
 * Safely parses raw text as YAML or JSON.
 * Since YAML 1.2 is a superset of JSON, YAML.parse parses both formats safely.
 */
export const safeParseYamlOrJson = (rawContent: string): { doc: any; error?: string } => {
  if (!rawContent || typeof rawContent !== "string" || !rawContent.trim()) {
    return { doc: null, error: "Specification content is empty." };
  }

  try {
    const doc = YAML.parse(rawContent, {
      maxAliasCount: 100, // Avoid billion laughs denial-of-service
      merge: false,
    });

    if (!doc || typeof doc !== "object") {
      return { doc: null, error: "Parsed document must be a valid JSON or YAML object." };
    }

    return { doc };
  } catch (err: any) {
    return { doc: null, error: `Syntax error while parsing YAML/JSON: ${err.message}` };
  }
};

/**
 * Detects whether the parsed document is an OpenAPI (3.0/3.1) or Swagger 2.0 specification.
 */
export const detectSpecVersion = (doc: any): DetectedSpecVersion | null => {
  if (!doc || typeof doc !== "object") return null;

  if (typeof doc.openapi === "string") {
    const version = doc.openapi.trim();
    if (version.startsWith("3.0") || version.startsWith("3.1")) {
      return { version, specType: "openapi" };
    }
  }

  if (typeof doc.swagger === "string") {
    const version = doc.swagger.trim();
    if (version === "2.0") {
      return { version, specType: "swagger" };
    }
  }

  return null;
};

/**
 * Extracts schema name from an internal reference string.
 * Example: "#/components/schemas/User" -> "User"
 * Example: "#/definitions/User" -> "User"
 */
export const extractRefName = (ref: string): string => {
  if (!ref || typeof ref !== "string") return "";
  const parts = ref.split("/");
  return parts[parts.length - 1] || ref;
};

/**
 * Generates a stable unique ID for an endpoint.
 */
export const generateEndpointId = (
  method: string,
  path: string,
  operationId?: string
): string => {
  if (operationId && operationId.trim()) {
    return operationId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-");
  }

  const cleanPath = path
    .replace(/\{([^}]+)\}/g, "by-$1")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${method.toLowerCase()}-${cleanPath || "root"}`;
};

/**
 * Recursively extracts all referenced schema names ($ref) within a raw schema object.
 */
export const findSchemaReferences = (obj: any): string[] => {
  const refs: Set<string> = new Set();

  const traverse = (node: any) => {
    if (!node || typeof node !== "object") return;

    if (typeof node.$ref === "string") {
      const name = extractRefName(node.$ref);
      if (name) refs.add(name);
    }

    if (Array.isArray(node)) {
      for (const item of node) traverse(item);
    } else {
      for (const key of Object.keys(node)) {
        traverse(node[key]);
      }
    }
  };

  traverse(obj);
  return Array.from(refs);
};