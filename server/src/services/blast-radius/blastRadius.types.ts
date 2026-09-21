export type BlastRadiusTargetType = "endpoint" | "schema" | "security";

export type BlastRadiusImpactLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface BlastRadiusTarget {
  type: BlastRadiusTargetType;
  id: string; // e.g. "endpoint:GET:/users/{id}" or "GET /users/{id}" or "schema:User" or "security:BearerAuth"
}

export interface AffectedEndpoint {
  id: string; // canonical endpoint id, e.g. "endpoint:GET:/users/{id}"
  path: string;
  method: string;
  reason: string;
}

export interface AffectedSchema {
  name: string;
  reason: string;
  type?: string;
}

export interface AffectedSecurityScheme {
  name: string;
  reason: string;
  type?: string;
}

export interface BlastRadiusRelationship {
  source: string;
  target: string;
  type: "CONTAINS" | "RETURNS" | "REQUEST_BODY" | "SECURED_BY" | "USES_SCHEMA" | "SHARED_SCHEMA" | "TAGGED_WITH";
  description: string;
}

export interface BlastRadiusResult {
  target: BlastRadiusTarget;
  targetLabel: string;
  impactLevel: BlastRadiusImpactLevel;
  affectedEndpoints: AffectedEndpoint[];
  affectedSchemas: AffectedSchema[];
  affectedSecuritySchemes: AffectedSecurityScheme[];
  affectedTags: string[];
  relationships: BlastRadiusRelationship[];
  reasons: string[];
  metrics: {
    totalAffected: number;
    endpointsCount: number;
    schemasCount: number;
    securityCount: number;
    tagsCount: number;
  };
}
