import { Router } from "express";
import { runSimulationController } from "./simulator.controller";
import { optionalAuth } from "../../middleware/auth.middleware";

const router = Router();

// POST /api/simulator/run
router.post("/run", optionalAuth, runSimulationController);

export default router;
