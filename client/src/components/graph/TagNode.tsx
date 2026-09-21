import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Tag } from "lucide-react";

export const TagNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={`px-3 py-1.5 rounded-md bg-[#111113] border font-mono select-none cursor-pointer min-w-[150px] relative transition-all duration-150 ease-out hover:scale-[1.02] hover:z-20 ${
        selected
          ? "border-[#C98A3D] ring-1 ring-[#C98A3D]/40 bg-[#161619] shadow-[0_0_12px_rgba(201,138,61,0.25)] hover:shadow-[0_0_16px_rgba(201,138,61,0.35)]"
          : "border-[#29292D] shadow-md hover:border-[#C98A3D] hover:shadow-[0_0_12px_rgba(201,138,61,0.25)]"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`!w-1.5 !h-1.5 !border !border-[#111113] ${
          selected ? "!bg-[#C98A3D]" : "!bg-[#77777D]"
        }`}
      />

      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1.5 min-w-0 ${selected ? "text-[#C98A3D]" : "text-[#77777D]"}`}>
          <Tag className="w-2.5 h-2.5 shrink-0" />
          <span className="text-[9px] uppercase font-bold tracking-wider shrink-0">
            [TAG]
          </span>
          <span className="text-xs font-semibold text-[#D8D8DC] truncate">
            {data.name || data.label || "Tag"}
          </span>
        </div>
        {data.endpointCount !== undefined && (
          <span className="text-[10px] text-[#77777D] shrink-0">
            {data.endpointCount} ep
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-1.5 !h-1.5 !border !border-[#111113] ${
          selected ? "!bg-[#C98A3D]" : "!bg-[#77777D]"
        }`}
      />
    </div>
  );
};
