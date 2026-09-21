import React from "react";
import {
  ShieldAlert,
  AlertOctagon,
  ArrowRight,
} from "lucide-react";
import { SimulationResult } from "../../types";

interface SimulationSummaryCardsProps {
  result: SimulationResult;
}

export const SimulationSummaryCards: React.FC<SimulationSummaryCardsProps> = ({ result }) => {
  const { summary, diff, governance } = result;

  const scoreDeltaColor =
    summary.governanceScoreDelta > 0
      ? "text-[#C98A3D] bg-[#C98A3D]/10 border-[#C98A3D]/30"
      : summary.governanceScoreDelta < 0
      ? "text-[#E06C75] bg-[#E06C75]/10 border-[#E06C75]/30"
      : "text-[#77777D] bg-[#161619] border-[#29292D]";

  return (
    <div className="space-y-4">
      {/* Before vs After Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Governance Score Before / After */}
        <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-[#77777D]">
            <span>Governance Score</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${scoreDeltaColor}`}>
              {summary.governanceScoreDelta > 0 ? `+${summary.governanceScoreDelta}` : summary.governanceScoreDelta} pts
            </span>
          </div>

          <div className="flex items-center space-x-3 my-2">
            <div>
              <span className="text-2xl font-bold font-mono text-[#D8D8DC]">
                {summary.governanceScoreBefore}
              </span>
              <span className="block text-[9px] uppercase text-[#77777D] font-mono">Current</span>
            </div>

            <ArrowRight className="w-4 h-4 text-[#77777D]" />

            <div>
              <span className={`text-2xl font-bold font-mono ${
                summary.governanceScoreAfter >= 80
                  ? "text-[#D8D8DC]"
                  : summary.governanceScoreAfter >= 60
                  ? "text-[#C98A3D]"
                  : "text-[#E06C75]"
              }`}>
                {summary.governanceScoreAfter}
              </span>
              <span className="block text-[9px] uppercase text-[#77777D] font-mono">Simulated</span>
            </div>
          </div>

          <p className="text-[10px] text-[#77777D] leading-tight">
            {summary.governanceScoreDelta < 0
              ? "Hypothetical change degrades policy compliance."
              : summary.governanceScoreDelta > 0
              ? "Hypothetical change improves compliance score."
              : "No net change in governance score."}
          </p>
        </div>

        {/* Breaking Changes */}
        <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase text-[#77777D]">Contract Compatibility</span>
          <div className="my-2">
            <span className={`text-3xl font-bold font-mono ${
              summary.isBreaking ? "text-[#E06C75]" : "text-[#D8D8DC]"
            }`}>
              {summary.breakingChangesCount}
            </span>
            <span className="text-xs font-mono text-[#77777D] ml-1.5">
              {summary.breakingChangesCount === 1 ? "breaking change" : "breaking changes"}
            </span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-block w-max ${
            summary.isBreaking
              ? "bg-[#E06C75]/10 text-[#E06C75] border-[#E06C75]/30"
              : "bg-[#161619] text-[#77777D] border-[#29292D]"
          }`}>
            {summary.isBreaking ? "Backwards Incompatible" : "Non-Breaking Drift"}
          </span>
        </div>

        {/* New Governance Findings */}
        <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase text-[#77777D]">New Policy Violations</span>
          <div className="my-2">
            <span className={`text-3xl font-bold font-mono ${
              summary.newGovernanceFindingsCount > 0 ? "text-[#C98A3D]" : "text-[#D8D8DC]"
            }`}>
              {summary.newGovernanceFindingsCount}
            </span>
            <span className="text-xs font-mono text-[#77777D] ml-1.5">triggered</span>
          </div>
          <span className="text-[10px] text-[#77777D] font-mono">
            {summary.resolvedGovernanceFindingsCount} resolved finding(s)
          </span>
        </div>

        {/* Blast Radius Impact Level */}
        <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase text-[#77777D]">Blast Radius Impact</span>
          <div className="my-2">
            <span className={`text-xl font-bold font-mono uppercase ${
              summary.impactLevel === "CRITICAL"
                ? "text-[#E06C75]"
                : summary.impactLevel === "HIGH"
                ? "text-[#C98A3D]"
                : "text-[#D8D8DC]"
            }`}>
              {summary.impactLevel}
            </span>
          </div>
          <span className="text-[10px] text-[#77777D] font-mono">
            {summary.affectedEndpointsCount} endpoints, {summary.affectedSchemasCount} schemas affected
          </span>
        </div>
      </div>

      {/* Breaking Changes Detail Banner */}
      {diff.changes.length > 0 && (
        <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-mono uppercase font-semibold text-[#D8D8DC] flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-[#E06C75]" />
            <span>AST Contract Drift Details ({diff.changes.length})</span>
          </h4>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {diff.changes.map((c) => (
              <div
                key={c.id}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  c.severity === "breaking"
                    ? "bg-[#E06C75]/10 border-[#E06C75]/30 text-[#E06C75]"
                    : "bg-[#161619] border-[#29292D] text-[#D8D8DC]"
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                    c.severity === "breaking"
                      ? "bg-[#E06C75]/20 text-[#E06C75]"
                      : "bg-[#29292D] text-[#77777D]"
                  }`}>
                    {c.severity}
                  </span>
                  <span className="font-mono text-[#D8D8DC] truncate">{c.description}</span>
                </div>
                <span className="text-[10px] font-mono text-[#77777D] uppercase">{c.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Governance Findings Detail Banner */}
      {governance.newFindings.length > 0 && (
        <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-mono uppercase font-semibold text-[#D8D8DC] flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-[#C98A3D]" />
            <span>New Governance Violations ({governance.newFindings.length})</span>
          </h4>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {governance.newFindings.map((f) => (
              <div
                key={f.id}
                className="p-3 rounded-lg bg-[#161619] border border-[#29292D] text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold bg-[#C98A3D]/15 text-[#C98A3D] border border-[#C98A3D]/30">
                      {f.severity}
                    </span>
                    <span className="font-semibold text-[#D8D8DC]">{f.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#77777D]">{f.ruleId}</span>
                </div>
                <p className="text-[11px] text-[#77777D]">{f.description}</p>
                {f.remediation && (
                  <p className="text-[10px] text-[#C98A3D] font-mono pt-1">
                    Recommendation: {f.remediation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
