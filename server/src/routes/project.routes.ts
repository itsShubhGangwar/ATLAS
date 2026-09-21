import { Router } from "express";
import multer from "multer";
import {
  createProjectController,
  listProjectsController,
  getProjectByIdController,
  updateProjectController,
  deleteProjectController,
  createVersionController,
  listVersionsController,
  getVersionByIdController,
  deleteVersionController,
  runGovernanceController,
  getGovernanceController,
  runDiffController,
  listDiffReportsController,
  getDashboardMetricsController,
} from "../controllers/project.controller";
import { EvolutionController } from "../services/evolution/evolution.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

// All project and version routes are protected by JWT authentication
router.use(requireAuth);

// Dashboard metrics
router.get("/dashboard/metrics", getDashboardMetricsController);

// Project CRUD
router.post("/", createProjectController);
router.get("/", listProjectsController);
router.get("/:id", getProjectByIdController);
router.patch("/:id", updateProjectController);
router.delete("/:id", deleteProjectController);

// API Version Management
router.post("/:projectId/versions", upload.single("file"), createVersionController);
router.get("/:projectId/versions", listVersionsController);
router.get("/:projectId/versions/:versionId", getVersionByIdController);
router.delete("/:projectId/versions/:versionId", deleteVersionController);

// Saved Analysis: Governance
router.post("/:projectId/versions/:versionId/governance", runGovernanceController);
router.get("/:projectId/versions/:versionId/governance", getGovernanceController);

// Saved Analysis: Diff
router.post("/:projectId/diff", runDiffController);
router.get("/:projectId/diff", listDiffReportsController);

// API Evolution & Decision Timeline
router.get("/:projectId/evolution", EvolutionController.getProjectEvolution);

export default router;
