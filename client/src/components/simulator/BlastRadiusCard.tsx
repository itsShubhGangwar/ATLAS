import React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Compass,
  Box,
  Lock,
  Tag,
  Info,
} from "lucide-react";
import { BlastRadiusResult, BlastRadiusImpactLevel } from "../../types";

interface BlastRadiusCardProps {
  result: BlastRadiusResult;
  onSelectNode?: (nodeId: string) => void;
  compact?: boolean;
}

export const BlastRadiusCard: React.FC<BlastRadiusCardProps> = ({
  result,
  onSelectNode,
  compact = false,
}) => {
  const getImpactBadge = (level: BlastRadiusImpactLevel) => {
    switch (level) {
      case "CRITICAL":
        return {
          bg: "bg-[#E06C75]/10 border-[#E06C75]/30 text-[#E06C75]",
          icon: AlertOctagon,
          label: "CRITICAL IMPACT",
          desc: "Central security boundary or widely shared schema affecting critical API contracts.",
        };
      case "HIGH":
        return {
          bg: "bg-[#C98A3D]/15 border-[#C98A3D]/30 text-[#C98A3D]",
          icon: AlertTriangle,
          label: "HIGH IMPACT",
          desc: "Shared schema or security component with multiple dependent endpoints.",
        };
      case "MEDIUM":
        return {
          bg: "bg-[#161619] border-[#29292D] text-[#D8D8DC]",
          icon: ShieldAlert,
          label: "MEDIUM IMPACT",
          desc: "Affects multiple schemas or consumers with localized blast radius.",
        };
      case "LOW":
      default:
        return {
          bg: "bg-[#161619] border-[#29292D] text-[#77777D]",
          icon: CheckCircle2,
          label: "LOW IMPACT",
          desc: "Isolated component with minimal or zero downstream dependencies.",
        };
    }
  };

  const impact = getImpactBadge(result.impactLevel);
  const ImpactIcon = impact.icon;

  return (
    <div className={`bg-[#111113] border border-[#29292D] rounded-xl overflow-hidden text-[#D8D8DC] ${compact ? "p-0 text-xs" : ""}`}>
      {/* Impact Header */}
      <div className="p-4 border-b border-[#29292D] bg-[#0B0B0D] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#161619] border border-[#29292D] flex items-center justify-center text-[#77777D]">
            <Compass className="w-4 h-4 text-[#C98A3D]" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase text-[#D8D8DC] tracking-wider">
              Blast-Radius Analysis
            </h4>
            <p className="text-[11px] text-[#77777D] font-mono">{result.targetLabel}</p>
          </div>
        </div>

        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold ${impact.bg}`}>
          <ImpactIcon className="w-3.5 h-3.5" />
          <span>{impact.label}</span>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-4 divide-x divide-[#29292D] border-b border-[#29292D] bg-[#161619]/40 text-center py-2.5">
        <div>
          <span className="block text-[10px] uppercase text-[#77777D] font-mono">Endpoints</span>
          <span className="text-sm font-bold font-mono text-[#D8D8DC]">{result.metrics.endpointsCount}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase text-[#77777D] font-mono">Schemas</span>
          <span className="text-sm font-bold font-mono text-[#D8D8DC]">{result.metrics.schemasCount}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase text-[#77777D] font-mono">Security</span>
          <span className="text-sm font-bold font-mono text-[#D8D8DC]">{result.metrics.securityCount}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase text-[#77777D] font-mono">Tags</span>
          <span className="text-sm font-bold font-mono text-[#D8D8DC]">{result.metrics.tagsCount}</span>
        </div>
      </div>

      {/* Analysis Content */}
      <div className="p-4 space-y-4 text-xs">
        {/* Why this impact level? */}
        <div>
          <h5 className="text-[11px] font-mono uppercase tracking-wider text-[#77777D] font-semibold mb-2 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-[#77777D]" />
            <span>Topological Impact Rationale</span>
          </h5>
          <ul className="space-y-1 text-[#77777D] pl-2 border-l border-[#29292D]">
            {result.reasons.map((r, i) => (
              <li key={i} className="text-[11px] leading-relaxed flex items-start space-x-2">
                <span className="text-[#C98A3D] select-none">•</span>
                <span className="text-[#D8D8DC]">{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Affected Endpoints */}
        {result.affectedEndpoints.length > 0 && (
          <div>
            <h5 className="text-[11px] font-mono uppercase tracking-wider text-[#77777D] font-semibold mb-1.5 flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-[#C98A3D]" />
              <span>Interconnected Endpoints ({result.affectedEndpoints.length})</span>
            </h5>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {result.affectedEndpoints.map((ep) => (
                <div
                  key={ep.id}
                  onClick={() => onSelectNode && onSelectNode(ep.id)}
                  className={`p-2 rounded bg-[#161619] border border-[#29292D] flex items-center justify-between text-[11px] ${
                    onSelectNode ? "hover:border-[#C98A3D]/50 cursor-pointer group" : ""
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#1A1A1E] text-[#D8D8DC] border border-[#29292D]">
                      {ep.method}
                    </span>
                    <span className="font-mono text-[#D8D8DC] truncate">{ep.path}</span>
                  </div>
                  <span className="text-[10px] text-[#77777D] truncate max-w-[180px]">{ep.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Affected Schemas */}
        {result.affectedSchemas.length > 0 && (
          <div>
            <h5 className="text-[11px] font-mono uppercase tracking-wider text-[#77777D] font-semibold mb-1.5 flex items-center space-x-1.5">
              <Box className="w-3.5 h-3.5 text-[#77777D]" />
              <span>Bound Data Schemas ({result.affectedSchemas.length})</span>
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {result.affectedSchemas.map((s) => (
                <button
                  key={s.name}
                  onClick={() => onSelectNode && onSelectNode(`schema:${s.name}`)}
                  className={`px-2 py-1 rounded bg-[#161619] text-[#D8D8DC] border border-[#29292D] text-[11px] font-mono flex items-center space-x-1.5 ${
                    onSelectNode ? "hover:border-[#C98A3D]/50 hover:text-[#C98A3D] transition-colors" : ""
                  }`}
                  title={s.reason}
                >
                  <span>{s.name}</span>
                  <span className="text-[9px] text-[#77777D]">({s.reason})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Security Schemes */}
        {result.affectedSecuritySchemes.length > 0 && (
          <div>
            <h5 className="text-[11px] font-mono uppercase tracking-wider text-[#77777D] font-semibold mb-1.5 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-[#77777D]" />
              <span>Security Boundaries ({result.affectedSecuritySchemes.length})</span>
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {result.affectedSecuritySchemes.map((sec) => (
                <div
                  key={sec.name}
                  className="px-2 py-1 rounded bg-[#161619] text-[#D8D8DC] border border-[#29292D] text-[11px] font-mono flex items-center space-x-1.5"
                  title={sec.reason}
                >
                  <Lock className="w-3 h-3 text-[#77777D]" />
                  <span>{sec.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top-level tags */}
        {result.affectedTags.length > 0 && (
          <div className="pt-2 border-t border-[#29292D] flex items-center space-x-2 text-[11px] text-[#77777D] font-mono">
            <Tag className="w-3 h-3 text-[#77777D]" />
            <span>Tags: {result.affectedTags.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
};
