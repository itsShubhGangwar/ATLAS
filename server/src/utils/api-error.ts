import { Response } from "express";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "PROJECT_NOT_FOUND"
  | "VERSION_NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_SPEC"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "INVALID_MODEL"
  | "INVALID_TARGET"
  | "TARGET_NOT_FOUND"
  | "UNSUPPORTED_TARGET_TYPE"
  | "INVALID_CHANGE"
  | "ENDPOINT_NOT_FOUND"
  | "ENDPOINT_ALREADY_EXISTS"
  | "SECURITY_SCHEME_NOT_FOUND"
  | "PARAMETER_NOT_FOUND"
  | "RESPONSE_NOT_FOUND"
  | "SCHEMA_NOT_FOUND"
  | "PROPERTY_NOT_FOUND"
  | "UNSUPPORTED_CHANGE_TYPE";

export class ApiError extends Error {
  public statusCode: number;
  public code: ApiErrorCode;
  public details?: unknown;

  constructor(statusCode: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const sendApiError = (
  res: Response,
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown
): void => {
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
};
