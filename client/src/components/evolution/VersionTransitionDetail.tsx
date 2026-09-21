import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  Database,
  Lock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  Edit3,
  Zap,
  Info,
} from "lucide-react";
import {
  EvolutionTransition,
} from "../../types";

interface VersionTransitionDetailProps {
  transition: EvolutionTransition | null;
  onSimulateTransition?: (transition: EvolutionTransition) => void;
  onInspectDiff?: (transition: EvolutionTransition) => void;
}

export const VersionTransitionDetail: React.FC<VersionTransitionDetailProps> = ({
  transition,
  onSimulateTransition,
  onInspectDiff,
}) => {
  const [activeTab, setActiveTab] = useState<"breaking" | "added" | "removed" | "modified" | "all">("breaking");

  if (!transition) {
    return (
      <div className="p-8 text-center bg-[#111113] border border-[#29292D] rounded-xl space-y-3">
        <Info className="w-8 h-8 text-[#C98A3D] mx-auto" />
        <h4 className="text-sm font-semibold font-mono text-[#D8D8DC]">
          Select a Version Transition
        </h4>
        <p className="text-xs text-[#77777D] font-mono max-w-sm mx-auto">
          Click on any transition connector or version node on the left to analyze the contract changes, governance deltas, and breaking impacts.
        </p>
      </div>
    );
  }

  const { metrics, summary, diffReport } = transition;
  const hasBreaking = metrics.breakingChangesCount > 0;

  const totalAdded =
    summary.added.endpoints.length +
    summary.added.schemas.length +
    summary.added.parameters.length +
    summary.added.securitySchemes.length;

  const totalRemoved =
    summary.removed.endpoints.length +
    summary.removed.schemas.length +
    summary.removed.parameters.length +
    summary.removed.securitySchemes.length;

  const totalModified =
    summary.modified.endpoints.length +
    summary.modified.schemas.length +
    summary.modified.securitySchemes.length;

  return (
    <div className="bg-[#111113] border border-[#29292D] rounded-xl overflow-hidden space-y-6 p-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#29292D]">
        <div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs text-[#77777D] uppercase tracking-wider font-semibold">
              Transition Analysis
            </span>
            <span className="text-sm font-bold text-[#D8D8DC]">
              v{transition.fromVersion}
            </span>
            <ArrowRight className="w-4 h-4 text-[#77777D]" />
            <span className="text-sm font-bold text-[#C98A3D]">
              v{transition.toVersion}
            </span>
          </div>
          <p className="text-xs text-[#77777D] font-mono mt-1">
            {hasBreaking ? (
              <span className="text-[#E06C75] font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Breaking transition detected ({metrics.breakingChangesCount} breaking changes)
              </span>
            ) : (
              <span className="text-[#D8D8DC] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C98A3D]" />
                Backward-compatible non-breaking transition
              </span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          {onSimulateTransition && (
            <button
              onClick={() => onSimulateTransition(transition)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C98A3D] hover:bg-[#DCA052] text-[#0B0B0D] text-xs font-mono font-bold transition-colors shadow-sm"
              title="Experiment with simulated changes based on this transition"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Simulate in What-If</span>
            </button>
          )}

          {onInspectDiff && (
            <button
              onClick={() => onInspectDiff(transition)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161619] hover:bg-[#202024] text-[#D8D8DC] border border-[#29292D] text-xs font-mono transition-colors"
            >
              <span>Full Diff ({diffReport.changes.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Delta Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Endpoint Growth */}
        <div className="p-3.5 rounded-xl bg-[#0B0B0D] border border-[#29292D]">
          <div className="flex items-center justify-between text-[#77777D] mb-1">
            <span className="text-[11px] font-mono">Endpoints</span>
            <Layers className="w-3.5 h-3.5 text-[#77777D]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-lg font-bold font-mono ${
                metrics.endpointGrowth > 0
                  ? "text-[#C98A3D]"
                  : metrics.endpointGrowth < 0
                  ? "text-[#E06C75]"
                  : "text-[#D8D8DC]"
              }`}
            >
              {metrics.endpointGrowth > 0 ? "+" : ""}
              {metrics.endpointGrowth}
            </span>
            <span className="text-[11px] text-[#77777D] font-mono">delta</span>
          </div>
        </div>

        {/* Schema Growth */}
        <div className="p-3.5 rounded-xl bg-[#0B0B0D] border border-[#29292D]">
          <div className="flex items-center justify-between text-[#77777D] mb-1">
            <span className="text-[11px] font-mono">Schemas</span>
            <Database className="w-3.5 h-3.5 text-[#77777D]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-lg font-bold font-mono ${
                metrics.schemaGrowth > 0
                  ? "text-[#C98A3D]"
                  : metrics.schemaGrowth < 0
                  ? "text-[#E06C75]"
                  : "text-[#D8D8DC]"
              }`}
            >
              {metrics.schemaGrowth > 0 ? "+" : ""}
              {metrics.schemaGrowth}
            </span>
            <span className="text-[11px] text-[#77777D] font-mono">delta</span>
          </div>
        </div>

        {/* Governance Delta */}
        <div className="p-3.5 rounded-xl bg-[#0B0B0D] border border-[#29292D]">
          <div className="flex items-center justify-between text-[#77777D] mb-1">
            <span className="text-[11px] font-mono">Governance Delta</span>
            {metrics.governanceScoreDelta !== null && metrics.governanceScoreDelta >= 0 ? (
              <ShieldCheck className="w-3.5 h-3.5 text-[#C98A3D]" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-[#E06C75]" />
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-lg font-bold font-mono ${
                metrics.governanceScoreDelta === null
                  ? "text-[#77777D]"
                  : metrics.governanceScoreDelta > 0
                  ? "text-[#C98A3D]"
                  : metrics.governanceScoreDelta < 0
                  ? "text-[#E06C75]"
                  : "text-[#D8D8DC]"
              }`}
            >
              {metrics.governanceScoreDelta === null
                ? "N/A"
                : `${metrics.governanceScoreDelta > 0 ? "+" : ""}${metrics.governanceScoreDelta} pts`}
            </span>
          </div>
        </div>

        {/* Breaking Changes */}
        <div
          className={`p-3.5 rounded-xl border ${
            metrics.breakingChangesCount > 0
              ? "bg-[#E06C75]/10 border-[#E06C75]/30"
              : "bg-[#0B0B0D] border-[#29292D]"
          }`}
        >
          <div className="flex items-center justify-between text-[#77777D] mb-1">
            <span className="text-[11px] font-mono">Breaking Changes</span>
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                metrics.breakingChangesCount > 0 ? "text-[#E06C75]" : "text-[#77777D]"
              }`}
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-lg font-bold font-mono ${
                metrics.breakingChangesCount > 0 ? "text-[#E06C75]" : "text-[#D8D8DC]"
              }`}
            >
              {metrics.breakingChangesCount}
            </span>
            <span className="text-[11px] text-[#77777D] font-mono">
              / {metrics.nonBreakingChangesCount} non-breaking
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#29292D] pb-2">
        <button
          onClick={() => setActiveTab("breaking")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "breaking"
              ? "bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75]"
              : "text-[#77777D] hover:text-[#D8D8DC]"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-[#E06C75]" />
          <span>Breaking Changes ({summary.breaking.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("added")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "added"
              ? "bg-[#C98A3D]/15 border border-[#C98A3D]/40 text-[#C98A3D]"
              : "text-[#77777D] hover:text-[#D8D8DC]"
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#77777D]" />
          <span>Added ({totalAdded})</span>
        </button>

        <button
          onClick={() => setActiveTab("removed")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "removed"
              ? "bg-[#C98A3D]/15 border border-[#C98A3D]/40 text-[#C98A3D]"
              : "text-[#77777D] hover:text-[#D8D8DC]"
          }`}
        >
          <MinusCircle className="w-3.5 h-3.5 text-[#77777D]" />
          <span>Removed ({totalRemoved})</span>
        </button>

        <button
          onClick={() => setActiveTab("modified")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "modified"
              ? "bg-[#C98A3D]/15 border border-[#C98A3D]/40 text-[#C98A3D]"
              : "text-[#77777D] hover:text-[#D8D8DC]"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 text-[#77777D]" />
          <span>Modified ({totalModified})</span>
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="space-y-4">
        {/* Breaking Changes Tab */}
        {activeTab === "breaking" && (
          <div>
            {summary.breaking.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#77777D] bg-[#0B0B0D] rounded-xl border border-[#29292D]">
                No breaking changes detected between v{transition.fromVersion} and v{transition.toVersion}.
              </div>
            ) : (
              <div className="space-y-2.5">
                {summary.breaking.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-[#E06C75]/10 border border-[#E06C75]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-[#E06C75]/20 text-[#E06C75] border border-[#E06C75]/30 text-[10px] uppercase font-bold">
                          {c.category}
                        </span>
                        <span className="text-xs font-semibold text-[#D8D8DC]">
                          {c.path}
                        </span>
                      </div>
                      <p className="text-xs text-[#E06C75]/90 font-mono">
                        {c.description}
                      </p>
                    </div>

                    <div className="shrink-0 font-mono text-[11px] text-[#E06C75]/80">
                      [{c.changeType.toUpperCase()}]
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Added Entities Tab */}
        {activeTab === "added" && (
          <div className="space-y-4">
            {totalAdded === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#77777D] bg-[#0B0B0D] rounded-xl border border-[#29292D]">
                No entities added in this transition.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.added.endpoints.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#29292D] space-y-2">
                    <h5 className="text-xs font-mono font-semibold text-[#D8D8DC] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#77777D]" />
                      Endpoints Added ({summary.added.endpoints.length})
                    </h5>
                    <div className="space-y-1">
                      {summary.added.endpoints.map((ep) => (
                        <div
                          key={ep}
                          className="px-2 py-1 rounded bg-[#161619] text-xs font-mono text-[#D8D8DC] border border-[#29292D]"
                        >
                          {ep}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.added.schemas.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#29292D] space-y-2">
                    <h5 className="text-xs font-mono font-semibold text-[#D8D8DC] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#77777D]" />
                      Schemas Added ({summary.added.schemas.length})
                    </h5>
                    <div className="space-y-1">
                      {summary.added.schemas.map((s) => (
                        <div
                          key={s}
                          className="px-2 py-1 rounded bg-[#161619] text-xs font-mono text-[#D8D8DC] border border-[#29292D]"
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.added.parameters.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#29292D] space-y-2">
                    <h5 className="text-xs font-mono font-semibold text-[#D8D8DC] flex items-center gap-1.5">
                      Parameters Added ({summary.added.parameters.length})
                    </h5>
                    <div className="space-y-1">
                      {summary.added.parameters.map((p) => (
                        <div
                          key={p}
                          className="px-2 py-1 rounded bg-[#161619] text-xs font-mono text-[#D8D8DC] border border-[#29292D]"
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.added.securitySchemes.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#29292D] space-y-2">
                    <h5 className="text-xs font-mono font-semibold text-[#D8D8DC] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#77777D]" />
                      Security Schemes Added ({summary.added.securitySchemes.length})
                    </h5>
                    <div className="space-y-1">
                      {summary.added.securitySchemes.map((sec) => (
                        <div
                          key={sec}
                          className="px-2 py-1 rounded bg-[#161619] text-xs font-mono text-[#D8D8DC] border border-[#29292D]"
                        >
                          {sec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Removed Entities Tab */}
        {activeTab === "removed" && (
          <div className="space-y-4">
            {totalRemoved === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#77777D] bg-[#0B0B0D] rounded-xl border border-[#29292D]">
                No entities removed in this transition.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.removed.endpoints.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#29292D] space-y-2">
                    <h5 className="text-xs font-mono font-semibold text-[#E06C75] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#E06C75]" />
                      Endpoints Removed ({summary.removed.endpoints.length})
                    </h5>
                    <div className="space-y-1">
                      {summary.removed.endpoints.map((ep) => (
                        <div
                          key={ep}
                          className="px-2 py-1 rounded bg-[#161619] text-xs font-mono text-[#D8D8DC] border border-[#29292D]"
                        >
                          {ep}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.removed.schemas.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#29292D] space-y-2">
                    <h5 className="text-xs font-mono font-semibold text-[#E06C75] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#E06C75]" />
                      Schemas Removed ({summary.removed.schemas.length})
                    </h5>
                    <div className="space-y-1">
                      {summary.removed.schemas.map((s) => (
                        <div
                          key={s}
                          className="px-2 py-1 rounded bg-[#161619] text-xs font-mono text-[#D8D8DC] border border-[#29292D]"
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.removed.parameters.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#29292D] space-y-2">
                    <h5 className="text-xs font-mono font-semibold text-[#C98A3D] flex items-center gap-1.5">
                      Parameters Removed ({summary.removed.parameters.length})
                    </h5>
                    <div className="space-y-1">
                      {summary.removed.parameters.map((p) => (
                        <div
                          key={p}
                          className="px-2 py-1 rounded bg-[#161619] text-xs font-mono text-[#D8D8DC] border border-[#29292D]"
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.removed.securitySchemes.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#29292D] space-y-2">
                    <h5 className="text-xs font-mono font-semibold text-[#C98A3D] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#C98A3D]" />
                      Security Schemes Removed ({summary.removed.securitySchemes.length})
                    </h5>
                    <div className="space-y-1">
                      {summary.removed.securitySchemes.map((sec) => (
                        <div
                          key={sec}
                          className="px-2 py-1 rounded bg-[#161619] text-xs font-mono text-[#D8D8DC] border border-[#29292D]"
                        >
                          {sec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modified Entities Tab */}
        {activeTab === "modified" && (
          <div className="space-y-4">
            {totalModified === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#77777D] bg-[#0B0B0D] rounded-xl border border-[#29292D]">
                No entities modified in this transition.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.modified.endpoints.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#29292D] space-y-2">
                    <h5 className="text-xs font-mono font-semibold text-[#D8D8DC] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#77777D]" />
                      Endpoints Modified ({summary.modified.endpoints.length})
                    </h5>
                    <div className="space-y-1">
                      {summary.modified.endpoints.map((ep) => (
                        <div
                          key={ep}
                          className="px-2 py-1 rounded bg-[#161619] text-xs font-mono text-[#D8D8DC] border border-[#29292D]"
                        >
                          {ep}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.modified.schemas.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#29292D] space-y-2">
                    <h5 className="text-xs font-mono font-semibold text-[#D8D8DC] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#77777D]" />
                      Schemas Modified ({summary.modified.schemas.length})
                    </h5>
                    <div className="space-y-1">
                      {summary.modified.schemas.map((s) => (
                        <div
                          key={s}
                          className="px-2 py-1 rounded bg-[#161619] text-xs font-mono text-[#D8D8DC] border border-[#29292D]"
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.modified.securitySchemes.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-[#29292D] space-y-2">
                    <h5 className="text-xs font-mono font-semibold text-[#D8D8DC] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#77777D]" />
                      Security Schemes Modified ({summary.modified.securitySchemes.length})
                    </h5>
                    <div className="space-y-1">
                      {summary.modified.securitySchemes.map((sec) => (
                        <div
                          key={sec}
                          className="px-2 py-1 rounded bg-[#161619] text-xs font-mono text-[#D8D8DC] border border-[#29292D]"
                        >
                          {sec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
