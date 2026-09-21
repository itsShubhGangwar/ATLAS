export type DiagnosticLogLevel = "info" | "success" | "warn" | "error";
export type DiagnosticSource =
  | "System"
  | "Parser"
  | "Graph"
  | "Governance"
  | "Diff"
  | "Simulator"
  | "BlastRadius"
  | "Evolution"
  | "Demo";

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  level: DiagnosticLogLevel;
  source: DiagnosticSource;
  message: string;
  details?: unknown;
}

export interface WorkbenchDiagnosticsState {
  logs: DiagnosticLogEntry[];
  activeModelSummary: {
    title: string | null;
    version: string | null;
    endpointsCount: number;
    schemasCount: number;
    securityCount: number;
    governanceScore: number | null;
  };
}

class DiagnosticsManager {
  private logs: DiagnosticLogEntry[] = [];
  private listeners: Set<() => void> = new Set();
  private maxLogs = 200;

  private activeSummary = {
    title: null as string | null,
    version: null as string | null,
    endpointsCount: 0,
    schemasCount: 0,
    securityCount: 0,
    governanceScore: null as number | null,
  };

  constructor() {
    this.log("info", "System", "ATLAS Engineering Workbench v1.0.0 initialized");
  }

  public log(
    level: DiagnosticLogLevel,
    source: DiagnosticSource,
    message: string,
    details?: unknown
  ) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now
      .getMilliseconds()
      .toString()
      .padStart(3, "0")}`;

    const entry: DiagnosticLogEntry = {
      id: `diag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: timeStr,
      level,
      source,
      message,
      details,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    this.notify();
  }

  public updateModelStats(summary: {
    title?: string;
    version?: string;
    endpointsCount?: number;
    schemasCount?: number;
    securityCount?: number;
    governanceScore?: number | null;
  }) {
    if (summary.title !== undefined) this.activeSummary.title = summary.title;
    if (summary.version !== undefined) this.activeSummary.version = summary.version;
    if (summary.endpointsCount !== undefined)
      this.activeSummary.endpointsCount = summary.endpointsCount;
    if (summary.schemasCount !== undefined)
      this.activeSummary.schemasCount = summary.schemasCount;
    if (summary.securityCount !== undefined)
      this.activeSummary.securityCount = summary.securityCount;
    if (summary.governanceScore !== undefined)
      this.activeSummary.governanceScore = summary.governanceScore;
    this.notify();
  }

  public getLogs(): DiagnosticLogEntry[] {
    return this.logs;
  }

  public getSummary() {
    return this.activeSummary;
  }

  public clear() {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const diagnostics = new DiagnosticsManager();
