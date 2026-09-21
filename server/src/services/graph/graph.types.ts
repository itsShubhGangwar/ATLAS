/**
 * Graph Model Type Definitions for ATLAS API Knowledge Graph
 */

export type GraphNodeType = "spec" | "endpoint" | "schema" | "security" | "tag";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  data: Record<string, unknown>;
}

export type GraphEdgeType =
  | "CONTAINS"
  | "RETURNS"
  | "REQUEST_BODY"
  | "SECURED_BY"
  | "USES_SCHEMA"
  | "TAGGED_WITH";

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  label?: string;
}

export interface GraphStats {
  nodes: number;
  edges: number;
  endpoints: number;
  schemas: number;
  securitySchemes: number;
  tags: number;
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: GraphStats;
}