import React from "react";
import { RefreshCw, Server, LogOut, User as UserIcon, X } from "lucide-react";
import { HealthStatus, User } from "../types";

interface HeaderProps {
  title: string;
  subtitle: string;
  health: HealthStatus;
  onRefreshHealth: () => void;
  isCheckingHealth: boolean;
  user?: User | null;
  onLogout?: () => void;
  isDemoMode?: boolean;
  onExitDemo?: () => void;
  projectName?: string | null;
  versionName?: string | null;
  activeSection?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle: _subtitle,
  health,
  onRefreshHealth,
  isCheckingHealth,
  user,
  onLogout,
  isDemoMode,
  onExitDemo,
  projectName,
  versionName,
  activeSection,
}) => {
  return (
    <header className="h-11 border-b border-[#29292D] bg-[#0B0B0D] px-4 flex items-center justify-between select-none shrink-0 z-20">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs font-mono">
        <span className="font-bold text-[#D8D8DC] tracking-wider">ATLAS</span>
        <span className="text-[#3A3A40]">/</span>

        {isDemoMode ? (
          <>
            <span className="text-[#D8D8DC] font-medium">{projectName || "Atlas Workflow API"}</span>
            <span className="text-[#3A3A40]">/</span>
            <span className="text-[#77777D]">{versionName || "v1.0.0"}</span>
            <span className="text-[#3A3A40]">/</span>
          </>
        ) : projectName ? (
          <>
            <span className="text-[#D8D8DC] font-medium">{projectName}</span>
            <span className="text-[#3A3A40]">/</span>
            {versionName && (
              <>
                <span className="text-[#77777D]">{versionName}</span>
                <span className="text-[#3A3A40]">/</span>
              </>
            )}
          </>
        ) : null}

        <span className="text-[#D8D8DC] font-medium capitalize">
          {activeSection?.replace("_", " ") || title}
        </span>
      </div>

      {/* Center: Demo Mode Banner if active */}
      {isDemoMode && (
        <div className="hidden md:flex items-center space-x-2 px-2.5 py-0.5 bg-[#161619] border border-[#C98A3D]/40 rounded text-xs font-mono text-[#C98A3D]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C98A3D]" />
          <span className="font-bold uppercase tracking-wider text-[10px]">Demo Mode</span>
          <span className="text-[#77777D] text-[11px]">— Read-only workspace</span>
          {onExitDemo && (
            <button
              onClick={onExitDemo}
              className="ml-2 flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#C98A3D]/15 hover:bg-[#C98A3D]/25 text-[#C98A3D] text-[10px] uppercase font-bold tracking-wider transition-colors border border-[#C98A3D]/30"
            >
              <span>Exit Demo</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Right: Health, Actions, & Profile */}
      <div className="flex items-center space-x-3 text-xs font-mono">
        {/* API Backend status badge */}
        <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#111113] border border-[#29292D] text-[11px]">
          <Server className="w-3 h-3 text-[#77777D]" />
          {health.status === "ok" ? (
            <span className="flex items-center space-x-1 text-[#D8D8DC]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#77777D]" />
              <span>API: 200</span>
            </span>
          ) : health.status === "loading" ? (
            <span className="flex items-center space-x-1 text-[#C98A3D]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C98A3D] animate-pulse" />
              <span>API: ...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-[#E06C75]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E06C75]" />
              <span>API: 503</span>
            </span>
          )}

          <button
            onClick={onRefreshHealth}
            disabled={isCheckingHealth}
            title="Refresh backend health"
            className="ml-1 text-[#77777D] hover:text-[#D8D8DC] disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isCheckingHealth ? "animate-spin text-[#C98A3D]" : ""}`} />
          </button>
        </div>

        {/* User Badge or Demo Pill */}
        {isDemoMode ? (
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-[#161619] border border-[#29292D] text-[#77777D] text-[10px] font-mono uppercase tracking-wider font-semibold">
              Guest Recruiter
            </span>
            {onExitDemo && (
              <button
                onClick={onExitDemo}
                className="md:hidden p-1 text-[#77777D] hover:text-[#D8D8DC]"
                title="Exit Demo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : user ? (
          <div className="flex items-center space-x-2 pl-2 border-l border-[#29292D]">
            <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#111113] border border-[#29292D] text-[#D8D8DC]">
              <UserIcon className="w-3 h-3 text-[#77777D]" />
              <span className="text-[11px] truncate max-w-[120px]">{user.name}</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Log out"
                className="p-1 text-[#77777D] hover:text-[#E06C75] hover:bg-[#161619] rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
};
