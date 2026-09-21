import React, { useState, useEffect } from "react";
import {
  Terminal,
  Activity,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { diagnostics, DiagnosticLogEntry } from "../../services/diagnostics";

export const DiagnosticsPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"logs" | "diagnostics" | "analysis">("logs");
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const [summary, setSummary] = useState(diagnostics.getSummary());

  useEffect(() => {
    setLogs([...diagnostics.getLogs()]);
    setSummary({ ...diagnostics.getSummary() });

    const unsubscribe = diagnostics.subscribe(() => {
      setLogs([...diagnostics.getLogs()]);
      setSummary({ ...diagnostics.getSummary() });
    });
    return unsubscribe;
  }, []);

  const latestLog = logs[0] || null;

  const getLevelDot = (level: string) => {
    switch (level) {
      case "error":
        return "bg-[#E06C75]";
      case "warn":
        return "bg-[#C98A3D]";
      default:
        return "bg-[#77777D]";
    }
  };

  const getSourceBadge = (_source: string) => {
    return "text-[#77777D] bg-[#161619] border-[#29292D]";
  };

  return (
    <footer className="border-t border-[#29292D] bg-[#111113] text-[#D8D8DC] font-mono text-xs select-none relative z-30 transition-all">
      {/* Expanded Drawer */}
      {isExpanded && (
        <div className="h-48 border-b border-[#29292D] bg-[#0B0B0D] p-3 overflow-y-auto flex flex-col">
          {activeTab === "logs" && (
            <div className="space-y-1 overflow-y-auto pr-2 font-mono text-[11px] leading-relaxed">
              {logs.length === 0 ? (
                <div className="text-[#77777D] py-4 text-center">No logs recorded yet.</div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 hover:bg-[#161619] px-2 py-0.5 rounded transition-colors"
                  >
                    <span className="text-[#77777D] shrink-0 select-none">[{log.timestamp}]</span>
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${getLevelDot(
                        log.level
                      )}`}
                    />
                    <span
                      className={`px-1 rounded border text-[9px] uppercase font-bold shrink-0 ${getSourceBadge(
                        log.source
                      )}`}
                    >
                      {log.source}
                    </span>
                    <span className="text-[#D8D8DC] break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "diagnostics" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-2 font-mono">
              <div className="p-2.5 rounded bg-[#111113] border border-[#29292D]">
                <div className="text-[#77777D] text-[10px] uppercase">Active Specification</div>
                <div className="text-[#D8D8DC] font-bold truncate mt-0.5">
                  {summary.title || "Atlas Workflow API"}
                </div>
                <div className="text-[#77777D] text-[10px] mt-0.5">
                  v{summary.version || "1.0.0"}
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#111113] border border-[#29292D]">
                <div className="text-[#77777D] text-[10px] uppercase">Parsed Routes</div>
                <div className="text-[#D8D8DC] font-bold text-sm mt-0.5">
                  {summary.endpointsCount} Endpoints
                </div>
                <div className="text-[#77777D] text-[10px] mt-0.5">REST OpenAPI 3.0</div>
              </div>

              <div className="p-2.5 rounded bg-[#111113] border border-[#29292D]">
                <div className="text-[#77777D] text-[10px] uppercase">Entity Schemas</div>
                <div className="text-[#D8D8DC] font-bold text-sm mt-0.5">
                  {summary.schemasCount} Schemas
                </div>
                <div className="text-[#77777D] text-[10px] mt-0.5">
                  {summary.securityCount} Security Schemes
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#111113] border border-[#29292D]">
                <div className="text-[#77777D] text-[10px] uppercase">Workbench Engine</div>
                <div className="text-[#C98A3D] font-bold text-sm mt-0.5">Operational</div>
                <div className="text-[#77777D] text-[10px] mt-0.5">Zero AI • Deterministic</div>
              </div>
            </div>
          )}

          {activeTab === "analysis" && (
            <div className="p-2 font-mono space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-[#111113] border border-[#29292D]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C98A3D]" />
                  <span className="text-[#D8D8DC] text-xs">Governance Health</span>
                </div>
                <span className="font-bold text-[#C98A3D]">
                  {summary.governanceScore !== null ? `${summary.governanceScore}/100` : "Pending Audit"}
                </span>
              </div>
              <div className="text-[11px] text-[#77777D] leading-relaxed">
                ATLAS applies deterministic rule scanning for OWASP Top 10 API Security, contract breaking changes, and topological blast-radius mapping.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed Persistent Status Bar */}
      <div className="h-8 px-4 flex items-center justify-between gap-3 text-[11px]">
        {/* Left: Tab Switchers */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              setActiveTab("logs");
              setIsExpanded(true);
            }}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors flex items-center gap-1 ${
              isExpanded && activeTab === "logs"
                ? "bg-[#161619] text-[#C98A3D] border border-[#C98A3D]/40"
                : "text-[#77777D] hover:text-[#D8D8DC]"
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>Logs ({logs.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("diagnostics");
              setIsExpanded(true);
            }}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors flex items-center gap-1 ${
              isExpanded && activeTab === "diagnostics"
                ? "bg-[#161619] text-[#C98A3D] border border-[#C98A3D]/40"
                : "text-[#77777D] hover:text-[#D8D8DC]"
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Diagnostics</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("analysis");
              setIsExpanded(true);
            }}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors flex items-center gap-1 ${
              isExpanded && activeTab === "analysis"
                ? "bg-[#161619] text-[#C98A3D] border border-[#C98A3D]/40"
                : "text-[#77777D] hover:text-[#D8D8DC]"
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Analysis</span>
          </button>
        </div>

        {/* Center: Latest Event Message Ticker */}
        <div className="flex-1 truncate hidden sm:flex items-center gap-2 text-[#77777D] text-[11px]">
          {latestLog ? (
            <>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getLevelDot(latestLog.level)}`} />
              <span className="text-[#77777D] shrink-0">[{latestLog.source}]</span>
              <span className="truncate text-[#D8D8DC]">{latestLog.message}</span>
            </>
          ) : (
            <span className="text-[#77777D]">ATLAS Workbench Ready</span>
          )}
        </div>

        {/* Right: Actions and Expand Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {isExpanded && logs.length > 0 && (
            <button
              onClick={() => diagnostics.clear()}
              title="Clear logs"
              className="text-[#77777D] hover:text-[#D8D8DC] p-0.5 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[#77777D] hover:text-[#D8D8DC] px-1.5 py-0.5 rounded hover:bg-[#161619] transition-colors"
          >
            <span className="text-[10px] uppercase">{isExpanded ? "Collapse" : "Console"}</span>
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </footer>
  );
};
