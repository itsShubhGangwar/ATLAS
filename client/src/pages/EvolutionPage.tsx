import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  History,
  AlertTriangle,
  LayoutList,
  Network,
  Columns,
  RefreshCw,
  FolderGit2,
} from "lucide-react";
import {
  ProjectEvolutionReport,
  EvolutionTransition,
  CanonicalApiModel,
  Project,
} from "../types";
import {
  getProjectEvolutionApi,
  getVersionByIdApi,
  listProjectsApi,
} from "../services/api";
import { EvolutionTimeline } from "../components/evolution/EvolutionTimeline";
import { VersionTransitionDetail } from "../components/evolution/VersionTransitionDetail";
import { EvolutionGraph } from "../components/evolution/EvolutionGraph";

interface EvolutionPageProps {
  projectId?: string | null;
  initialReport?: ProjectEvolutionReport | null;
  onBack: () => void;
  onOpenVersion?: (versionId: string) => void;
  onOpenSimulator?: (model: CanonicalApiModel) => void;
  onOpenDiff?: (baseModel: CanonicalApiModel, newModel: CanonicalApiModel) => void;
}

export const EvolutionPage: React.FC<EvolutionPageProps> = ({
  projectId: initialProjectId,
  initialReport,
  onBack,
  onOpenVersion,
  onOpenSimulator,
  onOpenDiff,
}) => {
  const [projectId, setProjectId] = useState<string | null>(initialProjectId || null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [report, setReport] = useState<ProjectEvolutionReport | null>(initialReport || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialReport);
  const [error, setError] = useState<string | null>(null);

  // View modes: "timeline" | "graph" | "split"
  const [viewMode, setViewMode] = useState<"split" | "timeline" | "graph">("split");

  // Selection states
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedTransitionIndex, setSelectedTransitionIndex] = useState<number | null>(null);

  // Load available projects if no initialProjectId provided or for project selector
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await listProjectsApi();
        if (res.success && res.data) {
          setProjects(res.data);
          if (!projectId && res.data.length > 0) {
            setProjectId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load projects list", err);
      }
    };
    loadProjects();
  }, []);

  // Fetch evolution report for active project
  const loadEvolution = useCallback(async (projId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getProjectEvolutionApi(projId);
      if (res.success && res.data) {
        setReport(res.data);
        // Default to selecting the latest transition or latest version
        if (res.data.transitions.length > 0) {
          const latestIdx = res.data.transitions.length - 1;
          setSelectedTransitionIndex(latestIdx);
          setSelectedVersionId(res.data.transitions[latestIdx].toVersionId);
        } else if (res.data.versions.length > 0) {
          setSelectedVersionId(res.data.versions[0].id);
          setSelectedTransitionIndex(null);
        }
      } else {
        setError(res.error || "Failed to load project evolution.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
      setIsLoading(false);
      if (initialReport.transitions.length > 0) {
        const latestIdx = initialReport.transitions.length - 1;
        setSelectedTransitionIndex(latestIdx);
        setSelectedVersionId(initialReport.transitions[latestIdx].toVersionId);
      } else if (initialReport.versions.length > 0) {
        setSelectedVersionId(initialReport.versions[0].id);
        setSelectedTransitionIndex(null);
      }
      return;
    }

    if (projectId) {
      loadEvolution(projectId);
    } else {
      setIsLoading(false);
    }
  }, [projectId, initialReport, loadEvolution]);

  // Handle version selection
  const handleSelectVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    if (!report) return;
    // Find transition where this version is target or source
    const transIdx = report.transitions.findIndex((t) => t.toVersionId === versionId);
    if (transIdx !== -1) {
      setSelectedTransitionIndex(transIdx);
    } else {
      const srcIdx = report.transitions.findIndex((t) => t.fromVersionId === versionId);
      if (srcIdx !== -1) {
        setSelectedTransitionIndex(srcIdx);
      }
    }
  };

  // Handle transition selection
  const handleSelectTransition = (transitionIndex: number) => {
    setSelectedTransitionIndex(transitionIndex);
    if (report && report.transitions[transitionIndex]) {
      setSelectedVersionId(report.transitions[transitionIndex].toVersionId);
    }
  };

  // Handle simulate transition
  const handleSimulateTransition = async (transition: EvolutionTransition) => {
    if (!onOpenSimulator || !projectId) return;
    try {
      // Fetch target version's canonical model
      const res = await getVersionByIdApi(projectId, transition.toVersionId);
      if (res.success && res.data?.canonicalModel) {
        onOpenSimulator(res.data.canonicalModel);
      } else {
        alert("Failed to load canonical model for simulation.");
      }
    } catch (err: any) {
      alert(err.message || "Error launching simulator.");
    }
  };

  // Handle full diff inspection
  const handleInspectDiff = async (transition: EvolutionTransition) => {
    if (!onOpenDiff || !projectId) return;
    try {
      const [baseRes, newRes] = await Promise.all([
        getVersionByIdApi(projectId, transition.fromVersionId),
        getVersionByIdApi(projectId, transition.toVersionId),
      ]);
      if (
        baseRes.success &&
        baseRes.data?.canonicalModel &&
        newRes.success &&
        newRes.data?.canonicalModel
      ) {
        onOpenDiff(baseRes.data.canonicalModel, newRes.data.canonicalModel);
      } else {
        alert("Failed to load versions for diff view.");
      }
    } catch (err: any) {
      alert(err.message || "Error loading diff comparison.");
    }
  };

  const selectedTransition =
    report && selectedTransitionIndex !== null
      ? report.transitions[selectedTransitionIndex] || null
      : null;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#111113] border border-[#29292D] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 text-xs text-[#77777D] hover:text-[#D8D8DC] transition-colors font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {/* Project Selector if projects exist */}
          {projects.length > 1 && (
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-3.5 h-3.5 text-[#77777D]" />
              <select
                value={projectId || ""}
                onChange={(e) => setProjectId(e.target.value)}
                className="bg-[#0B0B0D] border border-[#29292D] rounded-lg px-2.5 py-1 text-xs font-mono text-[#D8D8DC] focus:outline-none focus:border-[#C98A3D]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center space-x-2.5">
              <History className="w-6 h-6 text-[#C98A3D]" />
              <h2 className="text-xl font-bold text-[#D8D8DC] font-mono">
                API Evolution &amp; Decision Timeline
              </h2>
            </div>
            <p className="text-xs text-[#77777D] mt-1 max-w-2xl leading-relaxed">
              Track lifecycle mutations, breaking contract drifts, governance trends, and architectural decisions across versions for{" "}
              <span className="text-[#D8D8DC] font-semibold font-mono">
                {report?.project.name || "selected project"}
              </span>.
            </p>
          </div>

          {/* View Mode Toggle Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-[#0B0B0D] rounded-lg border border-[#29292D]">
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                viewMode === "timeline"
                  ? "bg-[#C98A3D] text-[#0B0B0D] font-bold shadow-sm"
                  : "text-[#77777D] hover:text-[#D8D8DC]"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>

            <button
              onClick={() => setViewMode("graph")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                viewMode === "graph"
                  ? "bg-[#C98A3D] text-[#0B0B0D] font-bold shadow-sm"
                  : "text-[#77777D] hover:text-[#D8D8DC]"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Lineage Graph</span>
            </button>

            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                viewMode === "split"
                  ? "bg-[#C98A3D] text-[#0B0B0D] font-bold shadow-sm"
                  : "text-[#77777D] hover:text-[#D8D8DC]"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#E06C75] shrink-0" />
            <span>{error}</span>
          </div>
          {projectId && (
            <button
              onClick={() => loadEvolution(projectId)}
              className="px-2.5 py-1 rounded bg-[#161619] hover:bg-[#202024] text-[#D8D8DC] border border-[#29292D] font-mono text-[11px] flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-16 text-center text-[#77777D] font-mono text-xs bg-[#111113] border border-[#29292D] rounded-xl space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#C98A3D] mx-auto" />
          <p>Analyzing chronological API evolution and computing deterministic diffs...</p>
        </div>
      )}

      {/* Main Content when Report is loaded */}
      {!isLoading && report && (
        <div className="space-y-6">
          {/* Overall Evolution KPIs Header Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Total Versions */}
            <div className="p-4 rounded-xl bg-[#111113] border border-[#29292D]">
              <span className="text-[11px] text-[#77777D] font-mono block mb-1">Total Versions</span>
              <span className="text-xl font-bold font-mono text-[#D8D8DC]">
                {report.summary.totalVersions}
              </span>
            </div>

            {/* Span: Initial -> Current */}
            <div className="p-4 rounded-xl bg-[#111113] border border-[#29292D]">
              <span className="text-[11px] text-[#77777D] font-mono block mb-1">Version Span</span>
              <div className="flex items-center gap-1.5 text-sm font-bold font-mono text-[#D8D8DC] truncate">
                <span>v{report.summary.initialVersion || "—"}</span>
                <span className="text-[#77777D]">→</span>
                <span>v{report.summary.currentVersion || "—"}</span>
              </div>
            </div>

            {/* Endpoints Net Growth */}
            <div className="p-4 rounded-xl bg-[#111113] border border-[#29292D]">
              <span className="text-[11px] text-[#77777D] font-mono block mb-1">Endpoint Net Growth</span>
              <span className="text-xl font-bold font-mono text-[#D8D8DC]">
                {report.summary.totalEndpointsGrowth > 0 ? "+" : ""}
                {report.summary.totalEndpointsGrowth}
              </span>
            </div>

            {/* Schemas Net Growth */}
            <div className="p-4 rounded-xl bg-[#111113] border border-[#29292D]">
              <span className="text-[11px] text-[#77777D] font-mono block mb-1">Schema Net Growth</span>
              <span className="text-xl font-bold font-mono text-[#D8D8DC]">
                {report.summary.totalSchemasGrowth > 0 ? "+" : ""}
                {report.summary.totalSchemasGrowth}
              </span>
            </div>

            {/* Total Breaking Changes */}
            <div
              className={`p-4 rounded-xl border ${
                report.summary.totalBreakingChangesAcrossHistory > 0
                  ? "bg-[#E06C75]/10 border-[#E06C75]/30"
                  : "bg-[#111113] border-[#29292D]"
              }`}
            >
              <span className="text-[11px] text-[#77777D] font-mono block mb-1">
                Historical Breaking
              </span>
              <span
                className={`text-xl font-bold font-mono ${
                  report.summary.totalBreakingChangesAcrossHistory > 0
                    ? "text-[#E06C75]"
                    : "text-[#D8D8DC]"
                }`}
              >
                {report.summary.totalBreakingChangesAcrossHistory}
              </span>
            </div>
          </div>

          {/* Interactive Lineage Graph View */}
          {(viewMode === "graph" || viewMode === "split") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-semibold uppercase text-[#77777D] tracking-wider flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-[#77777D]" />
                  Interactive API Lineage Graph
                </h3>
                <span className="text-[11px] text-[#77777D] font-mono">
                  Click nodes or transition edges to inspect
                </span>
              </div>
              <EvolutionGraph
                versions={report.versions}
                transitions={report.transitions}
                selectedVersionId={selectedVersionId}
                selectedTransitionIndex={selectedTransitionIndex}
                onSelectVersion={handleSelectVersion}
                onSelectTransition={handleSelectTransition}
              />
            </div>
          )}

          {/* Split / Timeline / Transition Detail Section */}
          <div
            className={`grid gap-6 ${
              viewMode === "split"
                ? "grid-cols-1 lg:grid-cols-12"
                : viewMode === "timeline"
                ? "grid-cols-1 lg:grid-cols-12"
                : "grid-cols-1"
            }`}
          >
            {/* Timeline Column */}
            {(viewMode === "split" || viewMode === "timeline") && (
              <div
                className={`${
                  viewMode === "split" ? "lg:col-span-5" : "lg:col-span-5"
                } space-y-2`}
              >
                <h3 className="text-xs font-mono font-semibold uppercase text-[#77777D] tracking-wider flex items-center gap-1.5">
                  <LayoutList className="w-3.5 h-3.5 text-[#77777D]" />
                  Chronological Release Timeline
                </h3>
                <EvolutionTimeline
                  versions={report.versions}
                  transitions={report.transitions}
                  selectedVersionId={selectedVersionId}
                  selectedTransitionIndex={selectedTransitionIndex}
                  onSelectVersion={handleSelectVersion}
                  onSelectTransition={handleSelectTransition}
                  onOpenVersionDetail={onOpenVersion}
                />
              </div>
            )}

            {/* Transition Inspection Column */}
            <div
              className={`${
                viewMode === "split"
                  ? "lg:col-span-7"
                  : viewMode === "timeline"
                  ? "lg:col-span-7"
                  : "col-span-1"
              } space-y-2`}
            >
              <h3 className="text-xs font-mono font-semibold uppercase text-[#77777D] tracking-wider flex items-center gap-1.5">
                <Columns className="w-3.5 h-3.5 text-[#77777D]" />
                Transition Delta Inspector
              </h3>
              <VersionTransitionDetail
                transition={selectedTransition}
                onSimulateTransition={handleSimulateTransition}
                onInspectDiff={handleInspectDiff}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
