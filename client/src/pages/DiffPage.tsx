import React, { useState, useEffect } from "react";
import {
  GitCompare,
  AlertOctagon,
  CheckCircle2,
  Filter,
  Search,
  UploadCloud,
  ArrowRight,
} from "lucide-react";
import {
  CanonicalApiModel,
  DiffReport,
  DiffSeverity,
} from "../types";
import { compareApiSpecsApi } from "../services/api";

interface DiffPageProps {
  sharedModel?: CanonicalApiModel | null;
  initialBaseModel?: CanonicalApiModel | null;
  initialNewModel?: CanonicalApiModel | null;
}

export const DiffPage: React.FC<DiffPageProps> = ({
  sharedModel,
  initialBaseModel,
  initialNewModel,
}) => {
  const [baseSpecText, setBaseSpecText] = useState<string>("");
  const [newSpecText, setNewSpecText] = useState<string>("");
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [useSharedForBase, setUseSharedForBase] = useState<boolean>(!!sharedModel || !!initialBaseModel);

  const [report, setReport] = useState<DiffReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (initialBaseModel && initialNewModel) {
      const runAutoDiff = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const res = await compareApiSpecsApi(initialBaseModel, initialNewModel);
          if (res.success && res.data) {
            setReport(res.data);
          } else {
            setError(res.error || "Failed to compare versions.");
          }
        } catch (err: any) {
          setError(err.message || "Failed to compare versions.");
        } finally {
          setIsLoading(false);
        }
      };
      runAutoDiff();
    }
  }, [initialBaseModel, initialNewModel]);

  const handleCompare = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let baseInput: File | string | CanonicalApiModel;
      if (useSharedForBase && sharedModel) {
        baseInput = sharedModel;
      } else if (baseFile) {
        baseInput = baseFile;
      } else if (baseSpecText.trim()) {
        baseInput = baseSpecText;
      } else {
        setError("Please provide a base specification (v1) to compare.");
        setIsLoading(false);
        return;
      }

      let newInput: File | string | CanonicalApiModel;
      if (newFile) {
        newInput = newFile;
      } else if (newSpecText.trim()) {
        newInput = newSpecText;
      } else {
        setError("Please provide a new specification (v2) to compare.");
        setIsLoading(false);
        return;
      }

      const res = await compareApiSpecsApi(baseInput, newInput);
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setError(res.error || "Failed to compare API specifications.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during comparison.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChanges = (report?.changes || []).filter((c) => {
    if (severityFilter !== "all" && c.severity !== severityFilter) return false;
    if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.path.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityBadge = (severity: DiffSeverity) => {
    switch (severity) {
      case "breaking":
        return "bg-[#E06C75]/10 text-[#E06C75] border-[#E06C75]/30";
      case "non-breaking":
      case "info":
        return "bg-[#161619] text-[#77777D] border-[#29292D]";
    }
  };

  const getChangeTypeBadge = (type: string) => {
    switch (type) {
      case "removed":
        return "bg-[#E06C75]/10 text-[#E06C75] border-[#E06C75]/30";
      case "modified":
        return "bg-[#C98A3D]/10 text-[#C98A3D] border-[#C98A3D]/30";
      case "added":
      default:
        return "bg-[#161619] text-[#77777D] border-[#29292D]";
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="bg-[#111113] border border-[#29292D] rounded-xl p-6 space-y-4">
        <div>
          <div className="flex items-center space-x-2">
            <GitCompare className="w-5 h-5 text-[#C98A3D]" />
            <h2 className="text-lg font-semibold text-[#D8D8DC]">API Contract Diff & Breaking Change Engine</h2>
          </div>
          <p className="text-xs text-[#77777D] mt-1">
            Compares two Canonical API Models for schema drift, endpoint removals, parameter changes, and backwards compatibility.
          </p>
        </div>

        {/* Input Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Base Spec (v1) */}
          <div className="space-y-3 bg-[#0B0B0D] p-4 rounded-xl border border-[#29292D]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase font-mono text-[#D8D8DC]">
                1. Base Specification (v1)
              </span>
              {sharedModel && (
                <label className="flex items-center space-x-2 text-xs text-[#C98A3D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSharedForBase}
                    onChange={(e) => setUseSharedForBase(e.target.checked)}
                    className="rounded border-[#29292D] text-[#C98A3D] focus:ring-[#C98A3D]"
                  />
                  <span>Use Loaded Model ({sharedModel.metadata?.title})</span>
                </label>
              )}
            </div>

            {useSharedForBase && sharedModel ? (
              <div className="p-3 bg-[#161619] border border-[#29292D] rounded-lg text-xs text-[#D8D8DC] space-y-1">
                <div className="font-semibold">{sharedModel.metadata?.title}</div>
                <div className="text-[#77777D]">
                  Version: <span className="font-mono text-[#D8D8DC]">{sharedModel.metadata?.version}</span> | Endpoints:{" "}
                  <span className="font-mono text-[#D8D8DC]">{sharedModel.endpoints?.length}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-[#161619] hover:bg-[#202024] text-xs text-[#D8D8DC] cursor-pointer border border-dashed border-[#29292D]">
                  <UploadCloud className="w-4 h-4 text-[#77777D]" />
                  <span>{baseFile ? baseFile.name : "Upload Base Spec File"}</span>
                  <input
                    type="file"
                    accept=".json,.yaml,.yml"
                    className="hidden"
                    onChange={(e) => setBaseFile(e.target.files?.[0] || null)}
                  />
                </label>
                <textarea
                  value={baseSpecText}
                  onChange={(e) => {
                    setBaseSpecText(e.target.value);
                    setBaseFile(null);
                  }}
                  placeholder="Or paste Base OpenAPI YAML/JSON..."
                  className="w-full h-24 bg-[#0B0B0D] border border-[#29292D] rounded-lg p-2.5 text-xs font-mono text-[#D8D8DC] placeholder-[#5A5A62] focus:outline-none focus:border-[#C98A3D]"
                />
              </div>
            )}
          </div>

          {/* New Spec (v2) */}
          <div className="space-y-3 bg-[#0B0B0D] p-4 rounded-xl border border-[#29292D]">
            <span className="text-xs font-semibold uppercase font-mono text-[#D8D8DC]">
              2. New Specification (v2)
            </span>

            <div className="space-y-2">
              <label className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-[#161619] hover:bg-[#202024] text-xs text-[#D8D8DC] cursor-pointer border border-dashed border-[#29292D]">
                <UploadCloud className="w-4 h-4 text-[#77777D]" />
                <span>{newFile ? newFile.name : "Upload New Spec File"}</span>
                <input
                  type="file"
                  accept=".json,.yaml,.yml"
                  className="hidden"
                  onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                />
              </label>
              <textarea
                value={newSpecText}
                onChange={(e) => {
                  setNewSpecText(e.target.value);
                  setNewFile(null);
                }}
                placeholder="Or paste New OpenAPI YAML/JSON..."
                className="w-full h-24 bg-[#0B0B0D] border border-[#29292D] rounded-lg p-2.5 text-xs font-mono text-[#D8D8DC] placeholder-[#5A5A62] focus:outline-none focus:border-[#C98A3D]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleCompare}
            disabled={isLoading}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors disabled:opacity-50 shadow-md"
          >
            <GitCompare className="w-4 h-4" />
            <span>{isLoading ? "Comparing ASTs..." : "Run Diff Comparison"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs flex items-center space-x-3">
          <AlertOctagon className="w-4 h-4 text-[#E06C75] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Results */}
      {report && (
        <div className="space-y-6">
          {/* Breaking Status Alert */}
          {report.summary.hasBreakingChanges ? (
            <div className="bg-[#E06C75]/10 border border-[#E06C75]/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-[#E06C75]/20 border border-[#E06C75]/40 flex items-center justify-center text-[#E06C75]">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#E06C75]">
                    BREAKING CHANGES DETECTED ({report.summary.breakingCount})
                  </h3>
                  <p className="text-xs text-[#E06C75]/80">
                    This update contains contract changes that will break existing client integrations.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#E06C75]/15 border border-[#E06C75]/30 text-[#E06C75]">
                Major Revision Required
              </span>
            </div>
          ) : (
            <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-[#161619] border border-[#29292D] flex items-center justify-center text-[#77777D]">
                  <CheckCircle2 className="w-5 h-5 text-[#C98A3D]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#D8D8DC]">
                    BACKWARD COMPATIBLE SPECIFICATION
                  </h3>
                  <p className="text-xs text-[#77777D]">
                    All detected changes are non-breaking additions or informational updates.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#161619] border border-[#29292D] text-[#77777D]">
                Safe to Deploy
              </span>
            </div>
          )}

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4">
              <span className="text-[11px] font-mono uppercase text-[#77777D]">Total Changes</span>
              <div className="text-2xl font-bold font-mono text-[#D8D8DC] mt-2">
                {report.summary.totalChanges}
              </div>
              <span className="text-[10px] text-[#77777D] mt-1">
                {report.baseVersion} <ArrowRight className="inline w-2.5 h-2.5 mx-1" /> {report.newVersion}
              </span>
            </div>

            <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4">
              <span className="text-[11px] font-mono uppercase text-[#E06C75]">Breaking</span>
              <div className="text-2xl font-bold font-mono text-[#E06C75] mt-2">
                {report.summary.breakingCount}
              </div>
              <span className="text-[10px] text-[#77777D] mt-1">Contract breaks</span>
            </div>

            <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4">
              <span className="text-[11px] font-mono uppercase text-[#77777D]">Non-Breaking</span>
              <div className="text-2xl font-bold font-mono text-[#D8D8DC] mt-2">
                {report.summary.nonBreakingCount}
              </div>
              <span className="text-[10px] text-[#77777D] mt-1">Safe additions</span>
            </div>

            <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4">
              <span className="text-[11px] font-mono uppercase text-[#77777D]">Informational</span>
              <div className="text-2xl font-bold font-mono text-[#77777D] mt-2">
                {report.summary.infoCount}
              </div>
              <span className="text-[10px] text-[#77777D] mt-1">Documentation diffs</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-[#111113] border border-[#29292D] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-[#77777D]" />
              <div className="flex space-x-1">
                {["all", "breaking", "non-breaking", "info"].map((sev) => (
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

              <div className="h-4 w-px bg-[#29292D] mx-1" />

              <div className="flex space-x-1">
                {["all", "endpoint", "parameter", "schema", "security"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                      categoryFilter === cat
                        ? "bg-[#161619] text-[#D8D8DC] border border-[#29292D] font-bold"
                        : "bg-[#111113] text-[#77777D] border border-[#29292D] hover:text-[#D8D8DC]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#77777D] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search diff changes..."
                className="w-full bg-[#0B0B0D] border border-[#29292D] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#D8D8DC] placeholder-[#5A5A62] focus:outline-none focus:border-[#C98A3D]"
              />
            </div>
          </div>

          {/* Changes List */}
          <div className="space-y-3">
            {filteredChanges.length === 0 ? (
              <div className="bg-[#111113] border border-[#29292D] rounded-xl p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#77777D] mx-auto" />
                <h3 className="text-sm font-semibold text-[#D8D8DC]">No changes match filter</h3>
                <p className="text-xs text-[#77777D]">No diff entries found for the selected criteria.</p>
              </div>
            ) : (
              filteredChanges.map((change) => (
                <div
                  key={change.id}
                  className="bg-[#111113] border border-[#29292D] hover:border-[#3E3E46] rounded-xl p-4 space-y-2 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadge(
                          change.severity
                        )}`}
                      >
                        {change.severity}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getChangeTypeBadge(
                          change.changeType
                        )}`}
                      >
                        {change.changeType}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161619] border border-[#29292D] text-[#77777D]">
                        {change.category}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-[#D8D8DC] bg-[#0B0B0D] px-2 py-0.5 rounded border border-[#29292D]">
                      {change.path}
                    </span>
                  </div>

                  <p className="text-xs text-[#D8D8DC] leading-relaxed font-sans">{change.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
