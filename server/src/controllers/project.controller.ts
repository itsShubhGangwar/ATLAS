import { Request, Response } from "express";
import { projectService } from "../services/project";
import { sendApiError, ApiError } from "../utils/api-error";

export const createProjectController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const project = await projectService.createProject(req.body, userId);
    res.status(201).json(project);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to create project: ${err.message}`);
  }
};

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

export const listProjectsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const projects = await projectService.listProjects(userId);
    res.status(200).json(projects);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to list projects: ${err.message}`);
  }
};

export const getProjectByIdController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const project = await projectService.getProjectById(getParam(req.params.id), userId);
    res.status(200).json(project);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to get project: ${err.message}`);
  }
};

export const updateProjectController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const project = await projectService.updateProject(getParam(req.params.id), req.body, userId);
    res.status(200).json(project);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to update project: ${err.message}`);
  }
};

export const deleteProjectController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    await projectService.deleteProject(getParam(req.params.id), userId);
    res.status(200).json({ success: true, message: "Project deleted successfully." });
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to delete project: ${err.message}`);
  }
};

export const createVersionController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const projectId = getParam(req.params.projectId);

    let specContent: string | undefined;
    if (req.file && req.file.buffer) {
      specContent = req.file.buffer.toString("utf-8");
    } else if (req.body?.spec) {
      specContent = req.body.spec;
    } else if (req.body?.content) {
      specContent = req.body.content;
    } else if (typeof req.body === "string") {
      specContent = req.body;
    }

    if (!specContent) {
      sendApiError(res, 400, "INVALID_SPEC", "Specification content is required.");
      return;
    }

    const customName = req.body?.name || (req.file ? req.file.originalname : undefined);
    const version = await projectService.createVersion(projectId, specContent, customName, userId);

    res.status(201).json(version);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to upload API version: ${err.message}`);
  }
};

export const listVersionsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const versions = await projectService.listVersions(getParam(req.params.projectId), userId);
    res.status(200).json(versions);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to list versions: ${err.message}`);
  }
};

export const getVersionByIdController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const version = await projectService.getVersionById(
      getParam(req.params.projectId),
      getParam(req.params.versionId),
      userId
    );
    res.status(200).json(version);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to get API version: ${err.message}`);
  }
};

export const deleteVersionController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    await projectService.deleteVersion(
      getParam(req.params.projectId),
      getParam(req.params.versionId),
      userId
    );
    res.status(200).json({ success: true, message: "API version deleted successfully." });
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to delete API version: ${err.message}`);
  }
};

export const runGovernanceController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const report = await projectService.runAndSaveGovernance(
      getParam(req.params.projectId),
      getParam(req.params.versionId),
      userId
    );
    res.status(200).json(report);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to run governance analysis: ${err.message}`);
  }
};

export const getGovernanceController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const report = await projectService.getLatestGovernance(
      getParam(req.params.projectId),
      getParam(req.params.versionId),
      userId
    );
    res.status(200).json({ report });
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to get governance report: ${err.message}`);
  }
};

export const runDiffController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const { baseVersionId, newVersionId } = req.body;

    if (!baseVersionId || !newVersionId) {
      sendApiError(res, 400, "VALIDATION_ERROR", "Both baseVersionId and newVersionId are required.");
      return;
    }

    const report = await projectService.compareAndSaveDiff(
      getParam(req.params.projectId),
      baseVersionId,
      newVersionId,
      userId
    );

    res.status(200).json(report);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to run diff comparison: ${err.message}`);
  }
};

export const listDiffReportsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const reports = await projectService.listDiffReports(getParam(req.params.projectId), userId);
    res.status(200).json(reports);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to list diff reports: ${err.message}`);
  }
};

export const getDashboardMetricsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const metrics = await projectService.getDashboardMetrics(userId);
    res.status(200).json(metrics);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to get dashboard metrics: ${err.message}`);
  }
};
