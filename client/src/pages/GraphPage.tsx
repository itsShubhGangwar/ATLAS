import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  ReactFlowInstance,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  Search,
  Layers,
  Upload,
  Sparkles,
  AlertCircle,
  Loader2,
  Maximize2,
  RotateCcw,
  Compass,
  Box,
  Lock,
  Tag,
  Terminal,
} from "lucide-react";

import { CanonicalApiModel, GraphModel, GraphNode, GraphNodeType } from "../types";
import { buildGraphApi, parseOpenApiSpec } from "../services/api";
import { SpecNode } from "../components/graph/SpecNode";
import { EndpointNode } from "../components/graph/EndpointNode";
import { SchemaNode } from "../components/graph/SchemaNode";
import { SecurityNode } from "../components/graph/SecurityNode";
import { TagNode } from "../components/graph/TagNode";
import { GraphInspector } from "../components/graph/GraphInspector";
import { computeGraphLayout, GraphLayoutType } from "../components/graph/graphLayout";

const SAMPLE_YAML = `openapi: 3.0.3
info:
  title: Atlas Workflow API
  description: A compact, highly connected API designed to produce a dense knowledge graph.
  version: 1.0.0
servers:
  - url: https://api.atlas-workflow.example.com/v1
tags:
  - name: Auth
  - name: Users
  - name: Teams
  - name: Projects
  - name: Tasks
paths:
  /auth/login:
    post:
      tags: [Auth]
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Authentication successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /users/me:
    get:
      tags: [Users]
      operationId: getCurrentUser
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Current user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /projects:
    get:
      tags: [Projects]
      operationId: listProjects
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of projects
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectList'
  /projects/{projectId}/tasks:
    get:
      tags: [Tasks]
      operationId: listTasks
      security:
        - BearerAuth: []
      parameters:
        - name: projectId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: List of tasks
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TaskList'
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email }
        password: { type: string }
    AuthResponse:
      type: object
      required: [accessToken, tokenType]
      properties:
        accessToken: { type: string }
        tokenType: { type: string }
    User:
      type: object
      required: [id, email, name]
      properties:
        id: { type: string, format: uuid }
        email: { type: string }
        name: { type: string }
    ProjectList:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/User'
        total: { type: integer }
    TaskList:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/User'
        total: { type: integer }
`;

interface GraphPageProps {
  initialModel?: CanonicalApiModel | null;
  onNavigateToExplorer?: () => void;
  onOpenExplorer?: (endpointId: string) => void;
  onSimulateChange?: (endpointId: string) => void;
}

export const GraphPage: React.FC<GraphPageProps> = ({
  initialModel,
  onNavigateToExplorer,
  onOpenExplorer,
  onSimulateChange,
}) => {
  const [graphModel, setGraphModel] = useState<GraphModel | null>(null);
  const [currentModel, setCurrentModel] = useState<CanonicalApiModel | null>(initialModel || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLayout, setActiveLayout] = useState<GraphLayoutType>("hierarchical");

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Interactivity state
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | GraphNodeType>("ALL");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Register custom node types
  const nodeTypes = useMemo(
    () => ({
      spec: SpecNode,
      endpoint: EndpointNode,
      schema: SchemaNode,
      security: SecurityNode,
      tag: TagNode,
    }),
    []
  );

  // Focus and select node
  const handleSelectNode = useCallback(
    (nodeId: string) => {
      if (!rfInstance || !graphModel) return;
      const target = nodes.find((n) => n.id === nodeId);
      if (target) {
        rfInstance.setCenter(target.position.x + 100, target.position.y + 50, {
          zoom: 1.2,
          duration: 500,
        });
        const orig = graphModel.nodes.find((n) => n.id === nodeId);
        if (orig) setSelectedNode(orig);
      }
    },
    [rfInstance, graphModel, nodes]
  );

  // Builds and positions the graph from GraphModel
  const applyGraphModel = useCallback(
    (graph: GraphModel, layoutOverride?: GraphLayoutType) => {
      setGraphModel(graph);
      const layout = layoutOverride || activeLayout;
      const { nodes: layoutNodes, edges: layoutEdges } = computeGraphLayout(graph, layout);
      setNodes(layoutNodes);
      setEdges(layoutEdges);
      setSelectedNode(null);

      setTimeout(() => {
        if (rfInstance) {
          rfInstance.fitView({ padding: 0.2, duration: 400 });
        }
      }, 50);
    },
    [rfInstance, activeLayout, setNodes, setEdges]
  );

  // Layout change handler (deterministic re-render without reloading or mutating model)
  const handleLayoutChange = useCallback(
    (newLayout: GraphLayoutType) => {
      setActiveLayout(newLayout);
      if (!graphModel) return;

      const { nodes: allNodes, edges: allEdges } = computeGraphLayout(graphModel, newLayout);

      if (activeFilter === "ALL") {
        setNodes(allNodes);
        setEdges(allEdges);
      } else {
        const visibleNodeIds = new Set<string>();
        const filteredNodes = allNodes.filter((n) => {
          if (n.type === activeFilter) {
            visibleNodeIds.add(n.id);
            return true;
          }
          return false;
        });
        const filteredEdges = allEdges.filter(
          (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
        );
        setNodes(filteredNodes);
        setEdges(filteredEdges);
      }

      setTimeout(() => {
        if (rfInstance) {
          rfInstance.fitView({ padding: 0.2, duration: 400 });
        }
      }, 50);
    },
    [graphModel, activeFilter, rfInstance, setNodes, setEdges]
  );

  const handleFitView = useCallback(() => {
    if (rfInstance) {
      rfInstance.fitView({ padding: 0.2, duration: 400 });
    }
  }, [rfInstance]);

  const handleResetLayout = useCallback(() => {
    if (graphModel) {
      handleLayoutChange(activeLayout);
    }
  }, [graphModel, activeLayout, handleLayoutChange]);

  // Fetch or build graph
  const loadGraphFromModel = useCallback(
    async (model: CanonicalApiModel) => {
      setCurrentModel(model);
      setLoading(true);
      setError(null);
      const res = await buildGraphApi(model);
      if (res.success && res.data) {
        applyGraphModel(res.data);
      } else {
        setError(res.error || "Unable to build API graph.");
      }
      setLoading(false);
    },
    [applyGraphModel]
  );

  const handleLoadSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseOpenApiSpec(SAMPLE_YAML);
      if (parsed.success && parsed.data) {
        setCurrentModel(parsed.data);
      }
    } catch {
      // Continue even if parse fails
    }
    const res = await buildGraphApi(SAMPLE_YAML);
    if (res.success && res.data) {
      applyGraphModel(res.data);
    } else {
      setError(res.error || "Unable to build graph from sample specification.");
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true);
      setError(null);
      try {
        const parsed = await parseOpenApiSpec(file);
        if (parsed.success && parsed.data) {
          setCurrentModel(parsed.data);
        }
      } catch {
        // Continue even if parse fails
      }
      const res = await buildGraphApi(file);
      if (res.success && res.data) {
        applyGraphModel(res.data);
      } else {
        setError(res.error || "Unable to build graph from uploaded file.");
      }
      setLoading(false);
    }
  };

  // Initial load if model was passed from Explorer
  useEffect(() => {
    if (initialModel) {
      loadGraphFromModel(initialModel);
    }
  }, [initialModel, loadGraphFromModel]);

  // Filtering: Filter nodes and edges by active category
  useEffect(() => {
    if (!graphModel) return;

    const { nodes: allNodes, edges: allEdges } = computeGraphLayout(graphModel, activeLayout);

    if (activeFilter === "ALL") {
      setNodes(allNodes);
      setEdges(allEdges);
      return;
    }

    const visibleNodeIds = new Set<string>();
    const filteredNodes = allNodes.filter((n) => {
      if (n.type === activeFilter) {
        visibleNodeIds.add(n.id);
        return true;
      }
      return false;
    });

    // Keep edges where both source and target are visible
    const filteredEdges = allEdges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [activeFilter, graphModel, activeLayout, setNodes, setEdges]);

  // Node Selection Handler
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!graphModel) return;
      const originalNode = graphModel.nodes.find((n) => n.id === node.id);
      if (originalNode) {
        setSelectedNode(originalNode);
      }
    },
    [graphModel]
  );

  // Search results calculation
  const searchResults = useMemo(() => {
    if (!graphModel || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    return graphModel.nodes.filter((node) => {
      if (node.label.toLowerCase().includes(q)) return true;
      if (node.type.toLowerCase().includes(q)) return true;
      if (node.type === "endpoint") {
        if ((node.data.path || "").toLowerCase().includes(q)) return true;
        if ((node.data.method || "").toLowerCase().includes(q)) return true;
        if ((node.data.summary || "").toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [graphModel, searchQuery]);

  // Focus on node from search
  const handleSelectSearchResult = (nodeId: string) => {
    if (!rfInstance || !graphModel) return;
    const target = nodes.find((n) => n.id === nodeId);
    if (target) {
      rfInstance.setCenter(target.position.x + 100, target.position.y + 50, {
        zoom: 1.2,
        duration: 500,
      });

      // Highlight selected node
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === nodeId,
        }))
      );

      const original = graphModel.nodes.find((n) => n.id === nodeId);
      if (original) setSelectedNode(original);
      setSearchQuery("");
    }
  };

  const miniMapNodeColor = (node: Node) => {
    if (node.selected) return "#C98A3D";
    return "#29292D";
  };

  return (
    <div className="h-full flex flex-col -m-8 overflow-hidden bg-[#0B0B0D] text-[#D8D8DC] font-mono text-xs">
      {/* Top Controls Bar */}
      <div className="h-10 border-b border-[#29292D] bg-[#111113] px-3 flex items-center justify-between gap-2.5 select-none z-10">
        {/* Left: Search Bar & Auto-complete */}
        <div className="relative w-56">
          <div className="flex items-center px-2 py-1 rounded bg-[#0B0B0D] border border-[#29292D] text-xs focus-within:border-[#C98A3D] transition-colors">
            <Search className="w-3.5 h-3.5 text-[#77777D] mr-1.5 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-[#D8D8DC] placeholder-[#5A5A62] w-full text-xs font-mono"
            />
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#111113] border border-[#29292D] rounded shadow-2xl max-h-60 overflow-y-auto p-1 space-y-0.5 z-50">
              <div className="px-2 py-1 text-[9px] font-mono text-[#77777D] uppercase font-bold">
                Matching Nodes ({searchResults.length})
              </div>
              {searchResults.slice(0, 10).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectSearchResult(item.id)}
                  className="w-full text-left px-2 py-1 rounded text-[11px] font-mono flex items-center justify-between hover:bg-[#161619] text-[#D8D8DC] transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate">
                    {item.type === "endpoint" && <Compass className="w-3 h-3 text-[#77777D]" />}
                    {item.type === "schema" && <Box className="w-3 h-3 text-[#77777D]" />}
                    {item.type === "security" && <Lock className="w-3 h-3 text-[#77777D]" />}
                    {item.type === "tag" && <Tag className="w-3 h-3 text-[#77777D]" />}
                    {item.type === "spec" && <Terminal className="w-3 h-3 text-[#77777D]" />}
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span className="text-[9px] text-[#77777D] uppercase ml-2">{item.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="hidden xl:flex items-center space-x-1 p-0.5 bg-[#0B0B0D] border border-[#29292D] rounded text-[11px] font-mono">
          {(
            [
              { id: "ALL", label: "All" },
              { id: "endpoint", label: "Endpoints" },
              { id: "schema", label: "Schemas" },
              { id: "security", label: "Security" },
              { id: "tag", label: "Tags" },
              { id: "spec", label: "Spec" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                activeFilter === filter.id
                  ? "bg-[#161619] text-[#C98A3D] font-bold border border-[#C98A3D]/40"
                  : "text-[#77777D] hover:text-[#D8D8DC] hover:bg-[#161619]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Center/Right: Layout Controls Toolbar */}
        <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#0B0B0D] border border-[#29292D] text-xs font-mono">
          <span className="text-[10px] text-[#77777D] uppercase font-bold tracking-wider mr-1">Layout:</span>
          <select
            value={activeLayout}
            onChange={(e) => handleLayoutChange(e.target.value as GraphLayoutType)}
            className="bg-[#161619] border border-[#29292D] rounded px-1.5 py-0.5 text-[11px] text-[#D8D8DC] font-mono outline-none cursor-pointer focus:border-[#C98A3D] hover:border-[#3E3E46] transition-colors"
          >
            <option value="hierarchical">Hierarchical</option>
            <option value="force">Force-Directed</option>
            <option value="radial">Radial</option>
            <option value="circular">Circular</option>
            <option value="grid">Grid</option>
          </select>
          <button
            onClick={handleFitView}
            title="Fit Graph into Viewport"
            className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#202024] border border-[#29292D] hover:border-[#3E3E46] text-[10px] text-[#D8D8DC] transition-colors font-mono font-medium"
          >
            Fit
          </button>
          <button
            onClick={handleResetLayout}
            title="Reset to Original Deterministic Coordinates"
            className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#202024] border border-[#29292D] hover:border-[#3E3E46] text-[10px] text-[#D8D8DC] transition-colors font-mono font-medium flex items-center space-x-1"
          >
            <RotateCcw className="w-2.5 h-2.5 text-[#77777D]" />
            <span>Reset</span>
          </button>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center space-x-1.5">
          <input
            type="file"
            ref={fileInputRef}
            accept=".yaml,.yml,.json"
            onChange={handleFileUpload}
            className="hidden"
            id="graph-file-input"
          />
          <label
            htmlFor="graph-file-input"
            className="cursor-pointer inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#161619] hover:bg-[#202024] border border-[#29292D] hover:border-[#3E3E46] text-[10px] font-mono text-[#D8D8DC] transition-colors"
          >
            <Upload className="w-3 h-3 text-[#C98A3D]" />
            <span>Upload</span>
          </label>

          <button
            onClick={handleLoadSample}
            disabled={loading}
            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#161619] hover:bg-[#202024] border border-[#29292D] hover:border-[#3E3E46] text-[10px] font-mono text-[#D8D8DC] transition-colors"
          >
            <Sparkles className="w-3 h-3 text-[#C98A3D]" />
            <span>Sample</span>
          </button>

          {rfInstance && (
            <button
              onClick={handleFitView}
              title="Fit View"
              className="p-1 rounded bg-[#161619] hover:bg-[#202024] border border-[#29292D] text-[#77777D] hover:text-[#D8D8DC] transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas & Inspector Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-[#0B0B0D]/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#C98A3D] animate-spin" />
            <p className="font-mono text-xs text-[#D8D8DC]">Building API graph topology...</p>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="absolute top-4 left-6 right-6 z-20 p-3 rounded-lg bg-[#E06C75]/10 border border-[#E06C75]/30 flex items-center justify-between text-xs text-[#E06C75]">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-[#E06C75] flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-[#E06C75] hover:text-[#D8D8DC] text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Empty State when no graph is loaded */}
        {!graphModel && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#111113] border border-[#29292D] flex items-center justify-center text-[#C98A3D] shadow-2xl">
              <Layers className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold text-[#D8D8DC]">No API Graph Loaded</h3>
              <p className="text-xs text-[#77777D] mt-1 leading-relaxed">
                Render an interactive knowledge graph topology directly from an OpenAPI 2.0 / 3.0 / 3.1 specification.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleLoadSample}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] shadow-lg transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample API Graph</span>
              </button>
              {onNavigateToExplorer && (
                <button
                  onClick={onNavigateToExplorer}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#161619] hover:bg-[#202024] border border-[#29292D] text-xs font-mono text-[#D8D8DC] transition-colors"
                >
                  <Compass className="w-3.5 h-3.5 text-[#77777D]" />
                  <span>Go to API Explorer</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* React Flow Graph Canvas with crisp border separation */}
        {graphModel && (
          <div className="flex-1 h-full w-full relative border-r border-[#29292D] bg-[#0B0B0D] overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              onInit={setRfInstance}
              fitView
              minZoom={0.15}
              maxZoom={2.5}
              className="bg-[#0B0B0D]"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1}
                color="#29292D"
              />
              <Controls className="!bg-[#111113] !border !border-[#29292D] !rounded !fill-[#77777D]" />
              <MiniMap
                nodeColor={miniMapNodeColor}
                maskColor="rgba(11, 11, 13, 0.85)"
                className="!bg-[#0B0B0D] !border !border-[#29292D] !rounded overflow-hidden"
              />
            </ReactFlow>
          </div>
        )}

        {/* Right-Side Context Inspector */}
        <GraphInspector
          selectedNode={selectedNode}
          model={currentModel}
          onClose={() => setSelectedNode(null)}
          onSelectNode={handleSelectNode}
          onOpenExplorer={onOpenExplorer}
          onSimulateChange={onSimulateChange}
        />
      </div>

      {/* Bottom Graph Statistics Footer */}
      {graphModel && (
        <div className="h-7 border-t border-[#29292D] bg-[#111113] px-4 flex items-center justify-between text-[11px] font-mono text-[#77777D] select-none z-10">
          <div className="flex items-center space-x-5">
            <div className="flex items-center space-x-1">
              <span className="text-[#77777D]">NODES:</span>
              <span className="text-[#D8D8DC] font-bold">{graphModel.stats.nodes}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[#77777D]">EDGES:</span>
              <span className="text-[#D8D8DC] font-bold">{graphModel.stats.edges}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[#77777D]">ENDPOINTS:</span>
              <span className="text-[#D8D8DC] font-bold">{graphModel.stats.endpoints}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[#77777D]">SCHEMAS:</span>
              <span className="text-[#D8D8DC] font-bold">{graphModel.stats.schemas}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[#77777D]">SECURITY:</span>
              <span className="text-[#D8D8DC] font-bold">{graphModel.stats.securitySchemes}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[#77777D]">TAGS:</span>
              <span className="text-[#D8D8DC] font-bold">{graphModel.stats.tags}</span>
            </div>
            <div className="flex items-center space-x-1 pl-2 border-l border-[#29292D]">
              <span className="text-[#77777D]">LAYOUT:</span>
              <span className="text-[#C98A3D] font-bold uppercase">{activeLayout}</span>
            </div>
          </div>

          <div className="text-[10px] text-[#77777D]">
            MODEL: <span className="text-[#D8D8DC]">CanonicalApiModel</span>
          </div>
        </div>
      )}
    </div>
  );
};
