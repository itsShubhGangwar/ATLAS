import React, { useState, useEffect, useMemo } from "react";
import {
  Zap,
  Layers,
  FileCode,
  UploadCloud,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  GitCompare,
  Network,
  Sparkles,
  Activity,
  Compass,
  Box,
  Lock,
  History,
} from "lucide-react";
import {
  CanonicalApiModel,
  SimulationResult,
  WhatIfChange,
  BlastRadiusResult,
  BlastRadiusTarget,
  DiffChange,
  GovernanceFinding,
  ProjectEvolutionReport,
} from "../types";
import {
  parseOpenApiSpec,
  runSimulationApi,
  analyzeBlastRadiusApi,
  getProjectEvolutionApi,
} from "../services/api";
import { ChangeSelector } from "../components/simulator/ChangeSelector";
import { SimulationSummaryCards } from "../components/simulator/SimulationSummaryCards";
import { BlastRadiusCard } from "../components/simulator/BlastRadiusCard";

interface SimulatorPageProps {
  sharedModel?: CanonicalApiModel | null;
  onModelLoaded?: (model: CanonicalApiModel) => void;
  onNavigateToGraph?: (model: CanonicalApiModel) => void;
  selectedProjectId?: string | null;
  selectedVersionId?: string | null;
}

const SAMPLE_SPEC_YAML = `openapi: 3.0.3
info:
  title: Storefront & Orders API
  description: E-Commerce Storefront service with authentication, orders, inventory and customer schemas.
  version: 2.1.0
paths:
  /orders:
    get:
      operationId: listOrders
      summary: List all user orders
      tags: [Orders]
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of customer orders
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Order'
    post:
      operationId: createOrder
      summary: Place a new order
      tags: [Orders]
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Order'
      responses:
        '201':
          description: Order placed successfully
  /orders/{id}:
    get:
      operationId: getOrderById
      summary: Get order by ID
      tags: [Orders]
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Order details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
    delete:
      operationId: cancelOrder
      summary: Cancel existing order
      tags: [Orders]
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Order cancelled
  /products:
    get:
      operationId: listProducts
      summary: Browse catalog products
      tags: [Catalog]
      security: []
      responses:
        '200':
          description: List of products
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Product'
  /health:
    get:
      operationId: getHealth
      summary: Service health check
      tags: [System]
      responses:
        '200':
          description: Service alive
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    Order:
      type: object
      required: [id, total, status, customer]
      properties:
        id:
          type: string
        total:
          type: number
        status:
          type: string
        customer:
          $ref: '#/components/schemas/Customer'
    Customer:
      type: object
      required: [id, email]
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
    Product:
      type: object
      required: [id, name, price]
      properties:
        id:
          type: string
        name:
          type: string
        price:
          type: number
`;

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
  sharedModel,
  onModelLoaded,
  onNavigateToGraph,
  selectedProjectId,
  selectedVersionId,
}) => {
  // Current active specification model
  const [model, setModel] = useState<CanonicalApiModel | null>(sharedModel || null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Active view tab: "simulation" | "standalone_blast"
  const [activeToolTab, setActiveToolTab] = useState<"simulation" | "standalone_blast">("simulation");

  // Simulation execution state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [resultTab, setResultTab] = useState<"overview" | "diff" | "governance" | "blast" | "topology">("overview");

  // Standalone Blast Radius state
  const [blastTargetType, setBlastTargetType] = useState<"endpoint" | "schema" | "security">("endpoint");
  const [blastTargetId, setBlastTargetId] = useState<string>("");
  const [isAnalyzingBlast, setIsAnalyzingBlast] = useState<boolean>(false);
  const [blastError, setBlastError] = useState<string | null>(null);
  const [standaloneBlastResult, setStandaloneBlastResult] = useState<BlastRadiusResult | null>(null);

  // Historical Precedent from API Evolution (Phase 7)
  const [evolutionReport, setEvolutionReport] = useState<ProjectEvolutionReport | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      setEvolutionReport(null);
      return;
    }
    getProjectEvolutionApi(selectedProjectId).then((res) => {
      if (res.success && res.data) {
        setEvolutionReport(res.data);
      }
    });
  }, [selectedProjectId]);

  const historicalPrecedent = useMemo(() => {
    if (!simulationResult || !evolutionReport) return null;
    const simPaths = new Set(
      simulationResult.diff.changes.map((c) => `${c.category}:${c.changeType}:${c.path}`)
    );
    for (const t of evolutionReport.transitions) {
      for (const tc of t.diffReport.changes) {
        const key = `${tc.category}:${tc.changeType}:${tc.path}`;
        if (simPaths.has(key)) {
          return {
            fromVersion: t.fromVersion,
            toVersion: t.toVersion,
            matchedPath: tc.path,
            category: tc.category,
          };
        }
      }
    }
    return null;
  }, [simulationResult, evolutionReport]);

  // Update local model if sharedModel prop changes
  useEffect(() => {
    if (sharedModel) {
      setModel(sharedModel);
    }
  }, [sharedModel]);

  // Set default blast target ID when model changes or blastTargetType changes
  useEffect(() => {
    if (!model) return;
    if (blastTargetType === "endpoint" && model.endpoints.length > 0) {
      setBlastTargetId(model.endpoints[0].id || `${model.endpoints[0].method.toUpperCase()} ${model.endpoints[0].path}`);
    } else if (blastTargetType === "schema" && model.schemas.length > 0) {
      setBlastTargetId(model.schemas[0].name);
    } else if (blastTargetType === "security" && model.securitySchemes.length > 0) {
      setBlastTargetId(model.securitySchemes[0].name);
    }
  }, [model, blastTargetType]);

  // Load sample model
  const handleLoadSample = async () => {
    setIsParsing(true);
    setParseError(null);
    try {
      const res = await parseOpenApiSpec(SAMPLE_SPEC_YAML);
      if (res.success && res.data) {
        setModel(res.data);
        if (onModelLoaded) onModelLoaded(res.data);
      } else {
        setParseError(res.error || "Failed to load sample specification.");
      }
    } catch (err: any) {
      setParseError(err.message || "Failed to parse sample.");
    } finally {
      setIsParsing(false);
    }
  };

  // Upload file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    try {
      const res = await parseOpenApiSpec(file);
      if (res.success && res.data) {
        setModel(res.data);
        if (onModelLoaded) onModelLoaded(res.data);
      } else {
        setParseError(res.error || "Failed to parse uploaded specification.");
      }
    } catch (err: any) {
      setParseError(err.message || "Error uploading file.");
    } finally {
      setIsParsing(false);
    }
  };

  // Run What-If Simulation
  const handleRunSimulation = async (change: WhatIfChange) => {
    if (!model) return;
    setIsSimulating(true);
    setSimulationError(null);

    try {
      const res = await runSimulationApi({
        model,
        projectId: selectedProjectId || undefined,
        versionId: selectedVersionId || undefined,
        change,
      });

      if (res.success && res.data) {
        setSimulationResult(res.data);
        setResultTab("overview");
      } else {
        setSimulationError(res.error || "Simulation failed.");
      }
    } catch (err: any) {
      setSimulationError(err.message || "An unexpected error occurred during simulation.");
    } finally {
      setIsSimulating(false);
    }
  };

  // Run Standalone Blast Radius
  const handleRunStandaloneBlast = async () => {
    if (!model || !blastTargetId) return;
    setIsAnalyzingBlast(true);
    setBlastError(null);

    try {
      const target: BlastRadiusTarget = {
        type: blastTargetType,
        id: blastTargetId,
      };

      const res = await analyzeBlastRadiusApi({
        model,
        projectId: selectedProjectId || undefined,
        versionId: selectedVersionId || undefined,
        target,
      });

      if (res.success && res.data) {
        setStandaloneBlastResult(res.data);
      } else {
        setBlastError(res.error || "Failed to calculate blast radius.");
      }
    } catch (err: any) {
      setBlastError(err.message || "Unexpected error calculating blast radius.");
    } finally {
      setIsAnalyzingBlast(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-[#111113] border border-[#29292D] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#C98A3D]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#161619] border border-[#29292D] flex items-center justify-center text-[#C98A3D] shadow-sm">
                <Zap className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-[#D8D8DC] font-mono tracking-tight">
                What-If API Simulator & Blast Radius
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#161619] text-[#77777D] border border-[#29292D]">
                Deterministic Engine
              </span>
            </div>
            <p className="text-xs text-[#77777D] mt-2 max-w-3xl leading-relaxed">
              Model API schema changes, removal of endpoints or authentication boundaries, and simulate their
              breaking impact, governance score swings, and topological blast radius in-memory without altering production contracts.
            </p>
          </div>

          {/* Model status or load trigger */}
          <div className="flex items-center space-x-2 shrink-0">
            {model ? (
              <div className="flex items-center space-x-2 bg-[#0B0B0D] border border-[#29292D] px-3.5 py-2 rounded-lg text-xs font-mono">
                <FileCode className="w-3.5 h-3.5 text-[#77777D]" />
                <span className="text-[#D8D8DC] font-semibold truncate max-w-[180px]">
                  {model.metadata?.title || "Active Model"}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#161619] text-[#77777D] border border-[#29292D]">
                  v{model.metadata?.version || "1.0.0"}
                </span>
              </div>
            ) : (
              <button
                onClick={handleLoadSample}
                disabled={isParsing}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-mono font-bold text-[#0B0B0D] transition-colors shadow-sm disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample Storefront API</span>
              </button>
            )}
          </div>
        </div>

        {/* Spec Metrics Sub-bar (if loaded) */}
        {model && (
          <div className="mt-4 pt-4 border-t border-[#29292D] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-[#0B0B0D] p-2.5 rounded-lg border border-[#29292D] flex items-center justify-between">
              <span className="text-[#77777D] text-[10px] uppercase">Endpoints</span>
              <span className="text-[#D8D8DC] font-semibold">{model.endpoints?.length || 0} operations</span>
            </div>
            <div className="bg-[#0B0B0D] p-2.5 rounded-lg border border-[#29292D] flex items-center justify-between">
              <span className="text-[#77777D] text-[10px] uppercase">Schemas</span>
              <span className="text-[#D8D8DC] font-semibold">{model.schemas?.length || 0} types</span>
            </div>
            <div className="bg-[#0B0B0D] p-2.5 rounded-lg border border-[#29292D] flex items-center justify-between">
              <span className="text-[#77777D] text-[10px] uppercase">Security</span>
              <span className="text-[#D8D8DC] font-semibold">{model.securitySchemes?.length || 0} schemes</span>
            </div>
            <div className="bg-[#0B0B0D] p-2.5 rounded-lg border border-[#29292D] flex items-center justify-between">
              <span className="text-[#77777D] text-[10px] uppercase">Safety Guarantee</span>
              <span className="text-[#C98A3D] font-semibold text-[10px]">Zero State Mutation</span>
            </div>
          </div>
        )}
      </div>

      {/* If No Model Loaded: Upload or Sample prompt */}
      {!model && (
        <div className="bg-[#111113] border border-[#29292D] rounded-xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#0B0B0D] border border-[#29292D] flex items-center justify-center mx-auto text-[#77777D]">
            <Layers className="w-6 h-6 text-[#C98A3D]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#D8D8DC]">No OpenAPI Specification Loaded</h3>
            <p className="text-xs text-[#77777D] mt-1 max-w-md mx-auto">
              To run What-If simulations or Blast-Radius analysis, load the sample storefront specification or upload an OpenAPI 2.0/3.0/3.1 document.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleLoadSample}
              disabled={isParsing}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-mono font-bold text-[#0B0B0D] transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Sample Storefront API</span>
            </button>

            <label className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-[#161619] hover:bg-[#202024] text-xs font-mono font-medium text-[#D8D8DC] transition-colors cursor-pointer border border-[#29292D]">
              <UploadCloud className="w-4 h-4" />
              <span>Upload YAML / JSON</span>
              <input
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileUpload}
                disabled={isParsing}
                className="hidden"
              />
            </label>
          </div>

          {parseError && (
            <div className="p-3 rounded-lg bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs max-w-lg mx-auto font-mono">
              {parseError}
            </div>
          )}
        </div>
      )}

      {/* Main Workbench Body when model is available */}
      {model && (
        <div className="space-y-6">
          {/* Navigation Bar for Simulator vs Standalone Blast Radius */}
          <div className="flex border-b border-[#29292D] space-x-4">
            <button
              onClick={() => setActiveToolTab("simulation")}
              className={`pb-3 text-xs font-mono font-semibold transition-colors flex items-center space-x-2 border-b-2 ${
                activeToolTab === "simulation"
                  ? "border-[#C98A3D] text-[#C98A3D]"
                  : "border-transparent text-[#77777D] hover:text-[#D8D8DC]"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>What-If Change Simulator</span>
            </button>

            <button
              onClick={() => setActiveToolTab("standalone_blast")}
              className={`pb-3 text-xs font-mono font-semibold transition-colors flex items-center space-x-2 border-b-2 ${
                activeToolTab === "standalone_blast"
                  ? "border-[#C98A3D] text-[#C98A3D]"
                  : "border-transparent text-[#77777D] hover:text-[#D8D8DC]"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Standalone Blast Radius Explorer</span>
            </button>
          </div>

          {/* TAB 1: WHAT-IF CHANGE SIMULATOR */}
          {activeToolTab === "simulation" && (
            <div className="space-y-6">
              {/* Step 1: Change Selector Form */}
              <ChangeSelector
                model={model}
                onRunSimulation={handleRunSimulation}
                isLoading={isSimulating}
              />

              {simulationError && (
                <div className="p-4 rounded-xl bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs font-mono flex items-center space-x-2">
                  <AlertOctagon className="w-4 h-4 shrink-0 text-[#E06C75]" />
                  <span>{simulationError}</span>
                </div>
              )}

              {/* Step 2: Simulation Results */}
              {simulationResult && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Non-destructive guarantee notice */}
                  <div className="p-4 rounded-xl bg-[#161619] border border-[#29292D] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#0B0B0D] border border-[#29292D] flex items-center justify-center text-[#77777D] shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[#D8D8DC] font-bold block">
                          Simulation Successful — Non-Destructive In-Memory Run
                        </span>
                        <span className="text-[#77777D] text-[11px]">
                          Change evaluated against DiffEngine, GovernanceEngine, and BlastRadius analysis. Your production schema is unaltered.
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-[#0B0B0D] border border-[#29292D] text-[10px] text-[#77777D]">
                        Type: {simulationResult.change.type}
                      </span>
                    </div>
                  </div>

                  {/* Historical Precedent Banner (Phase 7 Correlation) */}
                  {historicalPrecedent && (
                    <div className="p-4 rounded-xl bg-[#161619] border border-[#C98A3D]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-sm">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#0B0B0D] border border-[#C98A3D]/40 flex items-center justify-center text-[#C98A3D] shrink-0">
                          <History className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[#C98A3D] font-bold block">
                            Historical Precedent Correlated
                          </span>
                          <span className="text-[#D8D8DC] text-[11px]">
                            This exact contract mutation occurred previously in this project during the transition from{" "}
                            <span className="text-white font-semibold">v{historicalPrecedent.fromVersion}</span> to{" "}
                            <span className="text-white font-semibold">v{historicalPrecedent.toVersion}</span> ({historicalPrecedent.matchedPath}).
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span className="px-2.5 py-1 rounded bg-[#C98A3D]/15 border border-[#C98A3D]/40 text-[10px] text-[#C98A3D] font-bold uppercase tracking-wider">
                          Verified Historical Drift
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Summary Metric Cards */}
                  <SimulationSummaryCards result={simulationResult} />

                  {/* Sub-Tabs for Deep Inspection */}
                  <div className="bg-[#111113] border border-[#29292D] rounded-xl overflow-hidden">
                    {/* Navigation Tabs */}
                    <div className="px-4 border-b border-[#29292D] flex flex-wrap gap-2 pt-2 bg-[#0B0B0D]">
                      <button
                        onClick={() => setResultTab("overview")}
                        className={`px-3 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                          resultTab === "overview"
                            ? "border-[#C98A3D] text-[#C98A3D] bg-[#111113]"
                            : "border-transparent text-[#77777D] hover:text-[#D8D8DC]"
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Overview & Deltas</span>
                      </button>

                      <button
                        onClick={() => setResultTab("diff")}
                        className={`px-3 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                          resultTab === "diff"
                            ? "border-[#C98A3D] text-[#C98A3D] bg-[#111113]"
                            : "border-transparent text-[#77777D] hover:text-[#D8D8DC]"
                        }`}
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Diff Report ({simulationResult.diff.summary.totalChanges})</span>
                      </button>

                      <button
                        onClick={() => setResultTab("governance")}
                        className={`px-3 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                          resultTab === "governance"
                            ? "border-[#C98A3D] text-[#C98A3D] bg-[#111113]"
                            : "border-transparent text-[#77777D] hover:text-[#D8D8DC]"
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Governance Findings</span>
                      </button>

                      <button
                        onClick={() => setResultTab("blast")}
                        className={`px-3 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                          resultTab === "blast"
                            ? "border-[#C98A3D] text-[#C98A3D] bg-[#111113]"
                            : "border-transparent text-[#77777D] hover:text-[#D8D8DC]"
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Blast Radius Impact</span>
                      </button>

                      <button
                        onClick={() => setResultTab("topology")}
                        className={`px-3 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                          resultTab === "topology"
                            ? "border-[#C98A3D] text-[#C98A3D] bg-[#111113]"
                            : "border-transparent text-[#77777D] hover:text-[#D8D8DC]"
                        }`}
                      >
                        <Network className="w-3.5 h-3.5" />
                        <span>Simulated Topology</span>
                      </button>
                    </div>

                    {/* Tab 1: Overview */}
                    {resultTab === "overview" && (
                      <div className="p-6 space-y-6">
                        {/* Simulation Scope & Change Breakdown */}
                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[#77777D] mb-3 font-semibold">
                            Change Execution Details
                          </h4>
                          <div className="bg-[#0B0B0D] border border-[#29292D] rounded-lg p-4 font-mono text-xs space-y-2">
                            <div className="flex justify-between">
                              <span className="text-[#77777D]">Operation:</span>
                              <span className="text-[#C98A3D] font-bold">{simulationResult.change.type}</span>
                            </div>
                            {simulationResult.change.type !== "ADD_ENDPOINT" &&
                              simulationResult.change.type !== "REMOVE_SCHEMA_PROPERTY" && (
                                <div className="flex justify-between">
                                  <span className="text-[#77777D]">Endpoint:</span>
                                  <span className="text-[#D8D8DC]">
                                    {simulationResult.change.method.toUpperCase()} {simulationResult.change.path}
                                  </span>
                                </div>
                              )}
                            {simulationResult.change.type === "REMOVE_SCHEMA_PROPERTY" && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-[#77777D]">Target Schema:</span>
                                  <span className="text-[#D8D8DC]">{simulationResult.change.schema}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[#77777D]">Property:</span>
                                  <span className="text-[#D8D8DC]">{simulationResult.change.property}</span>
                                </div>
                              </>
                            )}
                            {(simulationResult.change.type === "MAKE_PARAMETER_REQUIRED" ||
                              simulationResult.change.type === "REMOVE_PARAMETER") && (
                              <div className="flex justify-between">
                                <span className="text-[#77777D]">Parameter:</span>
                                <span className="text-[#D8D8DC]">{simulationResult.change.parameter}</span>
                              </div>
                            )}
                            {simulationResult.change.type === "REMOVE_RESPONSE_FIELD" && (
                              <div className="flex justify-between">
                                <span className="text-[#77777D]">Field:</span>
                                <span className="text-[#D8D8DC]">{simulationResult.change.field}</span>
                              </div>
                            )}
                            {simulationResult.change.type === "ADD_AUTHENTICATION" && (
                              <div className="flex justify-between">
                                <span className="text-[#77777D]">Security Scheme:</span>
                                <span className="text-[#C98A3D]">{simulationResult.change.securityScheme}</span>
                              </div>
                            )}
                            {simulationResult.change.type === "ADD_ENDPOINT" && (
                              <div className="flex justify-between">
                                <span className="text-[#77777D]">New Endpoint:</span>
                                <span className="text-[#D8D8DC]">
                                  {simulationResult.change.method.toUpperCase()}{" "}
                                  {simulationResult.change.path}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Blast Radius Preview */}
                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[#77777D] mb-3 font-semibold">
                            Topological Blast Radius Preview
                          </h4>
                          <BlastRadiusCard result={simulationResult.blastRadius} compact={true} />
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Diff Report */}
                    {resultTab === "diff" && (
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[#77777D] font-semibold">
                            Specification Deltas ({simulationResult.diff.changes.length})
                          </h4>
                          <span className="text-xs font-mono text-[#77777D]">
                            {simulationResult.diff.summary.breakingCount} breaking /{" "}
                            {simulationResult.diff.summary.nonBreakingCount} non-breaking
                          </span>
                        </div>

                        {simulationResult.diff.changes.length === 0 ? (
                          <p className="text-xs font-mono text-[#77777D] p-4 text-center">
                            No differences detected between baseline and simulated models.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {simulationResult.diff.changes.map((ch: DiffChange, idx: number) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg border font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                  ch.severity === "breaking"
                                    ? "bg-[#E06C75]/10 border-[#E06C75]/30 text-[#E06C75]"
                                    : "bg-[#161619] border-[#29292D] text-[#D8D8DC]"
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                        ch.severity === "breaking"
                                          ? "bg-[#E06C75]/20 text-[#E06C75]"
                                          : "bg-[#29292D] text-[#77777D]"
                                      }`}
                                    >
                                      {ch.changeType}
                                    </span>
                                    <span className="font-semibold text-[#D8D8DC]">{ch.path}</span>
                                  </div>
                                  <p className="text-[11px] text-[#77777D] font-sans">{ch.description}</p>
                                </div>

                                {ch.severity === "breaking" && (
                                  <span className="text-[10px] font-bold uppercase text-[#E06C75] shrink-0">
                                    Breaking Change
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 3: Governance Findings */}
                    {resultTab === "governance" && (
                      <div className="p-6 space-y-6">
                        {/* New Violations */}
                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[#E06C75] mb-2 font-semibold">
                            New Governance Violations ({simulationResult.governance.newFindings.length})
                          </h4>
                          {simulationResult.governance.newFindings.length === 0 ? (
                            <p className="text-xs font-mono text-[#77777D] p-3 bg-[#0B0B0D] rounded-lg border border-[#29292D]">
                              No new governance violations introduced by this change.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {simulationResult.governance.newFindings.map((v: GovernanceFinding, i: number) => (
                                <div
                                  key={i}
                                  className="p-3 rounded-lg bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] font-mono text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold">{v.ruleId}</span>
                                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#E06C75]/20">
                                      {v.severity}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#D8D8DC] font-sans">{v.title}</p>
                                  <p className="text-[10px] text-[#77777D]">{v.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Resolved Violations */}
                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[#D8D8DC] mb-2 font-semibold">
                            Resolved Governance Violations ({simulationResult.governance.resolvedFindings.length})
                          </h4>
                          {simulationResult.governance.resolvedFindings.length === 0 ? (
                            <p className="text-xs font-mono text-[#77777D] p-3 bg-[#0B0B0D] rounded-lg border border-[#29292D]">
                              No previously existing violations were resolved by this change.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {simulationResult.governance.resolvedFindings.map((v: GovernanceFinding, i: number) => (
                                <div
                                  key={i}
                                  className="p-3 rounded-lg bg-[#161619] border border-[#29292D] text-[#D8D8DC] font-mono text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold">{v.ruleId}</span>
                                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#29292D] text-[#77777D]">
                                      {v.severity}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#D8D8DC] font-sans">{v.title}</p>
                                  <p className="text-[10px] text-[#77777D]">{v.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 4: Blast Radius Full */}
                    {resultTab === "blast" && (
                      <div className="p-6">
                        <BlastRadiusCard result={simulationResult.blastRadius} compact={false} />
                      </div>
                    )}

                    {/* Tab 5: Simulated Topology Stats */}
                    {resultTab === "topology" && (
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[#77777D] font-semibold">
                            Simulated Graph Topology
                          </h4>
                          {onNavigateToGraph && (
                            <button
                              onClick={() => onNavigateToGraph(simulationResult.simulatedModel)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-mono font-bold text-[#0B0B0D] transition-colors"
                            >
                              <Network className="w-3.5 h-3.5" />
                              <span>Explore in Knowledge Graph</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                          <div className="p-3 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-center">
                            <span className="text-xl font-bold text-[#D8D8DC]">
                              {simulationResult.simulatedGraph.stats.nodes}
                            </span>
                            <span className="block text-[10px] text-[#77777D] mt-1 uppercase">Total Nodes</span>
                          </div>
                          <div className="p-3 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-center">
                            <span className="text-xl font-bold text-[#D8D8DC]">
                              {simulationResult.simulatedGraph.stats.edges}
                            </span>
                            <span className="block text-[10px] text-[#77777D] mt-1 uppercase">Total Edges</span>
                          </div>
                          <div className="p-3 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-center">
                            <span className="text-xl font-bold text-[#D8D8DC]">
                              {simulationResult.simulatedGraph.stats.endpoints}
                            </span>
                            <span className="block text-[10px] text-[#77777D] mt-1 uppercase">Endpoints</span>
                          </div>
                          <div className="p-3 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-center">
                            <span className="text-xl font-bold text-[#D8D8DC]">
                              {simulationResult.simulatedGraph.stats.schemas}
                            </span>
                            <span className="block text-[10px] text-[#77777D] mt-1 uppercase">Schemas</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs font-mono space-y-2">
                          <div className="flex justify-between">
                            <span className="text-[#77777D]">Base Model Endpoints:</span>
                            <span className="text-[#D8D8DC]">{model.endpoints.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#77777D]">Simulated Model Endpoints:</span>
                            <span className="text-[#C98A3D]">{simulationResult.simulatedModel.endpoints.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#77777D]">Base Model Schemas:</span>
                            <span className="text-[#D8D8DC]">{model.schemas.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#77777D]">Simulated Model Schemas:</span>
                            <span className="text-[#C98A3D]">{simulationResult.simulatedModel.schemas.length}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STANDALONE BLAST RADIUS EXPLORER */}
          {activeToolTab === "standalone_blast" && (
            <div className="space-y-6">
              <div className="bg-[#111113] border border-[#29292D] rounded-xl p-5 space-y-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#C98A3D]" />
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#D8D8DC]">
                    Standalone Blast-Radius Calculator
                  </h3>
                </div>
                <p className="text-xs text-[#77777D] leading-relaxed">
                  Select any component in the current API model to compute its exact topological blast radius,
                  downstream dependents, upstream consumers, and deterministic impact level.
                </p>

                {/* Target Type Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setBlastTargetType("endpoint")}
                    className={`p-3 rounded-lg border text-left transition-all font-mono text-xs flex items-center space-x-2.5 ${
                      blastTargetType === "endpoint"
                        ? "bg-[#C98A3D]/15 border-[#C98A3D]/50 text-[#C98A3D]"
                        : "bg-[#0B0B0D] border-[#29292D] text-[#77777D] hover:text-[#D8D8DC]"
                    }`}
                  >
                    <Compass className="w-4 h-4 text-[#77777D] shrink-0" />
                    <div>
                      <div className="font-semibold">Endpoint</div>
                      <div className="text-[10px] text-[#77777D]">Route & operations</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBlastTargetType("schema")}
                    className={`p-3 rounded-lg border text-left transition-all font-mono text-xs flex items-center space-x-2.5 ${
                      blastTargetType === "schema"
                        ? "bg-[#C98A3D]/15 border-[#C98A3D]/50 text-[#C98A3D]"
                        : "bg-[#0B0B0D] border-[#29292D] text-[#77777D] hover:text-[#D8D8DC]"
                    }`}
                  >
                    <Box className="w-4 h-4 text-[#77777D] shrink-0" />
                    <div>
                      <div className="font-semibold">Schema Entity</div>
                      <div className="text-[10px] text-[#77777D]">Data models & refs</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBlastTargetType("security")}
                    className={`p-3 rounded-lg border text-left transition-all font-mono text-xs flex items-center space-x-2.5 ${
                      blastTargetType === "security"
                        ? "bg-[#C98A3D]/15 border-[#C98A3D]/50 text-[#C98A3D]"
                        : "bg-[#0B0B0D] border-[#29292D] text-[#77777D] hover:text-[#D8D8DC]"
                    }`}
                  >
                    <Lock className="w-4 h-4 text-[#77777D] shrink-0" />
                    <div>
                      <div className="font-semibold">Security Scheme</div>
                      <div className="text-[10px] text-[#77777D]">Auth boundaries</div>
                    </div>
                  </button>
                </div>

                {/* Target Dropdown */}
                <div className="space-y-1.5 font-mono text-xs">
                  <label className="text-[#77777D] text-[11px] uppercase">
                    Select Target {blastTargetType}:
                  </label>

                  {blastTargetType === "endpoint" && (
                    <select
                      value={blastTargetId}
                      onChange={(e) => setBlastTargetId(e.target.value)}
                      className="w-full bg-[#0B0B0D] border border-[#29292D] rounded-lg px-3 py-2 text-[#D8D8DC] focus:outline-none focus:border-[#C98A3D]"
                    >
                      {model.endpoints.map((ep) => (
                        <option key={ep.id} value={ep.id}>
                          {ep.method.toUpperCase()} {ep.path} {ep.summary ? `— ${ep.summary}` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  {blastTargetType === "schema" && (
                    <select
                      value={blastTargetId}
                      onChange={(e) => setBlastTargetId(e.target.value)}
                      className="w-full bg-[#0B0B0D] border border-[#29292D] rounded-lg px-3 py-2 text-[#D8D8DC] focus:outline-none focus:border-[#C98A3D]"
                    >
                      {model.schemas.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.type || "object"}, {s.properties?.length || 0} properties)
                        </option>
                      ))}
                    </select>
                  )}

                  {blastTargetType === "security" && (
                    <select
                      value={blastTargetId}
                      onChange={(e) => setBlastTargetId(e.target.value)}
                      className="w-full bg-[#0B0B0D] border border-[#29292D] rounded-lg px-3 py-2 text-[#D8D8DC] focus:outline-none focus:border-[#C98A3D]"
                    >
                      {model.securitySchemes.map((sec) => (
                        <option key={sec.name} value={sec.name}>
                          {sec.name} ({sec.type}, {sec.scheme || "standard"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Calculate Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRunStandaloneBlast}
                    disabled={isAnalyzingBlast || !blastTargetId}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-mono font-bold text-[#0B0B0D] transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>
                      {isAnalyzingBlast ? "Analyzing Topology..." : "Calculate Blast Radius"}
                    </span>
                  </button>
                </div>
              </div>

              {blastError && (
                <div className="p-4 rounded-xl bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs font-mono">
                  {blastError}
                </div>
              )}

              {standaloneBlastResult && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[#D8D8DC] font-semibold">
                    Blast Radius Evaluation: {standaloneBlastResult.target.id}
                  </h4>
                  <BlastRadiusCard result={standaloneBlastResult} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
