import React, { useState, useEffect } from "react";
import {
  Code2,
  Download,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Terminal,
} from "lucide-react";
import { CanonicalApiModel, GeneratedSdk, SdkFile } from "../types";
import { generateTypescriptSdkApi } from "../services/api";

interface SdkPageProps {
  sharedModel?: CanonicalApiModel | null;
}

export const SdkPage: React.FC<SdkPageProps> = ({ sharedModel }) => {
  const [clientName, setClientName] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("https://api.atlas.dev/v1");
  const [customSpec, setCustomSpec] = useState<string>("");
  const [sdk, setSdk] = useState<GeneratedSdk | null>(null);
  const [activeFile, setActiveFile] = useState<string>("client.ts");
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sharedModel?.metadata?.title) {
      const sanitized = sharedModel.metadata.title.replace(/[^a-zA-Z0-9]/g, "");
      setClientName(sanitized || "AtlasApi");
    }
  }, [sharedModel]);

  const handleGenerate = async (input?: CanonicalApiModel | string | File) => {
    setIsLoading(true);
    setError(null);

    try {
      const targetInput = input || (sharedModel ? sharedModel : customSpec);
      if (!targetInput) {
        setError("Please provide an OpenAPI specification or load a model first.");
        setIsLoading(false);
        return;
      }

      const res = await generateTypescriptSdkApi(targetInput, {
        clientName: clientName.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
      });

      if (res.success && res.data) {
        setSdk(res.data);
        setActiveFile(res.data.files[1]?.filename || res.data.files[0]?.filename);
      } else {
        setError(res.error || "Failed to generate TypeScript SDK.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during SDK generation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const current = sdk?.files.find((f) => f.filename === activeFile);
    if (current) {
      navigator.clipboard.writeText(current.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadFile = (file: SdkFile) => {
    const blob = new Blob([file.content], { type: "text/typescript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentFileContent = sdk?.files.find((f) => f.filename === activeFile)?.content || "";

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header & Configuration */}
      <div className="bg-[#111113] border border-[#29292D] rounded-lg p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Code2 className="w-5 h-5 text-[#C98A3D]" />
              <h2 className="text-lg font-semibold text-[#D8D8DC]">Deterministic TypeScript SDK Generator</h2>
            </div>
            <p className="text-xs text-[#77777D] mt-1 font-sans">
              Synthesizes a production-grade, zero-dependency fetch client library directly from the validated Canonical API Model.
            </p>
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={isLoading || (!sharedModel && !customSpec.trim())}
            className="flex items-center space-x-2 px-5 py-2.5 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-xs font-bold text-[#0B0B0D] transition-colors disabled:opacity-50 shadow-md self-start md:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? "Synthesizing SDK..." : "Generate TypeScript SDK"}</span>
          </button>
        </div>

        {/* Configuration inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#29292D]">
          <div>
            <label className="block text-xs font-mono text-[#77777D] uppercase mb-1.5">
              Client Class Name
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. AtlasApi (creates AtlasApiClient)"
              className="w-full bg-[#0B0B0D] border border-[#29292D] rounded px-3 py-2 text-xs font-mono text-[#D8D8DC] placeholder-[#77777D]/50 focus:outline-none focus:border-[#C98A3D]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#77777D] uppercase mb-1.5">
              Default Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.yourdomain.com/v1"
              className="w-full bg-[#0B0B0D] border border-[#29292D] rounded px-3 py-2 text-xs font-mono text-[#D8D8DC] placeholder-[#77777D]/50 focus:outline-none focus:border-[#C98A3D]"
            />
          </div>
        </div>

        {/* Fallback spec input if no model loaded */}
        {!sharedModel && (
          <div className="pt-2 border-t border-[#29292D] space-y-2">
            <span className="text-xs text-[#D8D8DC] font-medium">Or paste OpenAPI YAML/JSON:</span>
            <textarea
              value={customSpec}
              onChange={(e) => setCustomSpec(e.target.value)}
              placeholder="openapi: 3.0.0&#10;info:&#10;  title: My API&#10;  version: 1.0.0..."
              className="w-full h-24 bg-[#0B0B0D] border border-[#29292D] rounded p-3 text-xs font-mono text-[#D8D8DC] placeholder-[#77777D]/50 focus:outline-none focus:border-[#C98A3D]"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs">
          {error}
        </div>
      )}

      {/* Generated SDK Viewer */}
      {sdk && (
        <div className="space-y-4">
          {/* Features Badges */}
          <div className="flex flex-wrap gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded bg-[#161619] text-[#D8D8DC] border border-[#29292D] flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-[#C98A3D]" />
              <span>Full Interface Typings</span>
            </span>
            <span className="px-2.5 py-1 rounded bg-[#161619] text-[#D8D8DC] border border-[#29292D] flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-[#C98A3D]" />
              <span>Native Fetch (Zero Dep)</span>
            </span>
            <span className="px-2.5 py-1 rounded bg-[#161619] text-[#D8D8DC] border border-[#29292D] flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-[#C98A3D]" />
              <span>Path Param Interpolation</span>
            </span>
            <span className="px-2.5 py-1 rounded bg-[#161619] text-[#D8D8DC] border border-[#29292D] flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-[#C98A3D]" />
              <span>Bearer & Header Auth</span>
            </span>
          </div>

          {/* Code Viewer Container */}
          <div className="bg-[#111113] border border-[#29292D] rounded-lg overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#0B0B0D] border-b border-[#29292D]">
              <div className="flex space-x-1">
                {sdk.files.map((file) => (
                  <button
                    key={file.filename}
                    onClick={() => setActiveFile(file.filename)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                      activeFile === file.filename
                        ? "bg-[#161619] text-[#C98A3D] border border-[#29292D]"
                        : "text-[#77777D] hover:text-[#D8D8DC] hover:bg-[#161619]"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{file.filename}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#C98A3D]" /> : <Copy className="w-3.5 h-3.5 text-[#77777D]" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>

                <button
                  onClick={() => {
                    const f = sdk.files.find((file) => file.filename === activeFile);
                    if (f) handleDownloadFile(f);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#161619] hover:bg-[#202024] text-xs font-mono text-[#D8D8DC] border border-[#29292D] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#77777D]" />
                  <span>Download {activeFile}</span>
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="p-4 bg-[#0B0B0D] overflow-x-auto max-h-[600px] overflow-y-auto">
              <pre className="text-xs font-mono text-[#D8D8DC] leading-relaxed">
                <code>{currentFileContent}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Initial state */}
      {!sdk && !isLoading && (
        <div className="bg-[#111113] border border-[#29292D] rounded-lg p-12 text-center space-y-3">
          <Terminal className="w-10 h-10 text-[#77777D] mx-auto" />
          <h3 className="text-sm font-semibold text-[#D8D8DC]">Ready to Generate TypeScript SDK</h3>
          <p className="text-xs text-[#77777D] max-w-md mx-auto font-sans">
            Generate type definitions, parameter interfaces, and an HTTP client with query and header handling in seconds.
          </p>
        </div>
      )}
    </div>
  );
};
