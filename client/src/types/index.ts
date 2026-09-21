export type NavSection =
  | "dashboard"
  | "projects"
  | "project_detail"
  | "version_detail"
  | "evolution"
  | "simulator"
  | "overview"
  | "explorer"
  | "graph"
  | "governance"
  | "diff"
  | "sdk"
  | "settings";

// Auth & User Types (Phase 5)
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Project & Version Types (Phase 5)
export interface Project {
  id: string;
  name: string;
  description?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  versionsCount?: number;
  latestVersion?: {
    id: string;
    version: string;
    openApiVersion: string;
    specType: string;
    endpointsCount: number;
    schemasCount: number;
    createdAt: string;
  } | null;
}

export interface ApiVersionSummary {
  id: string;
  projectId: string;
  name?: string;
  version: string;
  openApiVersion: string;
  specType: string;
  endpointsCount: number;
  schemasCount: number;
  createdAt: string;
}

export interface ApiVersionDetail extends ApiVersionSummary {
  originalSpec: string;
  canonicalModel: CanonicalApiModel;
}

export interface DashboardMetrics {
  projectsCount: number;
  versionsCount: number;
  endpointsCount: number;
  schemasCount: number;
  recentGovernanceScore: number | null;
  recentActivity: Array<{
    id: string;
    type: "version_uploaded" | "governance_run" | "diff_generated";
    title: string;
    description: string;
    timestamp: string;
    projectId: string;
    projectName: string;
  }>;
}

export interface HealthStatus {
  status: "ok" | "error" | "loading";
  service?: string;
  timestamp?: string;
  error?: string;
}

export interface WorkbenchStat {
  label: string;
  value: string | number;
  change?: string;
  description?: string;
}

// Canonical API Model Types
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
  openApiVersion: string;
  specType: "openapi" | "swagger";
}

export interface ApiEndpoint {
  id: string;
  path: string;
  method: string;
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
  contentType: string;
  schemaType?: string;
  schemaRef?: string;
  schema?: Record<string, unknown>;
}

export interface ApiResponse {
  statusCode: string;
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
  type: string;
  description?: string;
  properties: ApiSchemaProperty[];
  required: string[];
  references: string[];
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
  type: string;
  scheme?: string;
  bearerFormat?: string;
  description?: string;
  location?: string;
  flows?: Record<string, unknown>;
}

export interface ParseApiResponse {
  success: boolean;
  data?: CanonicalApiModel;
  error?: string;
  details?: unknown;
}

// Graph Model Types (Phase 3)
export type GraphNodeType = "spec" | "endpoint" | "schema" | "security" | "tag";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  data: Record<string, any>;
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

export interface GraphApiResponse {
  success: boolean;
  data?: GraphModel;
  error?: string;
  details?: unknown;
}

// Governance Types (Phase 4)
export type GovernanceSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface GovernanceFinding {
  id: string;
  ruleId: string;
  severity: GovernanceSeverity;
  title: string;
  description: string;
  category: string;
  targetType: "api" | "endpoint" | "schema" | "security";
  targetId: string;
  remediation?: string;
  patch?: unknown;
}

export interface GovernanceSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface GovernanceReport {
  score: number;
  findings: GovernanceFinding[];
  summary: GovernanceSummary;
  rulesRun: number;
}

export interface GovernanceApiResponse {
  success: boolean;
  data?: GovernanceReport;
  error?: string;
  details?: unknown;
}

// Diff Types (Phase 4)
export type DiffSeverity = "breaking" | "non-breaking" | "info";
export type DiffCategory = "endpoint" | "parameter" | "schema" | "response" | "security" | "metadata";
export type DiffChangeType = "added" | "removed" | "modified";

export interface DiffChange {
  id: string;
  category: DiffCategory;
  changeType: DiffChangeType;
  severity: DiffSeverity;
  path: string;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface DiffSummary {
  totalChanges: number;
  breakingCount: number;
  nonBreakingCount: number;
  infoCount: number;
  hasBreakingChanges: boolean;
}

export interface DiffReport {
  baseVersion: string;
  newVersion: string;
  baseTitle: string;
  newTitle: string;
  summary: DiffSummary;
  changes: DiffChange[];
}

export interface DiffApiResponse {
  success: boolean;
  data?: DiffReport;
  error?: string;
  details?: unknown;
}

// SDK Types (Phase 4)
export interface SdkFile {
  filename: string;
  content: string;
  language: "typescript";
}

export interface GeneratedSdk {
  clientName: string;
  version: string;
  files: SdkFile[];
}

export interface SdkApiResponse {
  success: boolean;
  data?: GeneratedSdk;
  error?: string;
  details?: unknown;
}

// =============================================================================
// Blast-Radius Analysis Types
// =============================================================================

export type BlastRadiusTargetType = "endpoint" | "schema" | "security";

export type BlastRadiusImpactLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface BlastRadiusTarget {
  type: BlastRadiusTargetType;
  id: string;
}

export interface AffectedEndpoint {
  id: string;
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

export interface BlastRadiusApiResponse {
  success: boolean;
  data?: BlastRadiusResult;
  error?: string;
  details?: unknown;
}

// =============================================================================
// What-If API Simulator Types
// =============================================================================

export type WhatIfChangeType =
  | "REMOVE_ENDPOINT"
  | "ADD_ENDPOINT"
  | "REMOVE_AUTHENTICATION"
  | "ADD_AUTHENTICATION"
  | "MAKE_PARAMETER_REQUIRED"
  | "REMOVE_PARAMETER"
  | "REMOVE_RESPONSE_FIELD"
  | "REMOVE_SCHEMA_PROPERTY";

export interface RemoveEndpointChange {
  type: "REMOVE_ENDPOINT";
  path: string;
  method: string;
}

export interface AddEndpointChange {
  type: "ADD_ENDPOINT";
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  responses?: ApiResponse[];
}

export interface RemoveAuthenticationChange {
  type: "REMOVE_AUTHENTICATION";
  path: string;
  method: string;
}

export interface AddAuthenticationChange {
  type: "ADD_AUTHENTICATION";
  path: string;
  method: string;
  securityScheme: string;
  scopes?: string[];
}

export interface MakeParameterRequiredChange {
  type: "MAKE_PARAMETER_REQUIRED";
  path: string;
  method: string;
  parameter: string;
}

export interface RemoveParameterChange {
  type: "REMOVE_PARAMETER";
  path: string;
  method: string;
  parameter: string;
}

export interface RemoveResponseFieldChange {
  type: "REMOVE_RESPONSE_FIELD";
  path: string;
  method: string;
  statusCode: string;
  field: string;
}

export interface RemoveSchemaPropertyChange {
  type: "REMOVE_SCHEMA_PROPERTY";
  schema: string;
  property: string;
}

export type WhatIfChange =
  | RemoveEndpointChange
  | AddEndpointChange
  | RemoveAuthenticationChange
  | AddAuthenticationChange
  | MakeParameterRequiredChange
  | RemoveParameterChange
  | RemoveResponseFieldChange
  | RemoveSchemaPropertyChange;

export interface GovernanceDelta {
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  newFindings: GovernanceFinding[];
  resolvedFindings: GovernanceFinding[];
  allFindings: GovernanceFinding[];
  beforeReport: GovernanceReport;
  afterReport: GovernanceReport;
}

export interface SimulationSummary {
  breakingChangesCount: number;
  nonBreakingChangesCount: number;
  infoChangesCount: number;
  isBreaking: boolean;
  governanceScoreBefore: number;
  governanceScoreAfter: number;
  governanceScoreDelta: number;
  newGovernanceFindingsCount: number;
  resolvedGovernanceFindingsCount: number;
  impactLevel: BlastRadiusImpactLevel;
  affectedEndpointsCount: number;
  affectedSchemasCount: number;
}

export interface SimulationResult {
  simulationId: string;
  originalVersion: string;
  change: WhatIfChange;
  summary: SimulationSummary;
  diff: DiffReport;
  governance: GovernanceDelta;
  blastRadius: BlastRadiusResult;
  simulatedModel: CanonicalApiModel;
  simulatedGraph: GraphModel;
}

export interface SimulationApiResponse {
  success: boolean;
  data?: SimulationResult;
  error?: string;
  details?: unknown;
}

// API Evolution & Decision Timeline (Phase 7)
export interface EvolutionChangeGroup {
  endpoints: string[];
  schemas: string[];
  parameters: string[];
  securitySchemes: string[];
}

export interface EvolutionModifiedGroup {
  endpoints: string[];
  schemas: string[];
  securitySchemes: string[];
}

export interface EvolutionVersionItem {
  id: string;
  name?: string;
  version: string;
  openApiVersion: string;
  specType: "openapi" | "swagger";
  createdAt: string;
  endpointCount: number;
  schemaCount: number;
  securitySchemeCount: number;
  governanceScore: number | null;
  governanceReportId?: string | null;
  changesFromPrevious: {
    breaking: number;
    nonBreaking: number;
    info: number;
  } | null;
}

export interface EvolutionTransitionMetrics {
  endpointGrowth: number;
  schemaGrowth: number;
  securityGrowth: number;
  breakingChangesCount: number;
  nonBreakingChangesCount: number;
  infoChangesCount: number;
  governanceScoreBefore: number | null;
  governanceScoreAfter: number | null;
  governanceScoreDelta: number | null;
}

export interface EvolutionTransition {
  fromVersionId: string;
  fromVersion: string;
  toVersionId: string;
  toVersion: string;
  metrics: EvolutionTransitionMetrics;
  summary: {
    added: EvolutionChangeGroup;
    removed: EvolutionChangeGroup;
    modified: EvolutionModifiedGroup;
    breaking: DiffChange[];
  };
  diffReport: DiffReport;
}

export interface ProjectEvolutionReport {
  project: {
    id: string;
    name: string;
    description?: string;
  };
  versions: EvolutionVersionItem[];
  transitions: EvolutionTransition[];
  summary: {
    totalVersions: number;
    initialVersion: string | null;
    currentVersion: string | null;
    totalEndpointsGrowth: number;
    totalSchemasGrowth: number;
    totalBreakingChangesAcrossHistory: number;
  };
}

export interface DemoDataResponse {
  project: Project;
  version: ApiVersionDetail;
  canonicalModel: CanonicalApiModel;
  graph: GraphModel;
  governance: GovernanceReport;
  evolution: ProjectEvolutionReport;
  baseV1Model?: CanonicalApiModel;
}