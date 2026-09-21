import React, { useState, useEffect, useCallback } from "react";
import {
  FileCode,
  ArrowLeft,
  Network,
  ShieldAlert,
  GitCompare,
  Code2,
  Lock,
  Unlock,
  Zap,
  Activity,
  X,
  Loader2,
} from "lucide-react";
import {
  ApiVersionDetail,
  CanonicalApiModel,
  ApiEndpoint,
  BlastRadiusResult,
} from "../types";
import { getVersionByIdApi, analyzeBlastRadiusApi } from "../services/api";
import { BlastRadiusCard } from "../components/simulator/BlastRadiusCard";

interface ApiVersionPageProps {
  projectId: string;
  versionId: string;
  demoVersion?: ApiVersionDetail | null;
  onBack: () => void;
  onOpenGraph: (model: CanonicalApiModel) => void;
  onOpenGovernance: (model: CanonicalApiModel, versionId?: string) => void;
  onOpenSdk: (model: CanonicalApiModel) => void;
  onOpenDiff: (baseModel: CanonicalApiModel) => void;
  onOpenSimulator?: (model: CanonicalApiModel) => void;
}

export const ApiVersionPage: React.FC<ApiVersionPageProps> = ({
  projectId,
  versionId,
  demoVersion,
  onBack,
  onOpenGraph,
  onOpenGovernance,
  onOpenSdk,
  onOpenDiff,
  onOpenSimulator,
}) => {
  const [version, setVersion] = useState<ApiVersionDetail | null>(demoVersion || null);
  const [isLoading, setIsLoading] = useState<boolean>(!demoVersion);
  const [error, setError] = useState<string | null>(null);

  // Blast radius modal state
  const [selectedBlastEndpoint, setSelectedBlastEndpoint] = useState<ApiEndpoint | null>(null);
  const [endpointBlastResult, setEndpointBlastResult] = useState<BlastRadiusResult | null>(null);
  const [isAnalyzingBlast, setIsAnalyzingBlast] = useState<boolean>(false);
  const [endpointBlastError, setEndpointBlastError] = useState<string | null>(null);

  const handleInspectEndpointBlast = async (ep: ApiEndpoint) => {
    if (!version?.canonicalModel) return;
    setSelectedBlastEndpoint(ep);
    setIsAnalyzingBlast(true);
    setEndpointBlastError(null);
    setEndpointBlastResult(null);

    try {
      const res = await analyzeBlastRadiusApi({
        model: version.canonicalModel,
        projectId,
        versionId,
        target: {
          type: "endpoint",
          id: ep.id,
        },
      });
      if (res.success && res.data) {
        setEndpointBlastResult(res.data);
      } else {
        setEndpointBlastError(res.error || "Failed to analyze blast radius.");
      }
    } catch (err: any) {
      setEndpointBlastError(err.message || "Failed to analyze blast radius.");
    } finally {
      setIsAnalyzingBlast(false);
    }
  };

  const loadVersion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getVersionByIdApi(projectId, versionId);
      if (res.success && res.data) {
        setVersion(res.data);
      } else {
        setError(res.error || "Failed to load API version.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load version details.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, versionId]);

  useEffect(() => {
    if (demoVersion) {
      setVersion(demoVersion);
      setIsLoading(false);
      return;
    }
    loadVersion();
  }, [demoVersion, loadVersion]);

  const getMethodBadge = (_method: string) => {
    return "bg-[#1A1A1E] text-[#D8D8DC] border-[#29292D]";
  };

  if (isLoading) {
    return (
      <div className="bg-[#111113] border border-[#29292D] rounded-lg p-12 text-center text-xs text-[#77777D] font-mono">
        Loading API version details...
      </div>
    );
  }

  if (error || !version) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs text-[#77777D] hover:text-[#D8D8DC] transition-colors font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Project</span>
        </button>
        <div className="p-4 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs">
          {error || "Version not found."}
        </div>
      </div>
    );
  }

  const canonical = version.canonicalModel;
  const metadata = canonical.metadata;

  return (
    <div className="space-y-6">
      {/* Back button and Version Header */}
      <div className="bg-[#111113] border border-[#29292D] rounded-lg p-6 space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs text-[#77777D] hover:text-[#D8D8DC] transition-colors font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Project Versions</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center space-x-2.5">
              <FileCode className="w-6 h-6 text-[#C98A3D]" />
              <h2 className="text-xl font-bold text-[#D8D8DC] font-mono">
                {metadata.title || version.name || "API Specification"}
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#161619] text-[#C98A3D] border border-[#29292D]">
                v{version.version}
              </span>
            </div>
            <p className="text-xs text-[#77777D] mt-1.5 max-w-2xl leading-relaxed">
              {metadata.description || "No description provided in specification."}
            </p>
          </div>

          {/* Core Pipeline Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenGraph(canonical)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors shadow-sm"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Knowledge Graph</span>
            </button>

            <button
              onClick={() => onOpenGovernance(canonical, versionId)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] hover:border-[#C98A3D]/40 transition-colors shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#C98A3D]" />
              <span>Governance</span>
            </button>

            <button
              onClick={() => onOpenSdk(canonical)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] hover:border-[#C98A3D]/40 transition-colors shadow-sm"
            >
              <Code2 className="w-3.5 h-3.5 text-[#C98A3D]" />
              <span>Generate SDK</span>
            </button>

            <button
              onClick={() => onOpenDiff(canonical)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] hover:border-[#C98A3D]/40 transition-colors shadow-sm"
            >
              <GitCompare className="w-3.5 h-3.5 text-[#C98A3D]" />
              <span>Compare</span>
            </button>

            {onOpenSimulator && (
              <button
                onClick={() => onOpenSimulator(canonical)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] hover:border-[#C98A3D]/40 transition-colors shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-[#C98A3D]" />
                <span>Simulate Changes</span>
              </button>
            )}
          </div>
        </div>

        {/* Metrics Pill Bar */}
        <div className="pt-3 border-t border-[#29292D] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-[#0B0B0D] p-2.5 rounded border border-[#29292D]">
            <span className="text-[#77777D] block text-[10px] uppercase">Specification Format</span>
            <span className="text-[#D8D8DC] font-semibold mt-0.5 block">
              {metadata.specType.toUpperCase()} {metadata.openApiVersion}
            </span>
          </div>

          <div className="bg-[#0B0B0D] p-2.5 rounded border border-[#29292D]">
            <span className="text-[#77777D] block text-[10px] uppercase">Endpoints</span>
            <span className="text-[#D8D8DC] font-semibold mt-0.5 block">
              {canonical.endpoints?.length || 0} operations
            </span>
          </div>

          <div className="bg-[#0B0B0D] p-2.5 rounded border border-[#29292D]">
            <span className="text-[#77777D] block text-[10px] uppercase">Schemas</span>
            <span className="text-[#D8D8DC] font-semibold mt-0.5 block">
              {canonical.schemas?.length || 0} entities
            </span>
          </div>

          <div className="bg-[#0B0B0D] p-2.5 rounded border border-[#29292D]">
            <span className="text-[#77777D] block text-[10px] uppercase">Security Schemes</span>
            <span className="text-[#D8D8DC] font-semibold mt-0.5 block">
              {canonical.securitySchemes?.length || 0} schemes
            </span>
          </div>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#D8D8DC]">
          Indexed API Endpoints ({canonical.endpoints?.length || 0})
        </h3>

        <div className="bg-[#111113] border border-[#29292D] rounded-lg divide-y divide-[#29292D] overflow-hidden">
          {canonical.endpoints?.map((ep) => {
            const hasAuth = ep.security && ep.security.length > 0;
            return (
              <div
                key={ep.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#161619] transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${getMethodBadge(
                      ep.method
                    )}`}
                  >
                    {ep.method}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-semibold text-[#D8D8DC]">{ep.path}</span>
                      {ep.operationId && (
                        <span className="text-[10px] font-mono text-[#77777D] hidden md:inline">
                          ({ep.operationId})
                        </span>
                      )}
                    </div>
                    {ep.summary && <p className="text-xs text-[#77777D] mt-0.5">{ep.summary}</p>}
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => handleInspectEndpointBlast(ep)}
                    title="Analyze topological blast radius"
                    className="flex items-center space-x-1 px-2 py-1 rounded bg-[#161619] hover:bg-[#202024] text-[#D8D8DC] hover:text-[#C98A3D] border border-[#29292D] hover:border-[#C98A3D]/40 text-[10px] font-mono transition-colors"
                  >
                    <Activity className="w-3 h-3 text-[#C98A3D]" />
                    <span className="hidden sm:inline">Blast Radius</span>
                  </button>

                  {hasAuth ? (
                    <span className="flex items-center space-x-1 text-[#D8D8DC] text-[11px]">
                      <Lock className="w-3 h-3 text-[#C98A3D]" />
                      <span>{ep.security[0].schemeName}</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-[#77777D] text-[11px]">
                      <Unlock className="w-3 h-3" />
                      <span>Public</span>
                    </span>
                  )}

                  {ep.tags && ep.tags.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-[#0B0B0D] border border-[#29292D] text-[10px] text-[#77777D]">
                      {ep.tags[0]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Blast Radius Inspection Modal */}
      {selectedBlastEndpoint && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
          <div className="bg-[#111113] border border-[#29292D] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#29292D]">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-[#C98A3D]" />
                <h3 className="text-sm font-mono font-bold text-[#D8D8DC]">
                  Blast Radius: {selectedBlastEndpoint.method.toUpperCase()} {selectedBlastEndpoint.path}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedBlastEndpoint(null);
                  setEndpointBlastResult(null);
                }}
                className="p-1 text-[#77777D] hover:text-[#D8D8DC] rounded hover:bg-[#161619]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isAnalyzingBlast && (
              <div className="p-8 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-[#C98A3D] animate-spin mx-auto" />
                <p className="text-xs font-mono text-[#77777D]">Computing topological dependencies and impact level...</p>
              </div>
            )}

            {endpointBlastError && (
              <div className="p-4 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs font-mono">
                {endpointBlastError}
              </div>
            )}

            {endpointBlastResult && (
              <div className="space-y-4">
                <BlastRadiusCard result={endpointBlastResult} compact={false} />
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedBlastEndpoint(null);
                      setEndpointBlastResult(null);
                    }}
                    className="px-4 py-2 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
