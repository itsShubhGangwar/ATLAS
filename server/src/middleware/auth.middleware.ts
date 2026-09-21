import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth";
import { User } from "../models/User";
import { sendApiError } from "../utils/api-error";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      sendApiError(res, 401, "AUTH_REQUIRED", "Authentication token is required.");
      return;
    }

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
      sendApiError(res, 401, "AUTH_REQUIRED", "Malformed authorization header.");
      return;
    }

    let decoded: { id: string; email: string; name: string };
    try {
      decoded = authService.verifyToken(token);
    } catch {
      sendApiError(res, 401, "AUTH_REQUIRED", "Invalid or expired authentication token.");
      return;
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      sendApiError(res, 401, "AUTH_REQUIRED", "Authenticated user no longer exists.");
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    sendApiError(res, 500, "INTERNAL_ERROR", "Internal authentication failure.");
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) return next();

    try {
      const decoded = authService.verifyToken(token);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore invalid optional tokens
    }
    next();
  } catch {
    next();
  }
};
