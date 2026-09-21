import { Router } from "express";
import multer from "multer";
import { analyzeGovernanceController } from "../controllers/governance.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

router.post("/analyze", upload.single("file"), analyzeGovernanceController);

export default router;
