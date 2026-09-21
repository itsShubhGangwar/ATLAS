import React from "react";
import {
  GitCommit,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Layers,
  Database,
  Lock,
  Calendar,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  EvolutionVersionItem,
  EvolutionTransition,
} from "../../types";

interface EvolutionTimelineProps {
  versions: EvolutionVersionItem[];
  transitions: EvolutionTransition[];
  selectedVersionId: string | null;
  selectedTransitionIndex: number | null;
  onSelectVersion: (versionId: string) => void;
  onSelectTransition: (transitionIndex: number) => void;
  onOpenVersionDetail?: (versionId: string) => void;
}

export const EvolutionTimeline: React.FC<EvolutionTimelineProps> = ({
  versions,
  transitions,
  selectedVersionId,
  selectedTransitionIndex,
  onSelectVersion,
  onSelectTransition,
  onOpenVersionDetail,
}) => {
  if (versions.length === 0) {
    return (
      <div className="p-8 text-center text-[#77777D] font-mono text-xs bg-[#111113] border border-[#29292D] rounded-xl">
        No API versions published yet in this project.
      </div>
    );
  }

  const getGovernanceColor = (score: number | null) => {
    if (score === null) return "text-[#77777D] bg-[#161619] border-[#29292D]";
    if (score >= 80) return "text-[#D8D8DC] bg-[#161619] border-[#29292D]";
    if (score >= 60) return "text-[#C98A3D] bg-[#C98A3D]/10 border-[#C98A3D]/30";
    return "text-[#E06C75] bg-[#E06C75]/10 border-[#E06C75]/30";
  };

  return (
    <div className="relative py-4 space-y-6">
      {versions.map((ver, idx) => {
        const isSelected = selectedVersionId === ver.id;
        const isCurrent = idx === versions.length - 1;
        const transition = idx > 0 ? transitions[idx - 1] : null;
        const transitionIdx = idx > 0 ? idx - 1 : null;
        const isTransitionSelected =
          transitionIdx !== null && selectedTransitionIndex === transitionIdx;

        return (
          <div key={ver.id} className="relative">
            {/* Transition Connector Line and Transition Badge from previous version */}
            {transition && transitionIdx !== null && (
              <div className="relative pl-6 pb-6 ml-6 border-l-2 border-dashed border-[#29292D]">
                <div
                  onClick={() => onSelectTransition(transitionIdx)}
                  className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all shadow-sm ${
                    isTransitionSelected
                      ? "bg-[#C98A3D]/15 border-[#C98A3D] text-[#C98A3D] ring-1 ring-[#C98A3D]/40"
                      : "bg-[#111113] hover:bg-[#161619] border-[#29292D] text-[#77777D] hover:text-[#D8D8DC]"
                  }`}
                >
                  <span className="text-[11px] text-[#77777D] font-semibold">
                    v{transition.fromVersion}
                  </span>
                  <ArrowRight className="w-3 h-3 text-[#77777D]" />
                  <span className="text-[11px] text-[#D8D8DC] font-semibold">
                    v{transition.toVersion}
                  </span>

                  {/* Breaking Changes Pill */}
                  {transition.metrics.breakingChangesCount > 0 ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E06C75]/10 text-[#E06C75] border border-[#E06C75]/30 text-[10px] font-bold">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {transition.metrics.breakingChangesCount} breaking
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-[#161619] text-[#77777D] border border-[#29292D] text-[10px]">
                      non-breaking
                    </span>
                  )}

                  {/* Growth indicators */}
                  {transition.metrics.endpointGrowth !== 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-[#D8D8DC] bg-[#161619] border border-[#29292D]">
                      {transition.metrics.endpointGrowth > 0 ? "+" : ""}
                      {transition.metrics.endpointGrowth} ep
                    </span>
                  )}

                  {/* Governance score delta */}
                  {transition.metrics.governanceScoreDelta !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        transition.metrics.governanceScoreDelta >= 0
                          ? "text-[#C98A3D] bg-[#C98A3D]/10 border border-[#C98A3D]/30"
                          : "text-[#E06C75] bg-[#E06C75]/10 border border-[#E06C75]/30"
                      }`}
                    >
                      Gov: {transition.metrics.governanceScoreDelta >= 0 ? "+" : ""}
                      {transition.metrics.governanceScoreDelta} pts
                    </span>
                  )}

                  <ChevronRight className="w-3 h-3 ml-1 text-[#77777D]" />
                </div>
              </div>
            )}

            {/* Version Node Card */}
            <div className="flex items-start gap-4">
              {/* Timeline marker icon */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                  isSelected
                    ? "bg-[#C98A3D] border-[#DCA052] text-[#0B0B0D] shadow-md shadow-[#C98A3D]/20 font-bold"
                    : isCurrent
                    ? "bg-[#161619] border-[#C98A3D]/50 text-[#C98A3D]"
                    : "bg-[#161619] border-[#29292D] text-[#77777D]"
                }`}
              >
                <GitCommit className="w-5 h-5" />
              </div>

              {/* Main Version Details Container */}
              <div
                onClick={() => onSelectVersion(ver.id)}
                className={`flex-1 p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#161619] border-[#C98A3D]/70 shadow-md ring-1 ring-[#C98A3D]/40"
                    : "bg-[#111113] hover:bg-[#161619] border-[#29292D]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#29292D]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-bold font-mono text-[#D8D8DC]">
                      v{ver.version}
                    </span>
                    {ver.name && (
                      <span className="text-xs text-[#77777D] font-mono font-medium">
                        "{ver.name}"
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#0B0B0D] text-[#77777D] border border-[#29292D]">
                      {ver.openApiVersion}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C98A3D]/15 text-[#C98A3D] border border-[#C98A3D]/30 font-semibold">
                        CURRENT RELEASE
                      </span>
                    )}
                    {idx === 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0B0D] text-[#77777D] border border-[#29292D]">
                        ORIGIN
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#77777D] font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(ver.createdAt).toLocaleDateString()}</span>
                    {onOpenVersionDetail && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenVersionDetail(ver.id);
                        }}
                        className="ml-2 inline-flex items-center gap-1 text-[11px] text-[#C98A3D] hover:text-[#DCA052] hover:underline"
                        title="View Full Version Details"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics Badges Row */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC]">
                    <Layers className="w-3.5 h-3.5 text-[#77777D]" />
                    <span className="font-semibold text-[#D8D8DC]">{ver.endpointCount}</span>
                    <span className="text-[#77777D]">endpoints</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC]">
                    <Database className="w-3.5 h-3.5 text-[#77777D]" />
                    <span className="font-semibold text-[#D8D8DC]">{ver.schemaCount}</span>
                    <span className="text-[#77777D]">schemas</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC]">
                    <Lock className="w-3.5 h-3.5 text-[#77777D]" />
                    <span className="font-semibold text-[#D8D8DC]">{ver.securitySchemeCount}</span>
                    <span className="text-[#77777D]">security</span>
                  </div>

                  {/* Governance Score Badge */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono ${getGovernanceColor(
                      ver.governanceScore
                    )}`}
                  >
                    {ver.governanceScore !== null ? (
                      ver.governanceScore >= 80 ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {ver.governanceScore !== null
                        ? `Governance: ${ver.governanceScore}/100`
                        : "No Audit"}
                    </span>
                  </div>

                  {/* Changes from previous summary badge */}
                  {ver.changesFromPrevious && (
                    <div className="ml-auto flex items-center gap-2">
                      {ver.changesFromPrevious.breaking > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] font-semibold">
                          ⚠️ {ver.changesFromPrevious.breaking} Breaking
                        </span>
                      )}
                      {ver.changesFromPrevious.nonBreaking > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161619] border border-[#29292D] text-[#77777D]">
                          +{ver.changesFromPrevious.nonBreaking} changes
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
