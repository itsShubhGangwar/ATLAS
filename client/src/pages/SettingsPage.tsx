import React from "react";
import { Server, Database, Sliders } from "lucide-react";

export const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 font-mono text-xs">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-[#161619] border border-[#29292D] flex items-center justify-center text-[#C98A3D]">
          <Sliders className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#D8D8DC]">Workbench Settings</h2>
          <p className="text-xs text-[#77777D] font-sans">
            Configuration parameters for the local ATLAS workbench environment.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-[#111113] border border-[#29292D] p-6 space-y-6">
        <div className="flex items-start space-x-4">
          <Server className="w-5 h-5 text-[#C98A3D] mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#D8D8DC]">Express Backend Service</h3>
            <p className="text-xs text-[#77777D] mt-0.5">Endpoint: http://localhost:5000</p>
            <p className="text-[11px] text-[#77777D] mt-1 font-mono">Proxy: Vite /api/ &rarr; Express :5000</p>
          </div>
        </div>

        <div className="border-t border-[#29292D] pt-6 flex items-start space-x-4">
          <Database className="w-5 h-5 text-[#C98A3D] mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#D8D8DC]">MongoDB Database URI</h3>
            <p className="text-xs text-[#77777D] mt-0.5">mongodb://localhost:27017/atlas</p>
            <p className="text-[11px] text-[#77777D] mt-1">Managed via server/.env (MONGODB_URI)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
