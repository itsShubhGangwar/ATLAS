import { CanonicalApiModel } from "./canonical-model";

export interface ParseOptions {
  validate?: boolean;
}

export interface ParseSuccessResult {
  success: true;
  data: CanonicalApiModel;
}

export interface ParseErrorResult {
  success: false;
  error: string;
  details?: unknown;
}

export type ParseResult = ParseSuccessResult | ParseErrorResult;

export type SupportedSpecType = "openapi" | "swagger";

export interface DetectedSpecVersion {
  version: string;
  specType: SupportedSpecType;
}