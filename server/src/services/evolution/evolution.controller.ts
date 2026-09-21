import { Request, Response } from "express";
import { EvolutionService } from "./evolution.service";
import { ApiError, sendApiError } from "../../utils/api-error";

export class EvolutionController {
  public static async getProjectEvolution(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user as any;
      const userId = user ? (user._id ? user._id.toString() : user.id) : null;
      if (!userId) {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
      }

      const projectId = Array.isArray(req.params.projectId)
        ? req.params.projectId[0]
        : req.params.projectId;

      const report = await EvolutionService.getProjectEvolution(
        projectId,
        userId
      );

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        sendApiError(res, err.statusCode, err.code, err.message, err.details);
      } else {
        sendApiError(
          res,
          500,
          "INTERNAL_ERROR",
          err.message || "Failed to generate project evolution report"
        );
      }
    }
  }
}
