import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Lock } from "lucide-react";

export const EndpointNode: React.FC<NodeProps> = ({ data, selected }) => {
  const method = (data.method || "GET").toUpperCase();
  const hasSecurity = Array.isArray(data.security) && data.security.length > 0;

  return (
    <div
      className={`px-3 py-2 rounded-md bg-[#111113] border font-mono select-none cursor-pointer min-w-[210px] max-w-[280px] relative transition-all duration-150 ease-out hover:scale-[1.02] hover:z-20 ${
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

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className={`px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-wider ${
            selected
              ? "bg-[#C98A3D]/15 border-[#C98A3D]/40 text-[#C98A3D]"
              : "bg-[#1A1A1E] border-[#29292D] text-[#D8D8DC]"
          }`}
        >
          {method}
        </span>

        <div className="flex items-center gap-1.5">
          {hasSecurity && (
            <span title="Secured route" className="text-[#77777D]">
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}
          <span className="text-[9px] uppercase font-bold text-[#5A5A62] tracking-wider">
            [ENDPOINT]
          </span>
        </div>
      </div>

      <div className="text-xs font-semibold text-[#D8D8DC] truncate" title={data.path}>
        {data.path || "/"}
      </div>

      {data.summary && (
        <p className="text-[10px] text-[#77777D] truncate mt-1 font-sans">
          {data.summary}
        </p>
      )}

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
