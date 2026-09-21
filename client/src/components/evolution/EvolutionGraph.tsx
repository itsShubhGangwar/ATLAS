import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  GitCommit,
  Layers,
  Database,
  Lock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import {
  EvolutionVersionItem,
  EvolutionTransition,
} from "../../types";

interface EvolutionGraphProps {
  versions: EvolutionVersionItem[];
  transitions: EvolutionTransition[];
  selectedVersionId: string | null;
  selectedTransitionIndex: number | null;
  onSelectVersion: (versionId: string) => void;
  onSelectTransition: (transitionIndex: number) => void;
}

// Custom Node Component for Evolution Version Node
const EvolutionVersionNode = ({ data }: { data: any }) => {
  const { ver, isSelected, isCurrent, isOrigin, onClick } = data;

  const getGovernanceColor = (score: number | null) => {
    if (score === null) return "text-[#77777D] bg-[#0B0B0D] border-[#29292D]";
    if (score >= 80) return "text-[#D8D8DC] bg-[#0B0B0D] border-[#29292D]";
    if (score >= 60) return "text-[#C98A3D] bg-[#C98A3D]/10 border-[#C98A3D]/30";
    return "text-[#E06C75] bg-[#E06C75]/10 border-[#E06C75]/30";
  };

  return (
    <div
      onClick={onClick}
      className={`w-64 rounded-xl border p-4 cursor-pointer font-mono transition-all select-none shadow-lg ${
        isSelected
          ? "bg-[#161619] border-[#C98A3D] ring-1 ring-[#C98A3D]/40 shadow-sm"
          : isCurrent
          ? "bg-[#161619] border-[#C98A3D]/50 hover:border-[#C98A3D]"
          : "bg-[#111113] border-[#29292D] hover:border-[#3A3A40]"
      }`}
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-[#29292D]">
        <div className="flex items-center gap-2">
          <GitCommit
            className={`w-4 h-4 ${
              isSelected
                ? "text-[#C98A3D]"
                : isCurrent
                ? "text-[#C98A3D]"
                : "text-[#77777D]"
            }`}
          />
          <span className="font-bold text-sm text-[#D8D8DC]">v{ver.version}</span>
        </div>
        {isCurrent && (
          <span className="px-1.5 py-0.5 rounded bg-[#C98A3D]/15 text-[#C98A3D] border border-[#C98A3D]/30 text-[9px] font-bold">
            CURRENT
          </span>
        )}
        {isOrigin && (
          <span className="px-1.5 py-0.5 rounded bg-[#0B0B0D] text-[#77777D] border border-[#29292D] text-[9px]">
            ORIGIN
          </span>
        )}
      </div>

      {ver.name && (
        <div className="text-[11px] text-[#77777D] truncate mt-2">
          "{ver.name}"
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-1.5 my-3 text-[11px] text-[#D8D8DC]">
        <div className="p-1.5 rounded bg-[#0B0B0D] border border-[#29292D] flex items-center justify-center gap-1">
          <Layers className="w-3 h-3 text-[#77777D]" />
          <span>{ver.endpointCount}</span>
        </div>
        <div className="p-1.5 rounded bg-[#0B0B0D] border border-[#29292D] flex items-center justify-center gap-1">
          <Database className="w-3 h-3 text-[#77777D]" />
          <span>{ver.schemaCount}</span>
        </div>
        <div className="p-1.5 rounded bg-[#0B0B0D] border border-[#29292D] flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-[#77777D]" />
          <span>{ver.securitySchemeCount}</span>
        </div>
      </div>

      {/* Governance & Breaking Status */}
      <div className="flex items-center justify-between gap-1 text-[10px]">
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded border ${getGovernanceColor(
            ver.governanceScore
          )}`}
        >
          {ver.governanceScore !== null ? (
            ver.governanceScore >= 80 ? (
              <ShieldCheck className="w-3 h-3" />
            ) : (
              <ShieldAlert className="w-3 h-3" />
            )
          ) : (
            <ShieldAlert className="w-3 h-3" />
          )}
          <span>
            {ver.governanceScore !== null ? `${ver.governanceScore}/100` : "No Audit"}
          </span>
        </div>

        {ver.changesFromPrevious?.breaking ? (
          <span className="flex items-center gap-1 text-[#E06C75] px-1.5 py-0.5 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 font-semibold">
            <AlertTriangle className="w-2.5 h-2.5" />
            {ver.changesFromPrevious.breaking}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const nodeTypes = {
  evolutionVersion: EvolutionVersionNode,
};

export const EvolutionGraph: React.FC<EvolutionGraphProps> = ({
  versions,
  transitions,
  selectedVersionId,
  selectedTransitionIndex,
  onSelectVersion,
  onSelectTransition,
}) => {
  const nodes: Node[] = useMemo(() => {
    return versions.map((ver, idx) => ({
      id: ver.id,
      type: "evolutionVersion",
      position: { x: idx * 340 + 50, y: 150 },
      data: {
        ver,
        isSelected: selectedVersionId === ver.id,
        isCurrent: idx === versions.length - 1,
        isOrigin: idx === 0,
        onClick: () => onSelectVersion(ver.id),
      },
    }));
  }, [versions, selectedVersionId, onSelectVersion]);

  const edges: Edge[] = useMemo(() => {
    return transitions.map((t, idx) => {
      const isSelected = selectedTransitionIndex === idx;
      const isBreaking = t.metrics.breakingChangesCount > 0;

      return {
        id: `transition-${idx}`,
        source: t.fromVersionId,
        target: t.toVersionId,
        type: "smoothstep",
        animated: isSelected,
        label: isBreaking
          ? `⚠️ ${t.metrics.breakingChangesCount} breaking`
          : `+${t.metrics.nonBreakingChangesCount} changes`,
        labelStyle: {
          fill: isBreaking ? "#E06C75" : "#D8D8DC",
          fontWeight: 600,
          fontFamily: "monospace",
          fontSize: 11,
        },
        labelBgStyle: {
          fill: isBreaking ? "#161619" : "#111113",
          fillOpacity: 0.95,
          stroke: isBreaking ? "#E06C75" : "#29292D",
          strokeWidth: 1,
          rx: 6,
          ry: 6,
        },
        style: {
          stroke: isSelected
            ? "#C98A3D"
            : isBreaking
            ? "#E06C75"
            : "#3A3A40",
          strokeWidth: isSelected ? 3 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isSelected
            ? "#C98A3D"
            : isBreaking
            ? "#E06C75"
            : "#3A3A40",
        },
      };
    });
  }, [transitions, selectedTransitionIndex]);

  return (
    <div className="w-full h-[450px] bg-[#0B0B0D] border border-[#29292D] rounded-xl overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelectVersion(node.id)}
        onEdgeClick={(_, edge) => {
          const match = edge.id.match(/^transition-(\d+)$/);
          if (match) {
            onSelectTransition(parseInt(match[1], 10));
          }
        }}
        fitView
        attributionPosition="bottom-right"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#29292D" />
        <Controls className="bg-[#111113] border-[#29292D] fill-[#D8D8DC]" />
        <MiniMap
          nodeColor={(n) => {
            if (n.data?.isSelected) return "#C98A3D";
            if (n.data?.isCurrent) return "#D8D8DC";
            return "#29292D";
          }}
          maskColor="rgba(11, 11, 13, 0.7)"
          className="bg-[#111113] border border-[#29292D] rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};
