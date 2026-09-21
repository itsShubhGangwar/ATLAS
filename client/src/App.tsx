import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectPage } from "./pages/ProjectPage";
import { ApiVersionPage } from "./pages/ApiVersionPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ExplorerPage } from "./pages/ExplorerPage";
import { GraphPage } from "./pages/GraphPage";
import { GovernancePage } from "./pages/GovernancePage";
import { DiffPage } from "./pages/DiffPage";
import { SdkPage } from "./pages/SdkPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SimulatorPage } from "./pages/SimulatorPage";
import { EvolutionPage } from "./pages/EvolutionPage";
import { NavSection, HealthStatus, CanonicalApiModel, User, DemoDataResponse } from "./types";
import {
  checkBackendHealth,
  getCurrentUserApi,
  getAuthToken,
  clearAuthToken,
  getDemoWorkflowApi,
} from "./services/api";
import { diagnostics } from "./services/diagnostics";
import { DiagnosticsPanel } from "./components/diagnostics/DiagnosticsPanel";
import { Loader2 } from "lucide-react";

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);

  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoData, setDemoData] = useState<DemoDataResponse | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);

  const [activeSection, setActiveSection] = useState<NavSection>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const [health, setHealth] = useState<HealthStatus>({ status: "loading" });
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);

  // Shared intelligence state
  const [sharedCanonicalModel, setSharedCanonicalModel] = useState<CanonicalApiModel | null>(null);
  const [diffBaseModel, setDiffBaseModel] = useState<CanonicalApiModel | null>(null);
  const [diffNewModel, setDiffNewModel] = useState<CanonicalApiModel | null>(null);

  // Enter unauthenticated Demo Mode with Atlas Workflow API v1.0.0
  const enterDemoMode = useCallback(async () => {
    setIsDemoMode(true);
    setIsLoadingDemo(true);
    setActiveSection("graph");
    if (window.location.pathname !== "/demo") {
      window.history.pushState({}, "", "/demo");
    }

    diagnostics.log("info", "System", "Mounting unauthenticated Demo Mode (Atlas Workflow API OAS 3.0.3 v1.0.0)");

    try {
      const res = await getDemoWorkflowApi();
      if (res.success && res.data) {
        setDemoData(res.data);
        setSharedCanonicalModel(res.data.canonicalModel);
        setDiffBaseModel(res.data.baseV1Model || null);
        setDiffNewModel(res.data.canonicalModel);
        setSelectedProjectId("demo-atlas-workflow");
        setSelectedVersionId("demo-v1.0.0");

        diagnostics.log(
          "success",
          "System",
          `Demo environment ready: ${res.data.project.name} (${res.data.version.version})`,
          {
            endpoints: res.data.canonicalModel.endpoints.length,
            schemas: res.data.canonicalModel.schemas.length,
            securitySchemes: res.data.canonicalModel.securitySchemes.length,
            governanceScore: res.data.governance.score,
          }
        );
        diagnostics.log(
          "info",
          "Parser",
          "Atlas Workflow API specification parsed to CanonicalApiModel",
          {
            title: res.data.canonicalModel.metadata.title,
            version: res.data.canonicalModel.metadata.version,
            specType: res.data.canonicalModel.metadata.specType,
          }
        );
        diagnostics.log(
          "info",
          "Graph",
          `Generated knowledge graph with ${res.data.graph.stats.nodes} nodes and ${res.data.graph.stats.edges} edges`
        );
        diagnostics.log(
          res.data.governance.score >= 70 ? "success" : "warn",
          "Governance",
          `Automated audit complete: Score ${res.data.governance.score}/100 with ${res.data.governance.findings.length} findings`
        );
      } else {
        diagnostics.log("error", "System", `Failed to load demo data: ${res.error}`);
      }
    } catch (err: any) {
      diagnostics.log("error", "System", `Demo loading exception: ${err.message}`);
    } finally {
      setIsLoadingDemo(false);
    }
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setDemoData(null);
    setSharedCanonicalModel(null);
    setDiffBaseModel(null);
    setDiffNewModel(null);
    setSelectedProjectId(null);
    setSelectedVersionId(null);
    if (window.location.pathname === "/demo") {
      window.history.pushState({}, "", "/");
    }
    setActiveSection("dashboard");
    diagnostics.log("info", "System", "Exited Demo Mode workspace");
  }, []);

  // Check URL on startup: direct /demo route
  useEffect(() => {
    const isDemoPath = window.location.pathname === "/demo" || window.location.hash.includes("demo");
    if (isDemoPath) {
      enterDemoMode();
    }
  }, [enterDemoMode]);

  // Handle browser navigation
  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname === "/demo") {
        if (!isDemoMode) enterDemoMode();
      } else {
        if (isDemoMode) exitDemoMode();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isDemoMode, enterDemoMode, exitDemoMode]);

  // Check auth token on startup
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsAuthInitializing(false);
        return;
      }

      try {
        const res = await getCurrentUserApi();
        if (res.success && res.data?.user) {
          setCurrentUser(res.data.user);
        } else {
          clearAuthToken();
          setCurrentUser(null);
        }
      } catch {
        clearAuthToken();
        setCurrentUser(null);
      } finally {
        setIsAuthInitializing(false);
      }
    };

    initAuth();
  }, []);

  const fetchHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    const result = await checkBackendHealth();
    setHealth(result);
    setIsCheckingHealth(false);
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setSelectedProjectId(null);
    setSelectedVersionId(null);
    setSharedCanonicalModel(null);
    setDiffBaseModel(null);
    setDiffNewModel(null);
    setAuthMode("login");
    setActiveSection("dashboard");
  };

  const getSectionMeta = (section: NavSection) => {
    switch (section) {
      case "dashboard":
        return {
          title: "Workbench Dashboard",
          subtitle: "Workspace metrics, projects portfolio, and recent activity",
        };
      case "projects":
      case "project_detail":
        return {
          title: "Projects & Versioning",
          subtitle: "Manage OpenAPI versions, specifications, and pipeline history",
        };
      case "version_detail":
        return {
          title: "API Version Inspection",
          subtitle: "Detailed specification metadata, endpoints, and analysis triggers",
        };
      case "overview":
        return {
          title: "Architecture Overview & Status",
          subtitle: "Workbench pipeline topology and subsystem health",
        };
      case "explorer":
        return {
          title: "API Explorer",
          subtitle: "Interactive endpoint and schema navigation with project saving",
        };
      case "graph":
        return {
          title: "Knowledge Graph",
          subtitle: "Visual API topological relationships and dependency graph",
        };
      case "governance":
        return {
          title: "Security & Governance",
          subtitle: "Deterministic rule validation and policy enforcement",
        };
      case "diff":
        return {
          title: "API Diff Engine",
          subtitle: "Specification version comparison and breaking change detection",
        };
      case "sdk":
        return {
          title: "SDK Generator",
          subtitle: "Canonical API model client library synthesis",
        };
      case "simulator":
        return {
          title: "What-If API Simulator & Blast Radius",
          subtitle: "Deterministic non-destructive change impact analysis and dependency modeling",
        };
      case "evolution":
        return {
          title: "API Evolution & Decision Timeline",
          subtitle: "Historical version mutations, contract drift, and governance trajectory",
        };
      case "settings":
        return {
          title: "Workbench Settings",
          subtitle: "Environment and service configurations",
        };
      default:
        return {
          title: "ATLAS Workbench",
          subtitle: "API Engineering Platform",
        };
    }
  };

  const meta = getSectionMeta(activeSection);

  // If initial auth check is in progress, show spinner
  if (isAuthInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0B0B0D] text-[#D8D8DC]">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#C98A3D] animate-spin" />
          <p className="text-xs font-mono text-[#77777D]">Initializing ATLAS Workbench...</p>
        </div>
      </div>
    );
  }

  // If not logged in and not in demo mode, show Auth screens
  if (!currentUser && !isDemoMode) {
    if (authMode === "register") {
      return (
        <RegisterPage
          onSuccess={(user: User) => {
            setCurrentUser(user);
            setActiveSection("dashboard");
          }}
          onNavigateLogin={() => setAuthMode("login")}
          onEnterDemo={enterDemoMode}
        />
      );
    }
    return (
      <LoginPage
        onSuccess={(user: User) => {
          setCurrentUser(user);
          setActiveSection("dashboard");
        }}
        onNavigateRegister={() => setAuthMode("register")}
        onEnterDemo={enterDemoMode}
      />
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <DashboardPage
            onSelectProject={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveSection("project_detail");
            }}
            onNavigateExplorer={() => setActiveSection("explorer")}
          />
        );

      case "projects":
      case "project_detail":
        if (selectedProjectId || isDemoMode) {
          return (
            <ProjectPage
              projectId={selectedProjectId || "demo-atlas-workflow"}
              demoProject={isDemoMode ? demoData?.project : null}
              demoVersions={isDemoMode && demoData ? [demoData.version] : null}
              isReadOnly={isDemoMode}
              onBack={() => {
                if (isDemoMode) {
                  setActiveSection("graph");
                } else {
                  setSelectedProjectId(null);
                  setActiveSection("dashboard");
                }
              }}
              onOpenVersion={(versionId) => {
                setSelectedVersionId(versionId);
                setActiveSection("version_detail");
              }}
              onOpenGraph={(model) => {
                setSharedCanonicalModel(model);
                setActiveSection("graph");
              }}
              onOpenGovernance={(model) => {
                setSharedCanonicalModel(model);
                setActiveSection("governance");
              }}
              onOpenDiff={(baseModel, newModel) => {
                setDiffBaseModel(baseModel);
                setDiffNewModel(newModel);
                setActiveSection("diff");
              }}
              onOpenSdk={(model) => {
                setSharedCanonicalModel(model);
                setActiveSection("sdk");
              }}
              onOpenSimulator={(model) => {
                setSharedCanonicalModel(model);
                setActiveSection("simulator");
              }}
              onOpenEvolution={(projId: string) => {
                setSelectedProjectId(projId);
                setActiveSection("evolution");
              }}
            />
          );
        }
        return (
          <DashboardPage
            onSelectProject={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveSection("project_detail");
            }}
            onNavigateExplorer={() => setActiveSection("explorer")}
          />
        );

      case "version_detail":
        if ((selectedProjectId && selectedVersionId) || isDemoMode) {
          return (
            <ApiVersionPage
              projectId={selectedProjectId || "demo-atlas-workflow"}
              versionId={selectedVersionId || "demo-v1.0.0"}
              demoVersion={isDemoMode ? demoData?.version : null}
              onBack={() => setActiveSection(isDemoMode ? "graph" : "project_detail")}
              onOpenGraph={(model) => {
                setSharedCanonicalModel(model);
                setActiveSection("graph");
              }}
              onOpenGovernance={(model) => {
                setSharedCanonicalModel(model);
                setActiveSection("governance");
              }}
              onOpenSdk={(model) => {
                setSharedCanonicalModel(model);
                setActiveSection("sdk");
              }}
              onOpenDiff={(baseModel) => {
                setDiffBaseModel(baseModel);
                setActiveSection("diff");
              }}
              onOpenSimulator={(model) => {
                setSharedCanonicalModel(model);
                setActiveSection("simulator");
              }}
            />
          );
        }
        return (
          <DashboardPage
            onSelectProject={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveSection("project_detail");
            }}
            onNavigateExplorer={() => setActiveSection("explorer")}
          />
        );

      case "explorer":
        return (
          <ExplorerPage
            sharedModel={sharedCanonicalModel}
            onModelLoaded={(m) => setSharedCanonicalModel(m)}
            onViewGraph={(m) => {
              setSharedCanonicalModel(m);
              setActiveSection("graph");
            }}
          />
        );

      case "graph":
        return (
          <GraphPage
            initialModel={sharedCanonicalModel}
            onNavigateToExplorer={() => setActiveSection("explorer")}
            onOpenExplorer={(_endpointId) => {
              setActiveSection("explorer");
            }}
            onSimulateChange={(_endpointId) => {
              setActiveSection("simulator");
            }}
          />
        );

      case "governance":
        return (
          <GovernancePage
            sharedModel={sharedCanonicalModel}
            onModelLoaded={(m) => setSharedCanonicalModel(m)}
          />
        );

      case "diff":
        return (
          <DiffPage
            sharedModel={sharedCanonicalModel}
            initialBaseModel={diffBaseModel}
            initialNewModel={diffNewModel}
          />
        );

      case "sdk":
        return <SdkPage sharedModel={sharedCanonicalModel} />;

      case "simulator":
        return (
          <SimulatorPage
            sharedModel={sharedCanonicalModel}
            onModelLoaded={(m) => setSharedCanonicalModel(m)}
            onNavigateToGraph={(m) => {
              setSharedCanonicalModel(m);
              setActiveSection("graph");
            }}
            selectedProjectId={selectedProjectId || undefined}
            selectedVersionId={selectedVersionId || undefined}
          />
        );

      case "evolution":
        return (
          <EvolutionPage
            projectId={selectedProjectId}
            initialReport={isDemoMode ? demoData?.evolution : undefined}
            onBack={() => {
              if (selectedProjectId && !isDemoMode) {
                setActiveSection("project_detail");
              } else {
                setActiveSection("graph");
              }
            }}
            onOpenVersion={(versionId) => {
              setSelectedVersionId(versionId);
              setActiveSection("version_detail");
            }}
            onOpenSimulator={(model) => {
              setSharedCanonicalModel(model);
              setActiveSection("simulator");
            }}
            onOpenDiff={(baseModel, newModel) => {
              setDiffBaseModel(baseModel);
              setDiffNewModel(newModel);
              setActiveSection("diff");
            }}
          />
        );

      case "overview":
        return <OverviewPage health={health} />;

      case "settings":
        return <SettingsPage />;

      default:
        return (
          <DashboardPage
            onSelectProject={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveSection("project_detail");
            }}
            onNavigateExplorer={() => setActiveSection("explorer")}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#0B0B0D] text-[#D8D8DC] overflow-hidden font-mono text-xs">
      {/* Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(section) => {
          if (section === "projects" && !selectedProjectId && !isDemoMode) {
            setActiveSection("dashboard");
          } else {
            setActiveSection(section);
          }
        }}
        user={currentUser}
        onLogout={handleLogout}
        isDemoMode={isDemoMode}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0B0B0D]">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          health={health}
          onRefreshHealth={fetchHealth}
          isCheckingHealth={isCheckingHealth}
          user={currentUser}
          onLogout={handleLogout}
          isDemoMode={isDemoMode}
          onExitDemo={exitDemoMode}
          projectName={isDemoMode ? (demoData?.project?.name || "Atlas Workflow API") : selectedProjectId}
          versionName={isDemoMode ? (demoData?.version?.version ? `v${demoData.version.version}` : "v1.0.0") : selectedVersionId}
          activeSection={activeSection}
        />

        <main className={`flex-1 overflow-y-auto ${activeSection === "graph" ? "p-0 overflow-hidden" : "p-6"}`}>
          {isLoadingDemo ? (
            <div className="flex h-full w-full items-center justify-center space-x-2 text-[#77777D] font-mono text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-[#C98A3D]" />
              <span>Loading Atlas Workflow demo dataset...</span>
            </div>
          ) : (
            renderContent()
          )}
        </main>

        <DiagnosticsPanel />
      </div>
    </div>
  );
};

export default App;