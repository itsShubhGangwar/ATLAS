import { Router } from "express";
import multer from "multer";
import { buildGraphController } from "../controllers/graph.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

router.post("/build", upload.single("file"), buildGraphController);

export default router;