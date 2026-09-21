import React, { useState, useEffect } from "react";
import {
  Terminal,
  Compass,
  Box,
  Lock,
  Tag,
  X,
  Shield,
  Activity,
  Loader2,
  Zap,
} from "lucide-react";
import { GraphNode, CanonicalApiModel, BlastRadiusResult } from "../../types";
import { analyzeBlastRadiusApi } from "../../services/api";
import { BlastRadiusCard } from "../simulator/BlastRadiusCard";

interface GraphInspectorProps {
  selectedNode: GraphNode | null;
  model?: CanonicalApiModel | null;
  onClose?: () => void;
  onSelectNode?: (nodeId: string) => void;
  onOpenExplorer?: (endpointId: string) => void;
  onSimulateChange?: (endpointId: string) => void;
}

export const GraphInspector: React.FC<GraphInspectorProps> = ({
  selectedNode,
  model,
  onClose,
  onSelectNode,
  onOpenExplorer,
  onSimulateChange,
}) => {
  const [blastRadius, setBlastRadius] = useState<BlastRadiusResult | null>(null);
  const [isLoadingBlast, setIsLoadingBlast] = useState<boolean>(false);
  const [blastError, setBlastError] = useState<string | null>(null);

  // Reset blast radius when selected node changes
  useEffect(() => {
    setBlastRadius(null);
    setBlastError(null);
    setIsLoadingBlast(false);
  }, [selectedNode?.id]);

  const handleAnalyzeBlastRadius = async () => {
    if (!selectedNode || !model) return;
    if (
      selectedNode.type !== "endpoint" &&
      selectedNode.type !== "schema" &&
      selectedNode.type !== "security"
    ) {
      return;
    }

    setIsLoadingBlast(true);
    setBlastError(null);

    try {
      const res = await analyzeBlastRadiusApi({
        model,
        target: {
          type: selectedNode.type,
          id: selectedNode.id,
        },
      });

      if (res.success && res.data) {
        setBlastRadius(res.data);
      } else {
        setBlastError(res.error || "Failed to analyze blast radius.");
      }
    } catch (err: any) {
      setBlastError(err.message || "Error analyzing blast radius.");
    } finally {
      setIsLoadingBlast(false);
    }
  };
  if (!selectedNode) {
    return (
      <aside className="w-80 bg-[#111113] border-l border-[#29292D] p-6 flex flex-col justify-center items-center text-center text-[#77777D] h-full select-none font-mono">
        <div className="w-10 h-10 rounded bg-[#161619] border border-[#29292D] flex items-center justify-center text-[#77777D] mb-3">
          <Terminal className="w-4 h-4" />
        </div>
        <p className="text-xs font-bold text-[#D8D8DC] uppercase tracking-wider">Inspector Empty</p>
        <p className="text-[11px] text-[#77777D] mt-1 max-w-[200px] leading-relaxed">
          Select any node in the topology graph to inspect parameters, schemas, and dependency contracts.
        </p>
      </aside>
    );
  }

  const { type, label, data } = selectedNode;

  return (
    <aside className="w-80 bg-[#111113] border-l border-[#29292D] flex flex-col h-full overflow-hidden font-mono">
      {/* Inspector Header */}
      <div className="p-3 border-b border-[#29292D] flex items-center justify-between bg-[#0B0B0D]">
        <div className="flex items-center space-x-2">
          {type === "spec" && <Terminal className="w-3.5 h-3.5 text-[#77777D]" />}
          {type === "endpoint" && <Compass className="w-3.5 h-3.5 text-[#77777D]" />}
          {type === "schema" && <Box className="w-3.5 h-3.5 text-[#77777D]" />}
          {type === "security" && <Lock className="w-3.5 h-3.5 text-[#77777D]" />}
          {type === "tag" && <Tag className="w-3.5 h-3.5 text-[#77777D]" />}
          <span className="text-[11px] uppercase tracking-wider text-[#77777D] font-bold">
            {type} Inspector
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-[#77777D] hover:text-[#D8D8DC] rounded hover:bg-[#161619]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Node Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Title / Main Identity */}
        <div>
          <h3 className="font-mono font-bold text-sm text-[#D8D8DC] break-words">{label}</h3>
          {data.description && (
            <p className="text-[11px] text-[#77777D] mt-1 leading-relaxed">{data.description}</p>
          )}
        </div>

        {/* 1. Spec Node Details */}
        {type === "spec" && (
          <div className="space-y-3 font-mono">
            <div className="p-3 rounded-lg bg-[#161619] border border-[#29292D] space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#77777D]">API Version:</span>
                <span className="text-[#D8D8DC]">{data.version || "1.0.0"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77777D]">Spec Version:</span>
                <span className="text-[#D8D8DC]">{data.openApiVersion || "3.0.0"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77777D]">Spec Type:</span>
                <span className="text-[#D8D8DC] uppercase">{data.specType || "openapi"}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-[#161619] border border-[#29292D]">
                <div className="text-xs font-bold text-[#D8D8DC]">{data.endpointCount ?? 0}</div>
                <div className="text-[9px] text-[#77777D]">Endpoints</div>
              </div>
              <div className="p-2 rounded bg-[#161619] border border-[#29292D]">
                <div className="text-xs font-bold text-[#D8D8DC]">{data.schemaCount ?? 0}</div>
                <div className="text-[9px] text-[#77777D]">Schemas</div>
              </div>
              <div className="p-2 rounded bg-[#161619] border border-[#29292D]">
                <div className="text-xs font-bold text-[#D8D8DC]">{data.securityCount ?? 0}</div>
                <div className="text-[9px] text-[#77777D]">Security</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Endpoint Node Details */}
        {type === "endpoint" && (
          <div className="space-y-4">
            {/* Summary & Operation ID */}
            <div className="p-3 rounded-lg bg-[#161619] border border-[#29292D] space-y-1 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-[#77777D]">Method:</span>
                <span className="text-[#D8D8DC] font-bold">{data.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77777D]">Path:</span>
                <span className="text-[#D8D8DC]">{data.path}</span>
              </div>
              {data.operationId && (
                <div className="flex justify-between">
                  <span className="text-[#77777D]">Operation ID:</span>
                  <span className="text-[#D8D8DC]">{data.operationId}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {Array.isArray(data.tags) && data.tags.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.tags.map((t: string) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-[#161619] border border-[#29292D] text-[#D8D8DC] text-[10px] font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Parameters */}
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">Parameters</span>
              {Array.isArray(data.parameters) && data.parameters.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {data.parameters.map((param: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#161619] border border-[#29292D] text-[11px] font-mono flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[#D8D8DC] font-semibold">{param.name}</span>
                        <span className="text-[#77777D] ml-1.5">({param.location})</span>
                      </div>
                      <span className="text-[10px] text-[#77777D]">{param.schemaType || "string"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#77777D] font-mono mt-1">None</p>
              )}
            </div>

            {/* Request Body */}
            {data.requestBody && (
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">
                  Request Body
                </span>
                <div className="mt-1 p-2 rounded bg-[#161619] border border-[#29292D] text-[11px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#77777D]">Content-Type:</span>
                    <span className="text-[#D8D8DC]">{data.requestBody.contentType}</span>
                  </div>
                  {data.requestBody.schemaRef && (
                    <div className="flex justify-between">
                      <span className="text-[#77777D]">Schema:</span>
                      <span className="text-[#D8D8DC]">{data.requestBody.schemaRef}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Responses */}
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">Responses</span>
              {Array.isArray(data.responses) && data.responses.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {data.responses.map((resp: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#161619] border border-[#29292D] text-[11px] font-mono flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-bold ${
                            resp.statusCode.startsWith("2")
                              ? "text-[#D8D8DC]"
                              : "text-[#E06C75]"
                          }`}
                        >
                          {resp.statusCode}
                        </span>
                        <span className="text-[#77777D] text-[10px] font-sans truncate max-w-[120px]">
                          {resp.description || "Response"}
                        </span>
                      </div>
                      {resp.schemaRef && (
                        <span className="text-[10px] text-[#77777D]">{resp.schemaRef}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#77777D] font-mono mt-1">None</p>
              )}
            </div>

            {/* Security Requirements */}
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">
                Security Scheme
              </span>
              {Array.isArray(data.security) && data.security.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {data.security.map((sec: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#161619] border border-[#29292D] text-[11px] font-mono flex items-center justify-between text-[#D8D8DC]"
                    >
                      <div className="flex items-center space-x-1.5">
                        <Shield className="w-3 h-3 text-[#C98A3D]" />
                        <span>{sec.schemeName}</span>
                      </div>
                      {sec.scopes && sec.scopes.length > 0 && (
                        <span className="text-[9px] text-[#77777D]">{sec.scopes.join(", ")}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#77777D] font-mono mt-1">Public (No authentication required)</p>
              )}
            </div>
          </div>
        )}

        {/* 3. Schema Node Details */}
        {type === "schema" && (
          <div className="space-y-4 font-mono">
            <div className="p-3 rounded-lg bg-[#161619] border border-[#29292D] space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#77777D]">Type:</span>
                <span className="text-[#D8D8DC]">{data.type || "object"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77777D]">Properties:</span>
                <span className="text-[#D8D8DC]">
                  {Array.isArray(data.properties) ? data.properties.length : 0}
                </span>
              </div>
            </div>

            {/* Properties List */}
            {Array.isArray(data.properties) && data.properties.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">Properties</span>
                <div className="mt-1 space-y-1">
                  {data.properties.map((prop: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#161619] border border-[#29292D] text-[11px] flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-1">
                        <span className="text-[#D8D8DC]">{prop.name}</span>
                        {prop.required && <span className="text-[#E06C75] text-xs">*</span>}
                      </div>
                      <span className="text-[10px] text-[#77777D]">
                        {prop.reference ? (
                          <span>Ref: {prop.reference}</span>
                        ) : (
                          prop.type || "string"
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Fields */}
            {Array.isArray(data.required) && data.required.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">
                  Required Fields
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.required.map((req: string) => (
                    <span
                      key={req}
                      className="px-2 py-0.5 rounded bg-[#161619] border border-[#29292D] text-[#D8D8DC] text-[10px]"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Schema References */}
            {Array.isArray(data.references) && data.references.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">
                  Referenced Schemas
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.references.map((ref: string) => (
                    <span
                      key={ref}
                      className="px-2 py-0.5 rounded bg-[#161619] border border-[#29292D] text-[#D8D8DC] text-[10px]"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Security Node Details */}
        {type === "security" && (
          <div className="space-y-3 font-mono text-[11px]">
            <div className="p-3 rounded-lg bg-[#161619] border border-[#29292D] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#77777D]">Scheme Name:</span>
                <span className="text-[#D8D8DC] font-bold">{data.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77777D]">Auth Type:</span>
                <span className="text-[#D8D8DC]">{data.type || "http"}</span>
              </div>
              {data.scheme && (
                <div className="flex justify-between">
                  <span className="text-[#77777D]">HTTP Scheme:</span>
                  <span className="text-[#D8D8DC] uppercase">{data.scheme}</span>
                </div>
              )}
              {data.bearerFormat && (
                <div className="flex justify-between">
                  <span className="text-[#77777D]">Bearer Format:</span>
                  <span className="text-[#D8D8DC]">{data.bearerFormat}</span>
                </div>
              )}
              {data.location && (
                <div className="flex justify-between">
                  <span className="text-[#77777D]">Location:</span>
                  <span className="text-[#D8D8DC]">{data.location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Tag Node Details */}
        {type === "tag" && (
          <div className="space-y-3 font-mono text-[11px]">
            <div className="p-3 rounded-lg bg-[#161619] border border-[#29292D] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#77777D]">Tag Name:</span>
                <span className="text-[#D8D8DC] font-bold">{data.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77777D]">Endpoints:</span>
                <span className="text-[#D8D8DC]">{data.endpointCount ?? 0}</span>
              </div>
            </div>

            {Array.isArray(data.endpoints) && data.endpoints.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">
                  Tagged Operations
                </span>
                <div className="mt-1 space-y-1">
                  {data.endpoints.map((epId: string) => (
                    <div
                      key={epId}
                      className="p-2 rounded bg-[#161619] border border-[#29292D] text-[10px] text-[#D8D8DC] truncate"
                    >
                      {epId.replace("endpoint:", "")}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. Blast Radius Topological Analysis */}
        {(type === "endpoint" || type === "schema" || type === "security") && (
          <div className="pt-3 border-t border-[#29292D] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#D8D8DC] font-semibold flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-[#C98A3D]" />
                <span>Blast Radius</span>
              </span>
              {blastRadius && (
                <button
                  type="button"
                  onClick={handleAnalyzeBlastRadius}
                  disabled={isLoadingBlast}
                  className="text-[10px] font-mono text-[#C98A3D] hover:underline"
                >
                  Recalculate
                </button>
              )}
            </div>

            {!blastRadius && !isLoadingBlast && (
              <button
                type="button"
                onClick={handleAnalyzeBlastRadius}
                disabled={!model}
                title={!model ? "Model not loaded" : "Analyze dependency blast radius"}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-[#161619] hover:bg-[#202024] border border-[#29292D] text-[#D8D8DC] font-mono text-xs transition-colors shadow-sm disabled:opacity-40"
              >
                <Activity className="w-3.5 h-3.5 text-[#C98A3D]" />
                <span>Analyze Blast Radius</span>
              </button>
            )}

            {isLoadingBlast && (
              <div className="p-3 rounded-lg bg-[#161619] border border-[#29292D] text-center space-y-1.5">
                <Loader2 className="w-4 h-4 text-[#C98A3D] animate-spin mx-auto" />
                <p className="text-[11px] font-mono text-[#77777D]">
                  Tracing dependency graph...
                </p>
              </div>
            )}

            {blastError && (
              <div className="p-2.5 rounded-lg bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-[11px] font-mono">
                {blastError}
              </div>
            )}

            {blastRadius && (
              <div className="space-y-2">
                <BlastRadiusCard
                  result={blastRadius}
                  onSelectNode={onSelectNode}
                  compact={true}
                />
              </div>
            )}
          </div>
        )}

        {/* 7. Quick Workbench Actions */}
        <div className="pt-3 border-t border-[#29292D] space-y-2 font-mono">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#77777D] block">
            ACTIONS
          </span>
          <div className="flex flex-col gap-1.5">
            {type === "endpoint" && onOpenExplorer && (
              <button
                type="button"
                onClick={() => onOpenExplorer(selectedNode.id)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-[#161619] hover:bg-[#202024] border border-[#29292D] hover:border-[#3E3E46] text-[#D8D8DC] font-mono text-xs transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-[#77777D]" />
                <span>Open in Explorer</span>
              </button>
            )}

            {type === "endpoint" && onSimulateChange && (
              <button
                type="button"
                onClick={() => onSimulateChange(selectedNode.id)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-[#C98A3D]/15 hover:bg-[#C98A3D]/25 border border-[#C98A3D]/40 text-[#C98A3D] font-mono text-xs font-bold transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-[#C98A3D]" />
                <span>Simulate Change</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};