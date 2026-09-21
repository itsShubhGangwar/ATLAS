/**
 * Canonical API Model for ATLAS
 *
 * This representation is independent from external OpenAPI / Swagger formats
 * and serves as the single source of truth for:
 * - Interactive Knowledge Graph
 * - Security & Governance Rule Engine
 * - API Diff & Breaking Change Detection
 * - SDK Code Generators
 */

export interface CanonicalApiModel {
  metadata: ApiMetadata;
  endpoints: ApiEndpoint[];
  schemas: ApiSchema[];
  securitySchemes: ApiSecurityScheme[];
}

export interface ApiMetadata {
  title: string;
  description?: string;
  version: string;
  openApiVersion: string; // e.g. "3.0.0", "3.1.0", "2.0"
  specType: "openapi" | "swagger";
}

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | "TRACE";

export interface ApiEndpoint {
  id: string; // Unique identifier (e.g., "get-users" or "post-users")
  path: string; // URL path (e.g., "/users/{id}")
  method: HttpMethod;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
  security: ApiEndpointSecurity[];
}

export interface ApiParameter {
  name: string;
  location: "path" | "query" | "header" | "cookie";
  required: boolean;
  description?: string;
  schemaType?: string;
  schema?: Record<string, unknown>;
}

export interface ApiRequestBody {
  description?: string;
  required: boolean;
  contentType: string; // e.g., "application/json"
  schemaType?: string;
  schemaRef?: string; // e.g., "#/components/schemas/CreateUserRequest"
  schema?: Record<string, unknown>;
}

export interface ApiResponse {
  statusCode: string; // e.g., "200", "201", "400", "default"
  description: string;
  contentType?: string;
  schemaRef?: string;
  schemaType?: string;
  schema?: Record<string, unknown>;
}

export interface ApiEndpointSecurity {
  schemeName: string;
  scopes: string[];
}

export interface ApiSchema {
  name: string;
  type: string; // e.g., "object", "array", "string", "number"
  description?: string;
  properties: ApiSchemaProperty[];
  required: string[];
  references: string[]; // List of schema names referenced by this schema
  rawSchema?: Record<string, unknown>;
}

export interface ApiSchemaProperty {
  name: string;
  type: string;
  description?: string;
  format?: string;
  required: boolean;
  reference?: string;
  itemsType?: string;
}

export interface ApiSecurityScheme {
  name: string;
  type: "apiKey" | "http" | "oauth2" | "openIdConnect" | "basic";
  scheme?: string; // e.g., "bearer", "basic"
  bearerFormat?: string; // e.g., "JWT"
  description?: string;
  location?: "header" | "query" | "cookie"; // For apiKey
  flows?: Record<string, unknown>; // For oauth2
}