import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Database } from "lucide-react";

export const SchemaNode: React.FC<NodeProps> = ({ data, selected }) => {
  const propertyCount = Array.isArray(data.properties)
    ? data.properties.length
    : (data.propertyCount ?? 0);

  return (
    <div
      className={`px-3 py-2 rounded-md bg-[#111113] border font-mono select-none cursor-pointer min-w-[190px] max-w-[250px] relative transition-all duration-150 ease-out hover:scale-[1.02] hover:z-20 ${
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

      <div className="flex items-center justify-between gap-2 mb-1">
        <div className={`flex items-center gap-1.5 ${selected ? "text-[#C98A3D]" : "text-[#77777D]"}`}>
          <Database className="w-3 h-3" />
          <span className="text-[9px] uppercase font-bold tracking-wider">
            [SCHEMA]
          </span>
        </div>
        <span className="text-[10px] text-[#77777D]">
          {propertyCount} props
        </span>
      </div>

      <div className="text-xs font-bold text-[#D8D8DC] truncate" title={data.name}>
        {data.name || "Schema"}
      </div>

      <div className="text-[10px] text-[#77777D] mt-0.5 truncate">
        type: {data.type || "object"}
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
