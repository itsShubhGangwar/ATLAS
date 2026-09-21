import { Router } from "express";
import multer from "multer";
import { generateTypescriptSdkController } from "../controllers/sdk.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

router.post("/typescript", upload.single("file"), generateTypescriptSdkController);

export default router;
