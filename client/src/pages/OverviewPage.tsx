import React from "react";
import {
  Layers,
  Database,
  Activity,
  FileCode,
  Network,
  ShieldCheck,
  GitCompare,
  Code2
} from "lucide-react";
import { HealthStatus } from "../types";

interface OverviewPageProps {
  health: HealthStatus;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ health }) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto font-mono text-xs">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-lg bg-[#111113] border border-[#29292D] p-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-[#161619] border border-[#29292D] text-[#C98A3D] text-[11px] mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C98A3D]"></span>
            <span>Architecture & Subsystem Topology</span>
          </div>
          <h2 className="text-xl font-bold text-[#D8D8DC] tracking-tight">
            ATLAS — API Engineering Workbench
          </h2>
          <p className="mt-2 text-xs text-[#77777D] leading-relaxed font-sans">
            A production-style API engineering workbench inspired by HELIOS, built on the clean MERN stack
            with deterministic rule engines. Built for parsing, visualizing, governing, diffing, and generating client SDKs.
          </p>
        </div>
      </div>

      {/* Backend Health Check Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-lg bg-[#111113] border border-[#29292D] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Activity className="w-4 h-4 text-[#C98A3D]" />
              <h3 className="text-sm font-semibold text-[#D8D8DC]">Backend API Connectivity</h3>
            </div>
            <span className="text-[11px] font-mono text-[#77777D]">GET /api/health</span>
          </div>

          <div className="bg-[#0B0B0D] border border-[#29292D] rounded p-4 font-mono text-xs text-[#D8D8DC]">
            {health.status === "loading" ? (
              <p className="text-[#C98A3D]">Pinging http://localhost:5000/api/health ...</p>
            ) : health.status === "ok" ? (
              <div className="space-y-1 text-[#D8D8DC]">
                <p className="text-[#77777D]">// Response 200 OK</p>
                <pre>{JSON.stringify({ status: health.status, service: health.service }, null, 2)}</pre>
                <p className="text-[11px] text-[#77777D] mt-2">Verified at: {health.timestamp}</p>
              </div>
            ) : (
              <div className="text-[#E06C75] space-y-1">
                <p className="font-semibold">// Connection Failed</p>
                <p className="text-[#77777D] text-[11px]">{health.error}</p>
                <p className="text-[#77777D] text-[11px]">Make sure the Express server is running on port 5000.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-[#111113] border border-[#29292D] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <Database className="w-4 h-4 text-[#C98A3D]" />
              <h3 className="text-sm font-semibold text-[#D8D8DC]">Database Layer</h3>
            </div>
            <p className="text-xs text-[#77777D] leading-relaxed font-sans">
              Mongoose is configured with graceful non-blocking initialization. Server runs unhindered even when offline.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-[#29292D]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#77777D]">Target:</span>
              <span className="text-[#D8D8DC]">mongodb://localhost:27017/atlas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Architectural Intention: Future Pipeline Flow */}
      <div className="rounded-lg bg-[#111113] border border-[#29292D] p-6">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[#D8D8DC]">Core Processing Pipeline (Architecture Roadmap)</h3>
          <p className="text-xs text-[#77777D] mt-1 font-sans">
            Canonical API Model will serve as the central domain model powering all analytical engines.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded bg-[#0B0B0D] border border-[#29292D] flex flex-col items-center text-center">
            <FileCode className="w-6 h-6 text-[#C98A3D] mb-2" />
            <span className="text-xs font-semibold text-[#D8D8DC]">OpenAPI YAML/JSON</span>
            <span className="text-[11px] text-[#77777D] mt-1">v2.0, v3.0, v3.1 Ingestion</span>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded bg-[#0B0B0D] border border-[#29292D] flex flex-col items-center text-center">
            <Layers className="w-6 h-6 text-[#C98A3D] mb-2" />
            <span className="text-xs font-semibold text-[#D8D8DC]">OpenAPI Parser</span>
            <span className="text-[11px] text-[#77777D] mt-1">Validation & Normalization</span>
          </div>

          {/* Step 3 - Canonical Model */}
          <div className="p-4 rounded bg-[#161619] border border-[#C98A3D]/40 flex flex-col items-center text-center lg:col-span-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#C98A3D]/15 text-[#C98A3D] mb-1">Central Core</span>
            <span className="text-xs font-bold text-[#D8D8DC]">Canonical API Model</span>
            <span className="text-[11px] text-[#77777D] mt-1">Normalized contract representation feeding all modules</span>
          </div>
        </div>

        {/* Fan-out modules */}
        <div className="mt-4 pt-4 border-t border-[#29292D] grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded bg-[#0B0B0D] border border-[#29292D] text-center">
            <Network className="w-4 h-4 text-[#C98A3D] mx-auto mb-1" />
            <span className="text-xs font-medium text-[#D8D8DC]">Knowledge Graph</span>
          </div>
          <div className="p-3 rounded bg-[#0B0B0D] border border-[#29292D] text-center">
            <ShieldCheck className="w-4 h-4 text-[#C98A3D] mx-auto mb-1" />
            <span className="text-xs font-medium text-[#D8D8DC]">Security Engine</span>
          </div>
          <div className="p-3 rounded bg-[#0B0B0D] border border-[#29292D] text-center">
            <GitCompare className="w-4 h-4 text-[#C98A3D] mx-auto mb-1" />
            <span className="text-xs font-medium text-[#D8D8DC]">Diff Engine</span>
          </div>
          <div className="p-3 rounded bg-[#0B0B0D] border border-[#29292D] text-center">
            <Code2 className="w-4 h-4 text-[#C98A3D] mx-auto mb-1" />
            <span className="text-xs font-medium text-[#D8D8DC]">SDK Generator</span>
          </div>
        </div>
      </div>
    </div>
  );
};
