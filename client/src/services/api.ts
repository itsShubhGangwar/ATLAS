import {
  HealthStatus,
  ParseApiResponse,
  GraphApiResponse,
  CanonicalApiModel,
  GovernanceApiResponse,
  DiffApiResponse,
  SdkApiResponse,
  User,
  AuthResponse,
  Project,
  ApiVersionSummary,
  ApiVersionDetail,
  DashboardMetrics,
  WhatIfChange,
  SimulationApiResponse,
  BlastRadiusTarget,
  BlastRadiusApiResponse,
  ProjectEvolutionReport,
  DemoDataResponse,
} from "../types";

// Token storage key
const AUTH_TOKEN_KEY = "atlas_auth_token";

export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const checkBackendHealth = async (): Promise<HealthStatus> => {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return {
      status: data.status === "ok" ? "ok" : "error",
      service: data.service,
      timestamp: new Date().toLocaleTimeString(),
    };
  } catch (err: any) {
    return {
      status: "error",
      error: err.message || "Unable to reach ATLAS backend",
      timestamp: new Date().toLocaleTimeString(),
    };
  }
};

export const parseSpecificationApi = async (
  input: File | string
): Promise<ParseApiResponse> => {
  try {
    let response: Response;

    if (input instanceof File) {
      const formData = new FormData();
      formData.append("file", input);
      response = await fetch("/api/specs/parse", {
        method: "POST",
        body: formData,
      });
    } else {
      response = await fetch("/api/specs/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spec: input }),
      });
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Server responded with status ${response.status}`,
        details: data.details,
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error while uploading specification.",
    };
  }
};

export const buildGraphApi = async (
  input: File | string | CanonicalApiModel
): Promise<GraphApiResponse> => {
  try {
    let response: Response;

    if (input instanceof File) {
      const formData = new FormData();
      formData.append("file", input);
      response = await fetch("/api/graph/build", {
        method: "POST",
        body: formData,
      });
    } else if (typeof input === "string") {
      response = await fetch("/api/graph/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spec: input }),
      });
    } else {
      response = await fetch("/api/graph/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ canonicalModel: input }),
      });
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Server responded with status ${response.status}`,
        details: data.details,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error while building API graph.",
    };
  }
};

export const analyzeGovernanceApi = async (
  input: File | string | CanonicalApiModel
): Promise<GovernanceApiResponse> => {
  try {
    let response: Response;

    if (input instanceof File) {
      const formData = new FormData();
      formData.append("file", input);
      response = await fetch("/api/governance/analyze", {
        method: "POST",
        body: formData,
      });
    } else if (typeof input === "string") {
      response = await fetch("/api/governance/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec: input }),
      });
    } else {
      response = await fetch("/api/governance/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicalModel: input }),
      });
    }

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Server responded with status ${response.status}`,
        details: data.details,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error while analyzing governance rules.",
    };
  }
};

export const compareApiSpecsApi = async (
  baseInput: File | string | CanonicalApiModel,
  newInput: File | string | CanonicalApiModel
): Promise<DiffApiResponse> => {
  try {
    let response: Response;

    // Check if either is a File
    if (baseInput instanceof File || newInput instanceof File) {
      const formData = new FormData();
      if (baseInput instanceof File) {
        formData.append("baseFile", baseInput);
      } else if (typeof baseInput === "string") {
        formData.append("baseSpec", baseInput);
      } else {
        formData.append("baseCanonical", JSON.stringify(baseInput));
      }

      if (newInput instanceof File) {
        formData.append("newFile", newInput);
      } else if (typeof newInput === "string") {
        formData.append("newSpec", newInput);
      } else {
        formData.append("newCanonical", JSON.stringify(newInput));
      }

      response = await fetch("/api/diff/compare", {
        method: "POST",
        body: formData,
      });
    } else {
      const payload: Record<string, unknown> = {};
      if (typeof baseInput === "string") {
        payload.baseSpec = baseInput;
      } else {
        payload.baseModel = baseInput;
      }

      if (typeof newInput === "string") {
        payload.newSpec = newInput;
      } else {
        payload.newModel = newInput;
      }

      response = await fetch("/api/diff/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Server responded with status ${response.status}`,
        details: data.details,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error while comparing API specifications.",
    };
  }
};

export const generateTypescriptSdkApi = async (
  input: File | string | CanonicalApiModel,
  options?: { clientName?: string; baseUrl?: string }
): Promise<SdkApiResponse> => {
  try {
    let response: Response;

    if (input instanceof File) {
      const formData = new FormData();
      formData.append("file", input);
      if (options?.clientName) formData.append("clientName", options.clientName);
      if (options?.baseUrl) formData.append("baseUrl", options.baseUrl);

      response = await fetch("/api/sdk/typescript", {
        method: "POST",
        body: formData,
      });
    } else if (typeof input === "string") {
      response = await fetch("/api/sdk/typescript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec: input, options }),
      });
    } else {
      response = await fetch("/api/sdk/typescript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicalModel: input, options }),
      });
    }

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Server responded with status ${response.status}`,
        details: data.details,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error while generating SDK.",
    };
  }
};

// =============================================================================
// Phase 5: Authentication APIs
// =============================================================================

export const registerApi = async (data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Registration failed" };
    }
    if (json.token) setAuthToken(json.token);
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error during registration" };
  }
};

export const loginApi = async (data: {
  email: string;
  password: string;
}): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Invalid credentials" };
    }
    if (json.token) setAuthToken(json.token);
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error during login" };
  }
};

export const getCurrentUserApi = async (): Promise<{
  success: boolean;
  data?: { user: User };
  error?: string;
}> => {
  try {
    const res = await fetch("/api/auth/me", {
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to fetch user" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error checking session" };
  }
};

// =============================================================================
// Phase 5: Project APIs
// =============================================================================

export const listProjectsApi = async (): Promise<{
  success: boolean;
  data?: Project[];
  error?: string;
}> => {
  try {
    const res = await fetch("/api/projects", {
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to list projects" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error loading projects" };
  }
};

export const createProjectApi = async (data: {
  name: string;
  description?: string;
}): Promise<{ success: boolean; data?: Project; error?: string }> => {
  try {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to create project" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error creating project" };
  }
};

export const getProjectByIdApi = async (
  projectId: string
): Promise<{ success: boolean; data?: Project; error?: string }> => {
  try {
    const res = await fetch(`/api/projects/${projectId}`, {
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Project not found" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error loading project" };
  }
};

export const updateProjectApi = async (
  projectId: string,
  data: { name?: string; description?: string }
): Promise<{ success: boolean; data?: Project; error?: string }> => {
  try {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to update project" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error updating project" };
  }
};

export const deleteProjectApi = async (
  projectId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to delete project" };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error deleting project" };
  }
};

export const getDashboardMetricsApi = async (): Promise<{
  success: boolean;
  data?: DashboardMetrics;
  error?: string;
}> => {
  try {
    const res = await fetch("/api/projects/dashboard/metrics", {
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to fetch metrics" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error loading dashboard metrics" };
  }
};

// =============================================================================
// Phase 5: API Version Management
// =============================================================================

export const listVersionsApi = async (
  projectId: string
): Promise<{ success: boolean; data?: ApiVersionSummary[]; error?: string }> => {
  try {
    const res = await fetch(`/api/projects/${projectId}/versions`, {
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to list versions" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error loading versions" };
  }
};

export const getVersionByIdApi = async (
  projectId: string,
  versionId: string
): Promise<{ success: boolean; data?: ApiVersionDetail; error?: string }> => {
  try {
    const res = await fetch(`/api/projects/${projectId}/versions/${versionId}`, {
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Version not found" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error loading version details" };
  }
};

export const createVersionApi = async (
  projectId: string,
  input: File | string,
  name?: string
): Promise<{ success: boolean; data?: ApiVersionDetail; error?: string }> => {
  try {
    let res: Response;
    if (input instanceof File) {
      const formData = new FormData();
      formData.append("file", input);
      if (name) formData.append("name", name);
      res = await fetch(`/api/projects/${projectId}/versions`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
        body: formData,
      });
    } else {
      res = await fetch(`/api/projects/${projectId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ spec: input, name }),
      });
    }
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to upload API version" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error uploading version" };
  }
};

export const deleteVersionApi = async (
  projectId: string,
  versionId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(`/api/projects/${projectId}/versions/${versionId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to delete version" };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error deleting version" };
  }
};

// =============================================================================
// Phase 5: Saved Analysis (Governance & Diff)
// =============================================================================

export const runAndSaveGovernanceApi = async (
  projectId: string,
  versionId: string
): Promise<GovernanceApiResponse> => {
  try {
    const res = await fetch(`/api/projects/${projectId}/versions/${versionId}/governance`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to run governance analysis" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error running governance audit" };
  }
};

export const getLatestGovernanceApi = async (
  projectId: string,
  versionId: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const res = await fetch(`/api/projects/${projectId}/versions/${versionId}/governance`, {
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to fetch governance report" };
    }
    return { success: true, data: json.report };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error fetching governance report" };
  }
};

export const compareAndSaveDiffApi = async (
  projectId: string,
  baseVersionId: string,
  newVersionId: string
): Promise<DiffApiResponse> => {
  try {
    const res = await fetch(`/api/projects/${projectId}/diff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ baseVersionId, newVersionId }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to run diff comparison" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error comparing versions" };
  }
};

export const listDiffReportsApi = async (
  projectId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> => {
  try {
    const res = await fetch(`/api/projects/${projectId}/diff`, {
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || "Failed to list diff reports" };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error listing diff reports" };
  }
};

// Re-export parseSpecificationApi as parseOpenApiSpec for semantic consistency
export const parseOpenApiSpec = parseSpecificationApi;

// =============================================================================
// Phase 6: What-If Simulator & Blast-Radius APIs
// =============================================================================

export const runSimulationApi = async (data: {
  projectId?: string;
  versionId?: string;
  change: WhatIfChange;
  canonicalModel?: CanonicalApiModel;
  model?: CanonicalApiModel;
}): Promise<SimulationApiResponse> => {
  try {
    const payload = {
      projectId: data.projectId,
      versionId: data.versionId,
      change: data.change,
      canonicalModel: data.canonicalModel || data.model,
    };
    const res = await fetch("/api/simulator/run", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json.error?.message || json.message || "Simulation execution failed.",
        details: json.error?.details,
      };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error executing what-if simulation.",
    };
  }
};

export const analyzeBlastRadiusApi = async (data: {
  projectId?: string;
  versionId?: string;
  target: BlastRadiusTarget;
  canonicalModel?: CanonicalApiModel;
  model?: CanonicalApiModel;
}): Promise<BlastRadiusApiResponse> => {
  try {
    const payload = {
      projectId: data.projectId,
      versionId: data.versionId,
      target: data.target,
      canonicalModel: data.canonicalModel || data.model,
    };
    const res = await fetch("/api/blast-radius/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json.error?.message || json.message || "Blast radius analysis failed.",
        details: json.error?.details,
      };
    }
    return { success: true, data: json };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error running blast radius analysis.",
    };
  }
};

export const getProjectEvolutionApi = async (
  projectId: string
): Promise<{ success: boolean; data?: ProjectEvolutionReport; error?: string }> => {
  try {
    const res = await fetch(`/api/projects/${projectId}/evolution`, {
      method: "GET",
      headers: { ...getAuthHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json.error?.message || json.message || "Failed to fetch project evolution timeline.",
      };
    }
    return {
      success: true,
      data: json.data || json,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error fetching project evolution.",
    };
  }
};

export const getDemoWorkflowApi = async (): Promise<{
  success: boolean;
  data?: DemoDataResponse;
  error?: string;
}> => {
  try {
    const res = await fetch("/api/demo/workflow", {
      method: "GET",
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json.error?.message || json.message || "Failed to load Atlas Workflow demo dataset.",
      };
    }
    return {
      success: true,
      data: json.data || json,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error loading demo dataset.",
    };
  }
};

export const getDemoCommerceHubApi = getDemoWorkflowApi;