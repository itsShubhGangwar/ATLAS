import React, { useState, useEffect } from "react";
import {
  Zap,
  Play,
  Compass,
  Box,
  Plus,
  Loader2,
} from "lucide-react";
import {
  CanonicalApiModel,
  WhatIfChange,
  WhatIfChangeType,
  ApiEndpoint,
  ApiSchema,
} from "../../types";

interface ChangeSelectorProps {
  model: CanonicalApiModel;
  onRunSimulation: (change: WhatIfChange) => void;
  isLoading: boolean;
}

export const ChangeSelector: React.FC<ChangeSelectorProps> = ({
  model,
  onRunSimulation,
  isLoading,
}) => {
  const [targetCategory, setTargetCategory] = useState<"endpoint" | "schema" | "new_endpoint">("endpoint");

  // Selected entities
  const [selectedEndpointKey, setSelectedEndpointKey] = useState<string>("");
  const [selectedSchemaName, setSelectedSchemaName] = useState<string>("");

  // Operation
  const [selectedOperation, setSelectedOperation] = useState<WhatIfChangeType>("REMOVE_AUTHENTICATION");

  // Sub-inputs
  const [selectedSecurityScheme, setSelectedSecurityScheme] = useState<string>("");
  const [selectedParam, setSelectedParam] = useState<string>("");
  const [selectedStatusCode, setSelectedStatusCode] = useState<string>("200");
  const [responseField, setResponseField] = useState<string>("");
  const [selectedProperty, setSelectedProperty] = useState<string>("");

  // New endpoint inputs
  const [newMethod, setNewMethod] = useState<string>("GET");
  const [newPath, setNewPath] = useState<string>("/orders/{id}/tracking");
  const [newSummary, setNewSummary] = useState<string>("Order live tracking status");

  // Set initial selections when model loads
  useEffect(() => {
    if (model.endpoints && model.endpoints.length > 0 && !selectedEndpointKey) {
      const first = model.endpoints[0];
      setSelectedEndpointKey(`${first.method.toUpperCase()} ${first.path}`);
    }
    if (model.schemas && model.schemas.length > 0 && !selectedSchemaName) {
      setSelectedSchemaName(model.schemas[0].name);
    }
    if (model.securitySchemes && model.securitySchemes.length > 0 && !selectedSecurityScheme) {
      setSelectedSecurityScheme(model.securitySchemes[0].name);
    }
  }, [model]);

  // Find currently selected endpoint object
  const currentEndpoint: ApiEndpoint | undefined = model.endpoints?.find((ep) => {
    const [m, ...p] = selectedEndpointKey.split(" ");
    return ep.method.toUpperCase() === m && ep.path === p.join(" ");
  });

  // Find currently selected schema object
  const currentSchema: ApiSchema | undefined = model.schemas?.find(
    (s) => s.name === selectedSchemaName
  );

  // Sync available parameters and properties
  useEffect(() => {
    if (currentEndpoint?.parameters && currentEndpoint.parameters.length > 0) {
      setSelectedParam(currentEndpoint.parameters[0].name);
    } else {
      setSelectedParam("");
    }

    if (currentEndpoint?.responses && currentEndpoint.responses.length > 0) {
      setSelectedStatusCode(currentEndpoint.responses[0].statusCode);
    }
  }, [currentEndpoint]);

  useEffect(() => {
    if (currentSchema?.properties && currentSchema.properties.length > 0) {
      setSelectedProperty(currentSchema.properties[0].name);
    } else {
      setSelectedProperty("");
    }
  }, [currentSchema]);

  const handleRun = () => {
    let change: WhatIfChange;

    if (targetCategory === "endpoint") {
      if (!currentEndpoint) return;
      const method = currentEndpoint.method.toUpperCase();
      const path = currentEndpoint.path;

      switch (selectedOperation) {
        case "REMOVE_ENDPOINT":
          change = { type: "REMOVE_ENDPOINT", method, path };
          break;
        case "REMOVE_AUTHENTICATION":
          change = { type: "REMOVE_AUTHENTICATION", method, path };
          break;
        case "ADD_AUTHENTICATION":
          change = {
            type: "ADD_AUTHENTICATION",
            method,
            path,
            securityScheme: selectedSecurityScheme || (model.securitySchemes?.[0]?.name || "BearerAuth"),
          };
          break;
        case "MAKE_PARAMETER_REQUIRED":
          change = { type: "MAKE_PARAMETER_REQUIRED", method, path, parameter: selectedParam };
          break;
        case "REMOVE_PARAMETER":
          change = { type: "REMOVE_PARAMETER", method, path, parameter: selectedParam };
          break;
        case "REMOVE_RESPONSE_FIELD":
          change = {
            type: "REMOVE_RESPONSE_FIELD",
            method,
            path,
            statusCode: selectedStatusCode,
            field: responseField.trim(),
          };
          break;
        default:
          change = { type: "REMOVE_AUTHENTICATION", method, path };
      }
    } else if (targetCategory === "schema") {
      if (!currentSchema) return;
      change = {
        type: "REMOVE_SCHEMA_PROPERTY",
        schema: currentSchema.name,
        property: selectedProperty,
      };
    } else {
      // new_endpoint
      change = {
        type: "ADD_ENDPOINT",
        method: newMethod.toUpperCase(),
        path: newPath.trim(),
        summary: newSummary.trim(),
      };
    }

    onRunSimulation(change);
  };

  return (
    <div className="bg-[#111113] border border-[#29292D] rounded-xl p-5 space-y-5 text-[#D8D8DC]">
      <div className="flex items-center justify-between border-b border-[#29292D] pb-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-[#C98A3D]" />
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#D8D8DC]">
            What-If Change Configuration
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161619] text-[#77777D] border border-[#29292D]">
          Non-Destructive Simulation
        </span>
      </div>

      {/* Target Category Tabs */}
      <div className="flex rounded-lg bg-[#0B0B0D] p-1 border border-[#29292D]">
        <button
          type="button"
          onClick={() => {
            setTargetCategory("endpoint");
            setSelectedOperation("REMOVE_AUTHENTICATION");
          }}
          className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-md transition-colors flex items-center justify-center space-x-1.5 ${
            targetCategory === "endpoint"
              ? "bg-[#C98A3D] text-[#0B0B0D] font-bold shadow-sm"
              : "text-[#77777D] hover:text-[#D8D8DC]"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Endpoint</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTargetCategory("schema");
            setSelectedOperation("REMOVE_SCHEMA_PROPERTY");
          }}
          className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-md transition-colors flex items-center justify-center space-x-1.5 ${
            targetCategory === "schema"
              ? "bg-[#C98A3D] text-[#0B0B0D] font-bold shadow-sm"
              : "text-[#77777D] hover:text-[#D8D8DC]"
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Schema</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTargetCategory("new_endpoint");
            setSelectedOperation("ADD_ENDPOINT");
          }}
          className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-md transition-colors flex items-center justify-center space-x-1.5 ${
            targetCategory === "new_endpoint"
              ? "bg-[#C98A3D] text-[#0B0B0D] font-bold shadow-sm"
              : "text-[#77777D] hover:text-[#D8D8DC]"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Endpoint</span>
        </button>
      </div>

      {/* Target Selection & Change Configuration */}
      <div className="space-y-4">
        {targetCategory === "endpoint" && (
          <>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#77777D] mb-1.5">
                Target Endpoint ({model.endpoints?.length || 0} available)
              </label>
              <select
                value={selectedEndpointKey}
                onChange={(e) => setSelectedEndpointKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC] focus:border-[#C98A3D] focus:outline-none"
              >
                {model.endpoints?.map((ep) => (
                  <option key={`${ep.method} ${ep.path}`} value={`${ep.method.toUpperCase()} ${ep.path}`}>
                    {ep.method.toUpperCase()} {ep.path} {ep.summary ? `— ${ep.summary}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[#77777D] mb-1.5">
                What-If Operation
              </label>
              <select
                value={selectedOperation}
                onChange={(e) => setSelectedOperation(e.target.value as WhatIfChangeType)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC] focus:border-[#C98A3D] focus:outline-none"
              >
                <option value="REMOVE_AUTHENTICATION">Remove Authentication (Make Public)</option>
                <option value="ADD_AUTHENTICATION">Add Authentication Scheme</option>
                <option value="MAKE_PARAMETER_REQUIRED">Make Parameter Required</option>
                <option value="REMOVE_PARAMETER">Remove Parameter</option>
                <option value="REMOVE_RESPONSE_FIELD">Remove Field from Response Schema</option>
                <option value="REMOVE_ENDPOINT">Delete / Remove Entire Endpoint</option>
              </select>
            </div>

            {/* Dynamic inputs based on operation */}
            {selectedOperation === "ADD_AUTHENTICATION" && (
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#77777D] mb-1.5">
                  Security Scheme to Bind
                </label>
                <select
                  value={selectedSecurityScheme}
                  onChange={(e) => setSelectedSecurityScheme(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC] focus:border-[#C98A3D] focus:outline-none"
                >
                  {model.securitySchemes?.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.type} {s.scheme ? `— ${s.scheme}` : ""})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(selectedOperation === "MAKE_PARAMETER_REQUIRED" || selectedOperation === "REMOVE_PARAMETER") && (
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#77777D] mb-1.5">
                  Target Parameter ({currentEndpoint?.parameters?.length || 0} defined)
                </label>
                {currentEndpoint?.parameters && currentEndpoint.parameters.length > 0 ? (
                  <select
                    value={selectedParam}
                    onChange={(e) => setSelectedParam(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC] focus:border-[#C98A3D] focus:outline-none"
                  >
                    {currentEndpoint.parameters.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.location}, {p.required ? "required" : "optional"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-[#C98A3D] font-mono">No parameters defined on this endpoint.</p>
                )}
              </div>
            )}

            {selectedOperation === "REMOVE_RESPONSE_FIELD" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#77777D] mb-1.5">
                    Response Status
                  </label>
                  <select
                    value={selectedStatusCode}
                    onChange={(e) => setSelectedStatusCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC] focus:border-[#C98A3D] focus:outline-none"
                  >
                    {currentEndpoint?.responses?.map((r) => (
                      <option key={r.statusCode} value={r.statusCode}>
                        HTTP {r.statusCode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#77777D] mb-1.5">
                    Field Name to Remove
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. email, role, id"
                    value={responseField}
                    onChange={(e) => setResponseField(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC] focus:border-[#C98A3D] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {targetCategory === "schema" && (
          <>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#77777D] mb-1.5">
                Target Schema ({model.schemas?.length || 0} defined)
              </label>
              <select
                value={selectedSchemaName}
                onChange={(e) => setSelectedSchemaName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC] focus:border-[#C98A3D] focus:outline-none"
              >
                {model.schemas?.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.properties?.length || 0} properties)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[#77777D] mb-1.5">
                Property to Remove
              </label>
              {currentSchema?.properties && currentSchema.properties.length > 0 ? (
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC] focus:border-[#C98A3D] focus:outline-none"
                >
                  {currentSchema.properties.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.type || "string"}{p.required ? ", required" : ""})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-[#C98A3D] font-mono">No properties in this schema.</p>
              )}
            </div>
          </>
        )}

        {targetCategory === "new_endpoint" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#77777D] mb-1.5">Method</label>
                <select
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC] focus:border-[#C98A3D] focus:outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-mono uppercase text-[#77777D] mb-1.5">Path</label>
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs font-mono text-[#D8D8DC] focus:border-[#C98A3D] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[#77777D] mb-1.5">Summary</label>
              <input
                type="text"
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-[#29292D] text-xs text-[#D8D8DC] focus:border-[#C98A3D] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleRun}
          disabled={isLoading}
          className="w-full py-2.5 rounded-lg bg-[#C98A3D] hover:bg-[#DCA052] disabled:opacity-50 text-xs font-mono font-bold text-[#0B0B0D] transition-all shadow-md flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running What-If Simulation...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run Simulation (Non-Destructive)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
