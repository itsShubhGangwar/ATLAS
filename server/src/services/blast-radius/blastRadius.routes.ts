import { Router } from "express";
import { analyzeBlastRadiusController } from "./blastRadius.controller";
import { optionalAuth } from "../../middleware/auth.middleware";

const router = Router();

// POST /api/blast-radius/analyze
router.post("/analyze", optionalAuth, analyzeBlastRadiusController);

export default router;
