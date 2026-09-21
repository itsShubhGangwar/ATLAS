import { Request, Response } from "express";
import { simulatorService } from "./simulator.service";
import { projectService } from "../project/project.service";
import { sendApiError, ApiError } from "../../utils/api-error";
import { CanonicalApiModel } from "../parser/canonical-model";

export const runSimulationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, versionId, change, canonicalModel } = req.body;

    if (!change || !change.type) {
      sendApiError(res, 400, "VALIDATION_ERROR", "A valid 'change' object with a 'type' property is required.");
      return;
    }

    let model: CanonicalApiModel | undefined = canonicalModel;
    let versionLabel = "Custom API Model";

    // If projectId and versionId are provided, retrieve persisted version with ownership check
    if (projectId && versionId) {
      if (!req.user) {
        sendApiError(res, 401, "UNAUTHORIZED", "Authentication required to simulate project versions.");
        return;
      }
      const userId = req.user._id.toString();
      const versionDetail = await projectService.getVersionById(projectId, versionId, userId);
      model = versionDetail.canonicalModel;
      versionLabel = `v${versionDetail.version} (${versionDetail.name || "API Version"})`;
    }

    if (!model) {
      sendApiError(res, 400, "VALIDATION_ERROR", "Must provide either (projectId and versionId) or a canonicalModel.");
      return;
    }

    const result = simulatorService.simulate(model, change, versionLabel);
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Simulation run failed: ${err.message}`);
  }
};
