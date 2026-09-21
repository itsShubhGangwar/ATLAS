import { Request, Response } from "express";
import { blastRadiusService } from "./blastRadius.service";
import { projectService } from "../project/project.service";
import { sendApiError, ApiError } from "../../utils/api-error";
import { CanonicalApiModel } from "../parser/canonical-model";

export const analyzeBlastRadiusController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, versionId, target, canonicalModel } = req.body;

    if (!target || !target.type || !target.id) {
      sendApiError(res, 400, "VALIDATION_ERROR", "Target component with 'type' and 'id' is required.");
      return;
    }

    let model: CanonicalApiModel | undefined = canonicalModel;

    // If projectId and versionId are provided, retrieve persisted version with ownership check
    if (projectId && versionId) {
      if (!req.user) {
        sendApiError(res, 401, "UNAUTHORIZED", "Authentication required to inspect project versions.");
        return;
      }
      const userId = req.user._id.toString();
      const versionDetail = await projectService.getVersionById(projectId, versionId, userId);
      model = versionDetail.canonicalModel;
    }

    if (!model) {
      sendApiError(res, 400, "VALIDATION_ERROR", "Must provide either (projectId and versionId) or a canonicalModel.");
      return;
    }

    const result = blastRadiusService.analyze(model, target);
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Blast radius analysis failed: ${err.message}`);
  }
};
