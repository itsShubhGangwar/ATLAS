import { Router } from "express";
import { EvolutionController } from "./evolution.controller";
import { requireAuth } from "../../middleware/auth.middleware";

const router = Router();

// GET /api/projects/:projectId/evolution
router.get("/:projectId/evolution", requireAuth, EvolutionController.getProjectEvolution);

export default router;
