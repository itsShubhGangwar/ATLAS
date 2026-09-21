import React, { useState, useEffect, useCallback } from "react";
import {
  FolderGit2,
  ArrowLeft,
  Plus,
  Trash2,
  Network,
  ShieldAlert,
  GitCompare,
  Code2,
  FileCode,
  AlertTriangle,
  UploadCloud,
  X,
  ExternalLink,
  Zap,
  History,
} from "lucide-react";
import { Project, ApiVersionSummary, CanonicalApiModel } from "../types";
import {
  getProjectByIdApi,
  listVersionsApi,
  createVersionApi,
  deleteVersionApi,
  deleteProjectApi,
  getVersionByIdApi,
} from "../services/api";

interface ProjectPageProps {
  projectId: string;
  demoProject?: Project | null;
  demoVersions?: ApiVersionSummary[] | null;
  isReadOnly?: boolean;
  onBack: () => void;
  onOpenVersion: (versionId: string) => void;
  onOpenGraph: (model: CanonicalApiModel) => void;
  onOpenGovernance: (model: CanonicalApiModel, versionId?: string) => void;
  onOpenDiff: (baseModel: CanonicalApiModel, newModel: CanonicalApiModel) => void;
  onOpenSdk: (model: CanonicalApiModel) => void;
  onOpenSimulator?: (model: CanonicalApiModel) => void;
  onOpenEvolution?: (projectId: string) => void;
}

export const ProjectPage: React.FC<ProjectPageProps> = ({
  projectId,
  demoProject,
  demoVersions,
  isReadOnly,
  onBack,
  onOpenVersion,
  onOpenGraph,
  onOpenGovernance,
  onOpenDiff,
  onOpenSdk,
  onOpenSimulator,
  onOpenEvolution,
}) => {
  const [project, setProject] = useState<Project | null>(demoProject || null);
  const [versions, setVersions] = useState<ApiVersionSummary[]>(demoVersions || []);
  const [isLoading, setIsLoading] = useState<boolean>(!demoProject);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [specText, setSpecText] = useState<string>("");
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Compare selector state
  const [compareBaseId, setCompareBaseId] = useState<string>("");
  const [compareNewId, setCompareNewId] = useState<string>("");
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Delete confirmation
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<boolean>(false);

  const loadProjectData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projRes, versRes] = await Promise.all([
        getProjectByIdApi(projectId),
        listVersionsApi(projectId),
      ]);

      if (projRes.success && projRes.data) {
        setProject(projRes.data);
      } else {
        setError(projRes.error || "Failed to load project details.");
      }

      if (versRes.success && versRes.data) {
        setVersions(versRes.data);
        if (versRes.data.length >= 2) {
          setCompareBaseId(versRes.data[1].id);
          setCompareNewId(versRes.data[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load project.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (demoProject) {
      setProject(demoProject);
      if (demoVersions) {
        setVersions(demoVersions);
        if (demoVersions.length >= 2) {
          setCompareBaseId(demoVersions[1].id);
          setCompareNewId(demoVersions[0].id);
        }
      }
      setIsLoading(false);
      return;
    }
    loadProjectData();
  }, [demoProject, demoVersions, loadProjectData]);

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      setUploadError("Demo workspace is read-only. Create an account to upload versions.");
      return;
    }
    const input = specFile || specText;
    if (!input || (typeof input === "string" && !input.trim())) {
      setUploadError("Please provide an OpenAPI specification (upload file or paste content).");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const res = await createVersionApi(projectId, input, versionLabel.trim() || undefined);
    setIsUploading(false);

    if (res.success) {
      setIsUploadOpen(false);
      setSpecText("");
      setSpecFile(null);
      setVersionLabel("");
      loadProjectData();
    } else {
      setUploadError(res.error || "Failed to upload and parse specification.");
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (isReadOnly) {
      alert("Demo workspace is read-only.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this API version?")) return;
    const res = await deleteVersionApi(projectId, versionId);
    if (res.success) {
      loadProjectData();
    } else {
      alert(res.error || "Failed to delete version.");
    }
  };

  const handleDeleteProject = async () => {
    const res = await deleteProjectApi(projectId);
    if (res.success) {
      onBack();
    } else {
      alert(res.error || "Failed to delete project.");
    }
  };

  const handleAction = async (
    versionId: string,
    action: "open" | "graph" | "gov" | "sdk" | "sim"
  ) => {
    try {
      const res = await getVersionByIdApi(projectId, versionId);
      if (res.success && res.data) {
        const canonical = res.data.canonicalModel;
        if (action === "open") onOpenVersion(versionId);
        if (action === "graph") onOpenGraph(canonical);
        if (action === "gov") onOpenGovernance(canonical, versionId);
        if (action === "sdk") onOpenSdk(canonical);
        if (action === "sim" && onOpenSimulator) onOpenSimulator(canonical);
      } else {
        alert(res.error || "Failed to load version details.");
      }
    } catch (err: any) {
      alert(err.message || "Error loading version.");
    }
  };

  const handleCompareVersions = async () => {
    if (!compareBaseId || !compareNewId) {
      alert("Please select both a base version and a new version to compare.");
      return;
    }
    if (compareBaseId === compareNewId) {
      alert("Please select two different versions to compare.");
      return;
    }

    setIsComparing(true);
    try {
      const [baseRes, newRes] = await Promise.all([
        getVersionByIdApi(projectId, compareBaseId),
        getVersionByIdApi(projectId, compareNewId),
      ]);

      if (baseRes.success && baseRes.data && newRes.success && newRes.data) {
        onOpenDiff(baseRes.data.canonicalModel, newRes.data.canonicalModel);
      } else {
        alert("Failed to load versions for comparison.");
      }
    } catch (err: any) {
      alert(err.message || "Error comparing versions.");
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button and Project Header */}
      <div className="bg-[#111113] border border-[#29292D] rounded-lg p-6 space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs text-[#77777D] hover:text-[#D8D8DC] transition-colors font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center space-x-2.5">
              <FolderGit2 className="w-6 h-6 text-[#C98A3D]" />
              <h2 className="text-xl font-bold text-[#D8D8DC] font-mono">
                {project?.name || "Loading Project..."}
              </h2>
            </div>
            <p className="text-xs text-[#77777D] mt-1 max-w-2xl leading-relaxed">
              {project?.description || "No description provided."}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {onOpenEvolution && (
              <button
                onClick={() => onOpenEvolution(projectId)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-[#161619] hover:bg-[#202024] text-[#D8D8DC] border border-[#29292D] hover:border-[#C98A3D]/40 text-xs font-mono font-medium transition-colors shadow-sm"
                title="View complete API Evolution and Decision Timeline"
              >
                <History className="w-3.5 h-3.5 text-[#C98A3D]" />
                <span>API Evolution</span>
              </button>
            )}

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Upload API Version</span>
            </button>

            <button
              onClick={() => setConfirmDeleteProject(true)}
              className="p-2 rounded bg-[#161619] hover:bg-[#E06C75]/20 text-[#77777D] hover:text-[#E06C75] border border-[#29292D] hover:border-[#E06C75]/40 transition-colors"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-[#E06C75] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Version Comparison Box (if >= 2 versions) */}
      {versions.length >= 2 && (
        <div className="bg-[#111113] border border-[#29292D] rounded-lg p-5 space-y-3">
          <div className="flex items-center space-x-2">
            <GitCompare className="w-4 h-4 text-[#C98A3D]" />
            <h3 className="text-xs font-mono font-semibold uppercase text-[#D8D8DC]">
              Compare Project Versions
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-mono text-[#77777D] mb-1">Base Version (v1)</label>
              <select
                value={compareBaseId}
                onChange={(e) => setCompareBaseId(e.target.value)}
                className="w-full bg-[#0B0B0D] border border-[#29292D] rounded px-3 py-2 text-xs font-mono text-[#D8D8DC] focus:outline-none focus:border-[#C98A3D]"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version} ({v.name || "Release"})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[#77777D] font-mono text-xs hidden sm:inline pt-5">vs</span>

            <div className="flex-1 w-full">
              <label className="block text-[11px] font-mono text-[#77777D] mb-1">New Version (v2)</label>
              <select
                value={compareNewId}
                onChange={(e) => setCompareNewId(e.target.value)}
                className="w-full bg-[#0B0B0D] border border-[#29292D] rounded px-3 py-2 text-xs font-mono text-[#D8D8DC] focus:outline-none focus:border-[#C98A3D]"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version} ({v.name || "Release"})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:pt-5 w-full sm:w-auto">
              <button
                onClick={handleCompareVersions}
                disabled={isComparing || compareBaseId === compareNewId}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors disabled:opacity-50"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>{isComparing ? "Comparing..." : "Compare in Diff Engine"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Versions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-[#C98A3D]" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#D8D8DC]">
              API Versions ({versions.length})
            </h3>
          </div>
        </div>

        {versions.length === 0 && !isLoading ? (
          <div className="bg-[#111113] border border-[#29292D] rounded-lg p-10 text-center space-y-3">
            <FileCode className="w-8 h-8 text-[#77777D] mx-auto" />
            <h4 className="text-sm font-semibold text-[#D8D8DC]">No API versions uploaded yet</h4>
            <p className="text-xs text-[#77777D] max-w-sm mx-auto">
              Upload an OpenAPI 2.0, 3.0, or 3.1 specification to create the first version of this API project.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload first version</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="bg-[#111113] border border-[#29292D] hover:border-[#3A3A40] rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base font-bold font-mono text-[#D8D8DC]">
                      v{ver.version}
                    </span>
                    <span className="text-xs text-[#77777D] font-medium">{ver.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161619] border border-[#29292D] text-[#77777D]">
                      OpenAPI {ver.openApiVersion}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#77777D] font-mono">
                    <span>
                      Endpoints: <strong className="text-[#D8D8DC]">{ver.endpointsCount}</strong>
                    </span>
                    <span>
                      Schemas: <strong className="text-[#D8D8DC]">{ver.schemasCount}</strong>
                    </span>
                    <span>
                      Created: <strong className="text-[#D8D8DC]">{new Date(ver.createdAt).toLocaleDateString()}</strong>
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleAction(ver.id, "open")}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] hover:border-[#C98A3D]/40 transition-colors"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3 text-[#77777D]" />
                  </button>

                  <button
                    onClick={() => handleAction(ver.id, "graph")}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] hover:border-[#C98A3D]/40 transition-colors"
                  >
                    <Network className="w-3.5 h-3.5 text-[#C98A3D]" />
                    <span>Graph</span>
                  </button>

                  <button
                    onClick={() => handleAction(ver.id, "gov")}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] hover:border-[#C98A3D]/40 transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-[#C98A3D]" />
                    <span>Governance</span>
                  </button>

                  <button
                    onClick={() => handleAction(ver.id, "sdk")}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] hover:border-[#C98A3D]/40 transition-colors"
                  >
                    <Code2 className="w-3.5 h-3.5 text-[#C98A3D]" />
                    <span>SDK</span>
                  </button>

                  {onOpenSimulator && (
                    <button
                      onClick={() => handleAction(ver.id, "sim")}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] hover:border-[#C98A3D]/40 transition-colors"
                      title="Run What-If Simulation"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#C98A3D]" />
                      <span>Simulator</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteVersion(ver.id)}
                    className="p-1.5 rounded bg-[#161619] hover:bg-[#E06C75]/20 text-[#77777D] hover:text-[#E06C75] border border-[#29292D] hover:border-[#E06C75]/40 transition-colors"
                    title="Delete Version"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Version Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-mono text-xs">
          <div className="w-full max-w-lg bg-[#111113] border border-[#29292D] rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UploadCloud className="w-5 h-5 text-[#C98A3D]" />
                <h3 className="text-base font-semibold text-[#D8D8DC]">Upload API Specification</h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-[#77777D] hover:text-[#D8D8DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadVersion} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#77777D] uppercase mb-1">
                  Version Label / Release Name (Optional)
                </label>
                <input
                  type="text"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  placeholder="e.g. v1.1.0 Q3 Release"
                  className="w-full bg-[#0B0B0D] border border-[#29292D] rounded px-3 py-2 text-xs text-[#D8D8DC] placeholder-[#77777D]/50 focus:outline-none focus:border-[#C98A3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#77777D] uppercase mb-1">
                  Upload Specification File (.yaml, .yml, .json)
                </label>
                <label className="flex items-center justify-center space-x-2 px-3 py-2 rounded bg-[#0B0B0D] hover:bg-[#161619] text-xs text-[#D8D8DC] cursor-pointer border border-dashed border-[#29292D] hover:border-[#3A3A40] transition-colors">
                  <UploadCloud className="w-4 h-4 text-[#77777D]" />
                  <span>{specFile ? specFile.name : "Choose YAML/JSON File"}</span>
                  <input
                    type="file"
                    accept=".json,.yaml,.yml"
                    className="hidden"
                    onChange={(e) => {
                      setSpecFile(e.target.files?.[0] || null);
                      setSpecText("");
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#77777D] uppercase mb-1">
                  Or Paste OpenAPI Specification Directly
                </label>
                <textarea
                  value={specText}
                  onChange={(e) => {
                    setSpecText(e.target.value);
                    setSpecFile(null);
                  }}
                  placeholder="openapi: 3.0.3&#10;info:&#10;  title: Payments API&#10;  version: 1.0.0..."
                  className="w-full h-32 bg-[#0B0B0D] border border-[#29292D] rounded p-3 text-xs font-mono text-[#D8D8DC] placeholder-[#77777D]/50 focus:outline-none focus:border-[#C98A3D]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded bg-[#161619] hover:bg-[#202024] text-xs font-medium text-[#D8D8DC] border border-[#29292D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors disabled:opacity-50"
                >
                  {isUploading ? "Parsing & Saving..." : "Upload & Save Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {confirmDeleteProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-mono text-xs">
          <div className="w-full max-w-md bg-[#111113] border border-[#E06C75]/40 rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-[#E06C75]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-semibold">Delete Project?</h3>
            </div>
            <p className="text-xs text-[#77777D] leading-relaxed">
              This action cannot be undone. Deleting this project will permanently delete all its
              uploaded API versions, saved governance reports, and version diff analyses.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmDeleteProject(false)}
                className="px-4 py-2 rounded bg-[#161619] hover:bg-[#202024] text-xs font-medium text-[#D8D8DC] border border-[#29292D]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                className="px-4 py-2 rounded bg-[#E06C75] hover:bg-[#E06C75]/80 text-xs font-bold text-[#0B0B0D] transition-colors"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
