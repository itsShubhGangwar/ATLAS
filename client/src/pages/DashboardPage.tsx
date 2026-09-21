import React, { useState, useEffect, useCallback } from "react";
import {
  FolderGit2,
  ShieldAlert,
  GitCompare,
  Plus,
  ArrowRight,
  Clock,
  FileCode,
  X,
  RefreshCw,
  Compass,
} from "lucide-react";
import { Project, DashboardMetrics } from "../types";
import { listProjectsApi, getDashboardMetricsApi, createProjectApi } from "../services/api";

interface DashboardPageProps {
  onSelectProject: (projectId: string) => void;
  onNavigateExplorer: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectProject,
  onNavigateExplorer,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Project Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>("");
  const [newProjectDesc, setNewProjectDesc] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projRes, metricsRes] = await Promise.all([
        listProjectsApi(),
        getDashboardMetricsApi(),
      ]);

      if (projRes.success && projRes.data) {
        setProjects(projRes.data);
      } else {
        setError(projRes.error || "Failed to load projects.");
      }

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setCreateError("Project name is required.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    const res = await createProjectApi({
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
    });

    setIsCreating(false);

    if (res.success && res.data) {
      setIsModalOpen(false);
      setNewProjectName("");
      setNewProjectDesc("");
      loadDashboardData();
      onSelectProject(res.data.id);
    } else {
      setCreateError(res.error || "Failed to create project.");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Metrics Overview */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#D8D8DC] font-mono tracking-wide">Workbench Dashboard</h2>
            <p className="text-xs text-[#77777D] mt-1">
              Persistent multi-project API specifications, versions, and intelligence audits
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="p-2 rounded bg-[#161619] border border-[#29292D] text-[#77777D] hover:text-[#D8D8DC] transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={onNavigateExplorer}
              className="flex items-center space-x-2 px-3 py-2 rounded bg-[#161619] border border-[#29292D] hover:border-[#3A3A40] text-xs font-medium text-[#D8D8DC] transition-colors"
            >
              <Compass className="w-4 h-4 text-[#C98A3D]" />
              <span>Explore Spec</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Real Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-[#111113] border border-[#29292D] rounded p-4 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-[#77777D]">Total Projects</span>
            <span className="text-3xl font-bold font-mono text-[#D8D8DC] mt-2">
              {metrics?.projectsCount ?? projects.length}
            </span>
            <span className="text-[10px] text-[#77777D] mt-1">Active workspaces</span>
          </div>

          <div className="bg-[#111113] border border-[#29292D] rounded p-4 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-[#77777D]">API Versions</span>
            <span className="text-3xl font-bold font-mono text-[#D8D8DC] mt-2">
              {metrics?.versionsCount ?? 0}
            </span>
            <span className="text-[10px] text-[#77777D] mt-1">Persisted snapshots</span>
          </div>

          <div className="bg-[#111113] border border-[#29292D] rounded p-4 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-[#77777D]">Indexed Endpoints</span>
            <span className="text-3xl font-bold font-mono text-[#D8D8DC] mt-2">
              {metrics?.endpointsCount ?? 0}
            </span>
            <span className="text-[10px] text-[#77777D] mt-1">Operations tracked</span>
          </div>

          <div className="bg-[#111113] border border-[#29292D] rounded p-4 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-[#77777D]">Indexed Schemas</span>
            <span className="text-3xl font-bold font-mono text-[#D8D8DC] mt-2">
              {metrics?.schemasCount ?? 0}
            </span>
            <span className="text-[10px] text-[#77777D] mt-1">Entities defined</span>
          </div>

          <div className="bg-[#111113] border border-[#29292D] rounded p-4 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-[#77777D]">Latest Governance</span>
            <div className="flex items-baseline space-x-1 mt-2">
              <span className={`text-3xl font-bold font-mono ${
                metrics?.recentGovernanceScore !== null && metrics?.recentGovernanceScore !== undefined
                  ? "text-[#C98A3D]"
                  : "text-[#77777D]"
              }`}>
                {metrics?.recentGovernanceScore !== null && metrics?.recentGovernanceScore !== undefined
                  ? metrics.recentGovernanceScore
                  : "—"}
              </span>
              {metrics?.recentGovernanceScore !== null && (
                <span className="text-xs text-[#77777D]">/ 100</span>
              )}
            </div>
            <span className="text-[10px] text-[#77777D] mt-1">Security score</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs">
          {error}
        </div>
      )}

      {/* Projects Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderGit2 className="w-5 h-5 text-[#C98A3D]" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#D8D8DC] font-mono">
              Managed API Projects ({projects.length})
            </h3>
          </div>
        </div>

        {projects.length === 0 && !isLoading ? (
          <div className="bg-[#111113] border border-[#29292D] rounded-lg p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-lg bg-[#161619] border border-[#29292D] flex items-center justify-center mx-auto text-[#77777D]">
              <FolderGit2 className="w-6 h-6 text-[#C98A3D]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#D8D8DC]">No projects yet</h4>
              <p className="text-xs text-[#77777D] max-w-sm mx-auto mt-1">
                Create your first project to upload OpenAPI specifications, track contract revisions, and persist intelligence reports.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create your first project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className="bg-[#111113] border border-[#29292D] hover:border-[#C98A3D]/50 rounded p-4 cursor-pointer transition-all hover:bg-[#161619] group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-semibold text-[#D8D8DC] group-hover:text-[#C98A3D] transition-colors font-mono">
                      {proj.name}
                    </h4>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161619] border border-[#29292D] text-[#77777D]">
                      {proj.versionsCount || 0} {(proj.versionsCount === 1) ? "version" : "versions"}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#77777D] mt-1.5 line-clamp-2 leading-relaxed">
                    {proj.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-[#29292D] flex items-center justify-between text-[11px] text-[#77777D] font-mono">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3 h-3 text-[#77777D]" />
                    <span>{formatDate(proj.updatedAt || proj.createdAt)}</span>
                  </div>

                  <span className="text-[#C98A3D] flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      {metrics && metrics.recentActivity && metrics.recentActivity.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#29292D]">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-[#C98A3D]" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#D8D8DC] font-mono">
              Recent Activity
            </h3>
          </div>

          <div className="bg-[#111113] border border-[#29292D] rounded-lg divide-y divide-[#29292D] overflow-hidden">
            {metrics.recentActivity.map((act) => (
              <div
                key={act.id}
                onClick={() => onSelectProject(act.projectId)}
                className="p-4 flex items-center justify-between hover:bg-[#161619] transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-[#161619] border border-[#29292D] flex items-center justify-center shrink-0">
                    {act.type === "version_uploaded" && <FileCode className="w-4 h-4 text-[#C98A3D]" />}
                    {act.type === "governance_run" && <ShieldAlert className="w-4 h-4 text-[#C98A3D]" />}
                    {act.type === "diff_generated" && <GitCompare className="w-4 h-4 text-[#C98A3D]" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-[#D8D8DC] group-hover:text-[#C98A3D] transition-colors">
                        {act.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[#0B0B0D] border border-[#29292D] text-[#77777D]">
                        {act.projectName}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#77777D] mt-0.5">{act.description}</p>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-[#77777D] shrink-0">
                  {formatDate(act.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-mono text-xs">
          <div className="w-full max-w-md bg-[#111113] border border-[#29292D] rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderGit2 className="w-5 h-5 text-[#C98A3D]" />
                <h3 className="text-base font-semibold text-[#D8D8DC]">Create New Project</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#77777D] hover:text-[#D8D8DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#77777D] uppercase mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. E-Commerce Backend API"
                  className="w-full bg-[#0B0B0D] border border-[#29292D] rounded px-3 py-2 text-xs text-[#D8D8DC] placeholder-[#77777D]/50 focus:outline-none focus:border-[#C98A3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#77777D] uppercase mb-1">Description</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Brief description of the API domain and architectural scope..."
                  className="w-full h-20 bg-[#0B0B0D] border border-[#29292D] rounded p-3 text-xs text-[#D8D8DC] placeholder-[#77777D]/50 focus:outline-none focus:border-[#C98A3D]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded bg-[#161619] hover:bg-[#202024] text-xs font-medium text-[#D8D8DC] border border-[#29292D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
