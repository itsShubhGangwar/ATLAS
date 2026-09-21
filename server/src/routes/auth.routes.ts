import { Router } from "express";
import {
  registerController,
  loginController,
  getCurrentUserController,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.get("/me", requireAuth, getCurrentUserController);

export default router;
