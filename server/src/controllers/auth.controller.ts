import { Request, Response } from "express";
import { authService } from "../services/auth";
import { sendApiError, ApiError } from "../utils/api-error";

export const registerController = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to register user: ${err.message}`);
  }
};

export const loginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to authenticate user: ${err.message}`);
  }
};

export const getCurrentUserController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendApiError(res, 401, "AUTH_REQUIRED", "User not authenticated.");
      return;
    }
    const user = await authService.getCurrentUser(req.user._id.toString());
    res.status(200).json({ user });
  } catch (err: any) {
    if (err instanceof ApiError) {
      sendApiError(res, err.statusCode, err.code, err.message, err.details);
      return;
    }
    sendApiError(res, 500, "INTERNAL_ERROR", `Failed to fetch current user profile: ${err.message}`);
  }
};
