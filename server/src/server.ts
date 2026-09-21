import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import healthRoutes from "./routes/health.routes";
import specsRoutes from "./routes/specs.routes";
import graphRoutes from "./routes/graph.routes";
import governanceRoutes from "./routes/governance.routes";
import diffRoutes from "./routes/diff.routes";
import sdkRoutes from "./routes/sdk.routes";
import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import simulatorRoutes from "./services/simulator/simulator.routes";
import blastRadiusRoutes from "./services/blast-radius/blastRadius.routes";
import demoRoutes from "./services/demo/demo.routes";

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/specs", specsRoutes);
app.use("/api/graph", graphRoutes);
app.use("/api/governance", governanceRoutes);
app.use("/api/diff", diffRoutes);
app.use("/api/sdk", sdkRoutes);
app.use("/api/simulator", simulatorRoutes);
app.use("/api/blast-radius", blastRadiusRoutes);
app.use("/api/demo", demoRoutes);

// Start server
const startServer = async (): Promise<void> => {
  // Listen immediately so the server is ready to accept requests
  app.listen(PORT, () => {
    console.log(`[Server] ATLAS backend running at http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Auth: POST http://localhost:${PORT}/api/auth/login`);
    console.log(`[Server] Projects: GET/POST http://localhost:${PORT}/api/projects`);
    console.log(`[Server] Spec Parser: POST http://localhost:${PORT}/api/specs/parse`);
    console.log(`[Server] Graph Builder: POST http://localhost:${PORT}/api/graph/build`);
    console.log(`[Server] Governance Analyzer: POST http://localhost:${PORT}/api/governance/analyze`);
    console.log(`[Server] API Diff Engine: POST http://localhost:${PORT}/api/diff/compare`);
    console.log(`[Server] TypeScript SDK Generator: POST http://localhost:${PORT}/api/sdk/typescript`);
  });

  // Attempt MongoDB connection in background (non-blocking fallback)
  connectDB().catch((err) => {
    console.warn(`[Database] Unhandled connection exception: ${err.message}`);
  });
};

if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT) {
  startServer();
}

export default app;