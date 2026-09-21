import React from "react";
import {
  LayoutDashboard,
  FolderGit2,
  Compass,
  Network,
  ShieldAlert,
  GitCompare,
  Code2,
  Layers,
  Terminal,
  LogOut,
  User as UserIcon,
  Zap,
  History,
  Box,
} from "lucide-react";
import { NavSection, User } from "../types";

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  user: User | null;
  onLogout: () => void;
  isDemoMode?: boolean;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  user,
  onLogout,
  isDemoMode,
}) => {
  const groups: NavGroup[] = [
    {
      label: "WORKSPACE",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "projects", label: "Projects", icon: FolderGit2 },
      ],
    },
    {
      label: "API INTELLIGENCE",
      items: [
        { id: "graph", label: "Topology Graph", icon: Network, badge: "Graph" },
        { id: "simulator", label: "What-If Simulator", icon: Zap, badge: "Sim" },
        { id: "evolution", label: "Evolution Timeline", icon: History, badge: "History" },
      ],
    },
    {
      label: "ANALYSIS & GOVERNANCE",
      items: [
        { id: "governance", label: "Security & Rules", icon: ShieldAlert },
        { id: "diff", label: "API Diff", icon: GitCompare },
        { id: "explorer", label: "API Explorer", icon: Compass },
      ],
    },
    {
      label: "DEVELOPER",
      items: [
        { id: "sdk", label: "TypeScript SDK", icon: Code2 },
        { id: "overview", label: "Architecture", icon: Layers },
      ],
    },
  ];

  return (
    <aside className="w-60 bg-[#0B0B0D] border-r border-[#29292D] flex flex-col h-screen select-none shrink-0 font-mono text-xs">
      {/* Brand Header */}
      <div className="h-11 flex items-center px-4 border-b border-[#29292D] space-x-2.5">
        <div className="w-6 h-6 rounded bg-[#161619] border border-[#29292D] flex items-center justify-center">
          <Terminal className="w-3.5 h-3.5 text-[#C98A3D]" />
        </div>
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className="font-bold tracking-wider text-xs text-[#D8D8DC]">ATLAS</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#161619] text-[#77777D] border border-[#29292D]">
            v0.6.0
          </span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <div className="px-2 pb-1 text-[9px] font-bold text-[#77777D] uppercase tracking-widest">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeSection === item.id ||
                (item.id === "projects" &&
                  (activeSection === "project_detail" || activeSection === "version_detail"));

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] transition-colors ${
                    isActive
                      ? "bg-[#161619] text-[#D8D8DC] border-l-2 border-[#C98A3D] font-medium"
                      : "text-[#77777D] hover:text-[#D8D8DC] hover:bg-[#111113] border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? "text-[#C98A3D]" : "text-[#77777D]"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[8px] px-1 py-0.2 rounded border border-[#29292D] text-[#77777D] bg-[#161619] uppercase font-bold shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Context Widget */}
      {isDemoMode ? (
        <div className="p-2 border-t border-[#29292D] bg-[#0B0B0D]">
          <div className="p-2 rounded bg-[#111113] border border-[#29292D] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-[#77777D] uppercase font-bold">Active Dataset</span>
              <span className="text-[9px] px-1 rounded bg-[#C98A3D]/15 border border-[#C98A3D]/30 text-[#C98A3D]">
                READ-ONLY
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[#D8D8DC]">
              <Box className="w-3 h-3 text-[#C98A3D] shrink-0" />
              <span className="truncate font-semibold text-[11px]">Atlas Workflow API</span>
            </div>
            <p className="text-[9px] text-[#77777D]">v1.0.0 • Dense Graph OAS3</p>
          </div>
        </div>
      ) : user ? (
        <div className="p-2 border-t border-[#29292D] bg-[#0B0B0D]">
          <div className="flex items-center justify-between p-1.5 rounded bg-[#111113] border border-[#29292D]">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-6 h-6 rounded bg-[#161619] border border-[#29292D] text-[#D8D8DC] flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                {user.name ? user.name.slice(0, 2) : <UserIcon className="w-3 h-3" />}
              </div>
              <div className="min-w-0 truncate">
                <p className="text-[11px] font-medium text-[#D8D8DC] truncate">{user.name}</p>
                <p className="text-[9px] text-[#77777D] truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Log out of workbench"
              className="p-1 text-[#77777D] hover:text-[#E06C75] hover:bg-[#161619] rounded transition-colors shrink-0"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
};

