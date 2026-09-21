import { Router } from "express";
import { DemoController } from "./demo.controller";

const router = Router();

// Public, read-only demo endpoint
router.get("/workflow", DemoController.getDemo);
router.get("/commercehub", DemoController.getCommerceHubDemo);

export default router;
