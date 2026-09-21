import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Terminal, Layers, Database } from "lucide-react";

export const SpecNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={`px-3.5 py-2.5 rounded-md bg-[#111113] border font-mono select-none cursor-pointer min-w-[240px] relative transition-all duration-150 ease-out hover:scale-[1.02] hover:z-20 ${
        selected
          ? "border-[#C98A3D] ring-1 ring-[#C98A3D]/40 bg-[#161619] shadow-[0_0_12px_rgba(201,138,61,0.25)] hover:shadow-[0_0_16px_rgba(201,138,61,0.35)]"
          : "border-[#29292D] shadow-md hover:border-[#C98A3D] hover:shadow-[0_0_12px_rgba(201,138,61,0.25)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-[#29292D]">
        <div className={`flex items-center gap-1.5 ${selected ? "text-[#C98A3D]" : "text-[#77777D]"}`}>
          <Terminal className="w-3 h-3" />
          <span className="text-[9px] uppercase font-bold tracking-wider">
            [SPEC]
          </span>
        </div>
        <span className="text-[10px] text-[#77777D]">
          v{data.version || "1.0.0"}
        </span>
      </div>

      <div className="text-xs font-bold text-[#D8D8DC] truncate" title={data.title}>
        {data.title || "API Specification"}
      </div>

      <div className="mt-2 pt-1.5 border-t border-[#29292D] flex items-center justify-between text-[10px] text-[#77777D]">
        <span>{data.openApiVersion ? `OAS ${data.openApiVersion}` : "OpenAPI 3.0"}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#D8D8DC]">
            <Layers className="w-2.5 h-2.5 text-[#77777D]" />
            <span>{data.endpointCount ?? 0}</span>
          </span>
          <span className="flex items-center gap-1 text-[#D8D8DC]">
            <Database className="w-2.5 h-2.5 text-[#77777D]" />
            <span>{data.schemaCount ?? 0}</span>
          </span>
        </div>
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
