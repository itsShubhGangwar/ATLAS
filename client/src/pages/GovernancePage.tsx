import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  UploadCloud,
  FileCode,
} from "lucide-react";
import { CanonicalApiModel, GovernanceReport, GovernanceSeverity } from "../types";
import { analyzeGovernanceApi } from "../services/api";

interface GovernancePageProps {
  sharedModel?: CanonicalApiModel | null;
  onModelLoaded?: (model: CanonicalApiModel) => void;
}

export const GovernancePage: React.FC<GovernancePageProps> = ({ sharedModel }) => {
  const [report, setReport] = useState<GovernanceReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customSpec, setCustomSpec] = useState<string>("");

  const runAnalysis = async (input: CanonicalApiModel | string | File) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyzeGovernanceApi(input);
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setError(res.error || "Failed to analyze API governance.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sharedModel && !report) {
      runAnalysis(sharedModel);
    }
  }, [sharedModel]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      runAnalysis(file);
    }
  };

  const filteredFindings = (report?.findings || []).filter((f) => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(query) ||
        f.targetId.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query) ||
        (f.remediation && f.remediation.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const getSeverityBadge = (severity: GovernanceSeverity) => {
    switch (severity) {
      case "critical":
        return "bg-[#E06C75]/10 text-[#E06C75] border-[#E06C75]/30";
      case "high":
        return "bg-[#C98A3D]/10 text-[#C98A3D] border-[#C98A3D]/30";
      case "medium":
      case "low":
      case "info":
        return "bg-[#161619] text-[#77777D] border-[#29292D]";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#D8D8DC]";
    if (score >= 60) return "text-[#C98A3D]";
    return "text-[#E06C75]";
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-[#111113] border border-[#29292D] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-[#C98A3D]" />
              <h2 className="text-lg font-semibold text-[#D8D8DC]">Deterministic API Governance & Security</h2>
            </div>
            <p className="text-xs text-[#77777D] mt-1">
              Zero-AI security evaluation engine. Scans endpoint authentication, parameter constraints, sensitive field exposure, and metadata integrity.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {sharedModel && (
              <button
                onClick={() => {
                  runAnalysis(sharedModel);
                }}
                disabled={isLoading}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Analyze Loaded Spec</span>
              </button>
            )}

            <label className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#161619] hover:bg-[#202024] text-xs font-medium text-[#D8D8DC] transition-colors cursor-pointer border border-[#29292D]">
              <UploadCloud className="w-3.5 h-3.5 text-[#77777D]" />
              <span>Upload Spec</span>
              <input
                type="file"
                accept=".json,.yaml,.yml"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {/* Input fallback tab if no model loaded */}
        {!sharedModel && (
          <div className="mt-4 pt-4 border-t border-[#29292D]">
            <div className="flex items-center space-x-2 mb-2">
              <FileCode className="w-4 h-4 text-[#77777D]" />
              <span className="text-xs text-[#D8D8DC] font-medium">Or paste OpenAPI YAML/JSON directly:</span>
            </div>
            <textarea
              value={customSpec}
              onChange={(e) => setCustomSpec(e.target.value)}
              placeholder="openapi: 3.0.0&#10;info:&#10;  title: My API&#10;  version: 1.0.0..."
              className="w-full h-32 bg-[#0B0B0D] border border-[#29292D] rounded-lg p-3 text-xs font-mono text-[#D8D8DC] placeholder-[#5A5A62] focus:outline-none focus:border-[#C98A3D]"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => runAnalysis(customSpec)}
                disabled={isLoading || !customSpec.trim()}
                className="px-4 py-2 rounded-lg bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors disabled:opacity-50"
              >
                {isLoading ? "Analyzing..." : "Analyze Pasted Spec"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs flex items-center space-x-3">
          <AlertTriangle className="w-4 h-4 text-[#E06C75] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Score Card */}
            <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-mono uppercase text-[#77777D]">Governance Score</span>
              <div className="flex items-baseline space-x-1.5 mt-2">
                <span className={`text-3xl font-bold font-mono ${getScoreColor(report.score)}`}>
                  {report.score}
                </span>
                <span className="text-xs text-[#77777D]">/ 100</span>
              </div>
              <span className="text-[10px] text-[#77777D] mt-1">Deterministic scale</span>
            </div>

            {/* Critical */}
            <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-mono uppercase text-[#E06C75]">Critical</span>
              <span className="text-2xl font-bold font-mono text-[#E06C75] mt-2">
                {report.summary.critical}
              </span>
              <span className="text-[10px] text-[#77777D] mt-1">-25 pts each</span>
            </div>

            {/* High */}
            <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-mono uppercase text-[#C98A3D]">High</span>
              <span className="text-2xl font-bold font-mono text-[#C98A3D] mt-2">
                {report.summary.high}
              </span>
              <span className="text-[10px] text-[#77777D] mt-1">-15 pts each</span>
            </div>

            {/* Medium */}
            <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-mono uppercase text-[#77777D]">Medium</span>
              <span className="text-2xl font-bold font-mono text-[#D8D8DC] mt-2">
                {report.summary.medium}
              </span>
              <span className="text-[10px] text-[#77777D] mt-1">-8 pts each</span>
            </div>

            {/* Low */}
            <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-mono uppercase text-[#77777D]">Low</span>
              <span className="text-2xl font-bold font-mono text-[#D8D8DC] mt-2">
                {report.summary.low}
              </span>
              <span className="text-[10px] text-[#77777D] mt-1">-3 pts each</span>
            </div>

            {/* Total */}
            <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-mono uppercase text-[#77777D]">Total Findings</span>
              <span className="text-2xl font-bold font-mono text-[#D8D8DC] mt-2">
                {report.findings.length}
              </span>
              <span className="text-[10px] text-[#77777D] mt-1">{report.rulesRun} rules evaluated</span>
            </div>
          </div>

          {/* Findings Filter Bar */}
          <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-[#77777D]" />
              <div className="flex space-x-1 overflow-x-auto py-1">
                {["all", "critical", "high", "medium", "low", "info"].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                      severityFilter === sev
                        ? "bg-[#161619] text-[#C98A3D] border border-[#C98A3D]/40 font-bold"
                        : "bg-[#111113] text-[#77777D] border border-[#29292D] hover:text-[#D8D8DC]"
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#77777D] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter findings..."
                className="w-full bg-[#0B0B0D] border border-[#29292D] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#D8D8DC] placeholder-[#5A5A62] focus:outline-none focus:border-[#C98A3D]"
              />
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-3">
            {filteredFindings.length === 0 ? (
              <div className="bg-[#111113] border border-[#29292D] rounded-xl p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#77777D] mx-auto" />
                <h3 className="text-sm font-semibold text-[#D8D8DC]">No findings match current filter</h3>
                <p className="text-xs text-[#77777D]">All evaluated rules passed cleanly for this selection.</p>
              </div>
            ) : (
              filteredFindings.map((finding, idx) => (
                <div
                  key={`${finding.ruleId}-${idx}`}
                  className="bg-[#111113] border border-[#29292D] hover:border-[#3E3E46] transition-colors rounded-xl p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadge(
                          finding.severity
                        )}`}
                      >
                        {finding.severity}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161619] border border-[#29292D] text-[#77777D]">
                        {finding.category}
                      </span>
                      <span className="text-xs font-mono text-[#D8D8DC] bg-[#0B0B0D] px-2 py-0.5 rounded border border-[#29292D]">
                        {finding.targetId}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#77777D]">{finding.ruleId}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-[#D8D8DC]">{finding.title}</h4>
                    <p className="text-xs text-[#77777D] mt-1 leading-relaxed">{finding.description}</p>
                  </div>

                  {finding.remediation && (
                    <div className="bg-[#0B0B0D] border border-[#29292D] rounded-lg p-3 text-xs text-[#D8D8DC] space-y-1">
                      <div className="flex items-center space-x-1.5 font-medium text-[#C98A3D] text-[11px]">
                        <Info className="w-3.5 h-3.5" />
                        <span>Remediation Recommendation</span>
                      </div>
                      <p className="text-[#77777D] text-xs leading-relaxed">{finding.remediation}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Initial Empty State */}
      {!report && !isLoading && (
        <div className="bg-[#111113] border border-[#29292D] rounded-xl p-12 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-[#77777D] mx-auto" />
          <h3 className="text-sm font-semibold text-[#D8D8DC]">Ready for Governance Audit</h3>
          <p className="text-xs text-[#77777D] max-w-md mx-auto">
            Load an API specification in the API Explorer or upload one here to run the 8 deterministic security & compliance rules.
          </p>
        </div>
      )}
    </div>
  );
};
