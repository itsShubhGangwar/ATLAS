import { Router } from "express";
import multer from "multer";
import { compareDiffController } from "../controllers/diff.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

router.post(
  "/compare",
  upload.fields([
    { name: "baseFile", maxCount: 1 },
    { name: "newFile", maxCount: 1 },
  ]),
  compareDiffController
);

export default router;
