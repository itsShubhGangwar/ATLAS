import React, { useState, useRef } from "react";
import {
  Upload,
  FileCode,
  Layers,
  Shield,
  AlertCircle,
  Loader2,
  Sparkles,
  Network,
  ArrowRight,
  FolderGit2,
  CheckCircle2,
  X,
} from "lucide-react";
import { CanonicalApiModel, Project } from "../types";
import { parseSpecificationApi, listProjectsApi, createVersionApi, createProjectApi } from "../services/api";

const SAMPLE_YAML = `openapi: 3.0.3
info:
  title: ATLAS Sample Task & User API
  description: Sample OpenAPI 3.0 specification for ATLAS test suite.
  version: 1.0.0
paths:
  /users:
    get:
      operationId: listUsers
      summary: List all users
      tags: [Users]
      security:
        - BearerAuth: []
      responses:
        '200':
          description: A list of users
    post:
      operationId: createUser
      summary: Create a new user
      tags: [Users]
      security:
        - BearerAuth: []
      responses:
        '201':
          description: User created
  /users/{id}:
    get:
      operationId: getUserById
      summary: Get user by ID
      tags: [Users]
      security: []
      responses:
        '200':
          description: User details
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    User:
      type: object
      properties:
        id: { type: string }
        username: { type: string }
`;

interface ExplorerPageProps {
  onViewGraph?: (model: CanonicalApiModel) => void;
  sharedModel?: CanonicalApiModel | null;
  onModelLoaded?: (model: CanonicalApiModel) => void;
}

export const ExplorerPage: React.FC<ExplorerPageProps> = ({
  onViewGraph,
  sharedModel,
  onModelLoaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [canonicalModel, setCanonicalModel] = useState<CanonicalApiModel | null>(sharedModel || null);
  const [rawSpecContent, setRawSpecContent] = useState<File | string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save to project modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [newProjectName, setNewProjectName] = useState<string>("");
  const [versionLabel, setVersionLabel] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setRawSpecContent(e.target.files[0]);
      setError(null);
    }
  };

  const handleParse = async () => {
    if (!selectedFile) {
      setError("Please choose an OpenAPI YAML or JSON file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setSaveSuccessMsg(null);

    const result = await parseSpecificationApi(selectedFile);
    if (result.success && result.data) {
      setCanonicalModel(result.data);
      setRawSpecContent(selectedFile);
      if (onModelLoaded) onModelLoaded(result.data);
    } else {
      setError(result.error || "Failed to parse OpenAPI specification.");
      setCanonicalModel(null);
    }

    setLoading(false);
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    setSaveSuccessMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const result = await parseSpecificationApi(SAMPLE_YAML);
    if (result.success && result.data) {
      setCanonicalModel(result.data);
      setRawSpecContent(SAMPLE_YAML);
      if (onModelLoaded) onModelLoaded(result.data);
    } else {
      setError(result.error || "Failed to parse sample specification.");
    }

    setLoading(false);
  };

  const handleOpenSaveModal = async () => {
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);
    setVersionLabel(canonicalModel?.metadata?.version ? `v${canonicalModel.metadata.version}` : "v1.0.0");

    try {
      const res = await listProjectsApi();
      if (res.success && res.data) {
        setAvailableProjects(res.data);
        if (res.data.length > 0) {
          setSelectedProjectId(res.data[0].id);
        } else {
          setSelectedProjectId("new");
        }
      }
    } catch {
      setSelectedProjectId("new");
    }

    setIsSaveModalOpen(true);
  };

  const handleSaveToProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawSpecContent) {
      setSaveErrorMsg("No specification content available to save.");
      return;
    }

    setIsSaving(true);
    setSaveErrorMsg(null);

    try {
      let targetProjectId = selectedProjectId;

      if (selectedProjectId === "new") {
        if (!newProjectName.trim()) {
          setSaveErrorMsg("Project name is required.");
          setIsSaving(false);
          return;
        }

        const projRes = await createProjectApi({ name: newProjectName.trim() });
        if (!projRes.success || !projRes.data) {
          setSaveErrorMsg(projRes.error || "Failed to create new project.");
          setIsSaving(false);
          return;
        }
        targetProjectId = projRes.data.id;
      }

      const versRes = await createVersionApi(
        targetProjectId,
        rawSpecContent,
        versionLabel.trim() || undefined
      );

      if (versRes.success) {
        setSaveSuccessMsg("Specification saved to project successfully!");
        setTimeout(() => {
          setIsSaveModalOpen(false);
          setSaveSuccessMsg(null);
        }, 1500);
      } else {
        setSaveErrorMsg(versRes.error || "Failed to save version to project.");
      }
    } catch (err: any) {
      setSaveErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const getMethodBadgeClass = (_method: string) => {
    return "bg-[#1A1A1E] text-[#D8D8DC] border-[#29292D]";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-mono text-xs">
      {/* Header Banner */}
      <div>
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-[#161619] border border-[#29292D] text-[#C98A3D] text-[11px] mb-2">
          <span>Phase 2 & 3 — Parser & Knowledge Graph</span>
        </div>
        <h2 className="text-xl font-bold text-[#D8D8DC]">OpenAPI Specification Parser</h2>
        <p className="text-xs text-[#77777D] mt-1 font-sans">
          Upload or load an OpenAPI 2.0 / 3.0 / 3.1 YAML or JSON document to parse it into the Canonical API Model.
        </p>
      </div>

      {/* Parser Test Action Bar */}
      <div className="rounded-lg bg-[#111113] border border-[#29292D] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* File Input Controls */}
          <div className="flex items-center space-x-3 flex-1">
            <input
              type="file"
              ref={fileInputRef}
              accept=".yaml,.yml,.json"
              onChange={handleFileChange}
              className="hidden"
              id="spec-file-input"
            />
            <label
              htmlFor="spec-file-input"
              className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 rounded bg-[#161619] hover:bg-[#202024] text-xs font-medium text-[#D8D8DC] border border-[#29292D] transition-colors"
            >
              <Upload className="w-4 h-4 text-[#C98A3D]" />
              <span>{selectedFile ? selectedFile.name : "Choose OpenAPI file"}</span>
            </label>

            <button
              onClick={handleParse}
              disabled={loading || !selectedFile}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded bg-[#C98A3D] hover:bg-[#DCA052] disabled:opacity-50 disabled:pointer-events-none text-xs font-bold text-[#0B0B0D] shadow-sm transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Parsing...</span>
                </>
              ) : (
                <>
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Parse Specification</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Sample Loader */}
          <div>
            <button
              onClick={handleLoadSample}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded bg-[#161619] hover:bg-[#202024] text-[#77777D] hover:text-[#D8D8DC] text-xs font-mono border border-[#29292D] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C98A3D]" />
              <span>Load Sample Specification</span>
            </button>
          </div>
        </div>

        {/* Error message display */}
        {error && (
          <div className="p-3.5 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 flex items-start space-x-3 text-xs text-[#E06C75]">
            <AlertCircle className="w-4 h-4 text-[#E06C75] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Parse Error</p>
              <p className="text-[11px] text-[#E06C75]/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Parsed Specification Details & Metrics */}
      {canonicalModel && (
        <div className="space-y-6">
          {/* Action to View in Graph */}
          {onViewGraph && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-[#111113] border border-[#29292D]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded bg-[#161619] border border-[#29292D] flex items-center justify-center text-[#C98A3D]">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#D8D8DC] font-mono">
                    Specification Parsed into Canonical Model
                  </h4>
                  <p className="text-[11px] text-[#77777D] font-sans">
                    Visualize endpoints, schemas, tags, and security schemes in the interactive graph.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={handleOpenSaveModal}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 rounded bg-[#161619] hover:bg-[#202024] text-xs font-semibold text-[#D8D8DC] border border-[#29292D] hover:border-[#C98A3D]/40 transition-colors"
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-[#C98A3D]" />
                  <span>Save to Project</span>
                </button>

                <button
                  onClick={() => onViewGraph(canonicalModel)}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] shadow-sm transition-colors"
                >
                  <span>Open in Knowledge Graph</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Metadata & Summary Counters */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 md:col-span-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">API Title</span>
              <p className="text-sm font-bold text-zinc-100 mt-1 truncate">{canonicalModel.metadata.title}</p>
              <p className="text-[11px] text-[#77777D] font-mono mt-0.5">
                Version: {canonicalModel.metadata.version}
              </p>
            </div>

            <div className="p-4 rounded bg-[#111113] border border-[#29292D]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">Spec Version</span>
              <p className="text-base font-bold text-[#D8D8DC] font-mono mt-1">
                {canonicalModel.metadata.openApiVersion}
              </p>
              <p className="text-[10px] text-[#77777D] capitalize">{canonicalModel.metadata.specType}</p>
            </div>

            <div className="p-4 rounded bg-[#111113] border border-[#29292D]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">Endpoints</span>
              <p className="text-base font-bold text-[#D8D8DC] font-mono mt-1">
                {canonicalModel.endpoints.length}
              </p>
              <p className="text-[10px] text-[#77777D]">Operations</p>
            </div>

            <div className="p-4 rounded bg-[#111113] border border-[#29292D]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">Schemas</span>
              <p className="text-base font-bold text-[#D8D8DC] font-mono mt-1">
                {canonicalModel.schemas.length}
              </p>
              <p className="text-[10px] text-[#77777D]">Entities</p>
            </div>

            <div className="p-4 rounded bg-[#111113] border border-[#29292D]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#77777D]">Security</span>
              <p className="text-base font-bold text-[#D8D8DC] font-mono mt-1">
                {canonicalModel.securitySchemes.length}
              </p>
              <p className="text-[10px] text-[#77777D]">Schemes</p>
            </div>
          </div>

          {/* Parsed Endpoints Table */}
          <div className="rounded-lg bg-[#111113] border border-[#29292D] overflow-hidden">
            <div className="p-4 border-b border-[#29292D] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#C98A3D]" />
                <h3 className="text-sm font-semibold text-[#D8D8DC]">Canonical Endpoints</h3>
              </div>
              <span className="text-xs font-mono text-[#77777D]">
                {canonicalModel.endpoints.length} total operations
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#29292D] bg-[#0B0B0D] font-mono text-[11px] text-[#77777D] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold w-24">METHOD</th>
                    <th className="py-3 px-4 font-semibold">PATH</th>
                    <th className="py-3 px-4 font-semibold">SUMMARY</th>
                    <th className="py-3 px-4 font-semibold w-32">AUTH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#29292D] font-mono">
                  {canonicalModel.endpoints.map((ep) => {
                    const hasAuth = ep.security.length > 0;
                    return (
                      <tr key={ep.id} className="hover:bg-[#161619] transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getMethodBadgeClass(
                              ep.method
                            )}`}
                          >
                            {ep.method.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#D8D8DC] font-semibold">{ep.path}</td>
                        <td className="py-3 px-4 text-[#77777D] font-sans">{ep.summary || "—"}</td>
                        <td className="py-3 px-4">
                          {hasAuth ? (
                            <span className="inline-flex items-center space-x-1 text-[#D8D8DC]">
                              <Shield className="w-3 h-3 text-[#C98A3D]" />
                              <span className="font-semibold">Yes</span>
                              <span className="text-[10px] text-[#77777D]">
                                ({ep.security.map((s) => s.schemeName).join(", ")})
                              </span>
                            </span>
                          ) : (
                            <span className="text-[#77777D]">No</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Save to Project Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-mono text-xs">
          <div className="w-full max-w-md bg-[#111113] border border-[#29292D] rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderGit2 className="w-5 h-5 text-[#C98A3D]" />
                <h3 className="text-base font-semibold text-[#D8D8DC]">Save API to Project</h3>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-[#77777D] hover:text-[#D8D8DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 rounded bg-[#C98A3D]/10 border border-[#C98A3D]/30 text-[#C98A3D] text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#C98A3D] shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {saveErrorMsg && (
              <div className="p-3 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs">
                {saveErrorMsg}
              </div>
            )}

            <form onSubmit={handleSaveToProject} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#77777D] uppercase mb-1">Target Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#0B0B0D] border border-[#29292D] rounded px-3 py-2 text-xs font-mono text-[#D8D8DC] focus:outline-none focus:border-[#C98A3D]"
                >
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.versionsCount || 0} versions)
                    </option>
                  ))}
                  <option value="new">+ Create a new project...</option>
                </select>
              </div>

              {selectedProjectId === "new" && (
                <div>
                  <label className="block text-xs font-mono text-[#77777D] uppercase mb-1">New Project Name *</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Core Banking Gateway"
                    className="w-full bg-[#0B0B0D] border border-[#29292D] rounded px-3 py-2 text-xs text-[#D8D8DC] placeholder-[#77777D]/50 focus:outline-none focus:border-[#C98A3D]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-[#77777D] uppercase mb-1">
                  Version Label (Optional)
                </label>
                <input
                  type="text"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  placeholder={`v${canonicalModel?.metadata?.version || "1.0.0"}`}
                  className="w-full bg-[#0B0B0D] border border-[#29292D] rounded px-3 py-2 text-xs text-[#D8D8DC] placeholder-[#77777D]/50 focus:outline-none focus:border-[#C98A3D]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded bg-[#161619] hover:bg-[#202024] text-xs font-medium text-[#D8D8DC] border border-[#29292D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors disabled:opacity-50 shadow-md"
                >
                  {isSaving ? "Saving..." : "Save Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};