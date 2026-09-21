import { Router } from "express";
import multer from "multer";
import { parseSpecification } from "../controllers/specs.controller";

const router = Router();

// Memory storage keeps uploaded files strictly in-memory (no disk pollution or executable files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

router.post("/parse", upload.single("file"), parseSpecification);

export default router;