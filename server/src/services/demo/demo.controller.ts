import { Request, Response } from "express";
import { DemoService } from "./demo.service";

export class DemoController {
  public static async getDemo(req: Request, res: Response): Promise<void> {
    try {
      const data = await DemoService.getWorkflowDemo();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to load Atlas Workflow demo data",
      });
    }
  }

  public static async getCommerceHubDemo(req: Request, res: Response): Promise<void> {
    return DemoController.getDemo(req, res);
  }
}
