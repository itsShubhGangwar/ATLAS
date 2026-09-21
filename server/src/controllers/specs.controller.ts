import { Request, Response } from "express";
import { openApiParser } from "../services/parser";

export const parseSpecification = async (req: Request, res: Response): Promise<void> => {
  try {
    let specContent: string | undefined;

    // Check 1: File upload via multipart/form-data (Multer memory storage)
    if (req.file && req.file.buffer) {
      specContent = req.file.buffer.toString("utf-8");
    }
    // Check 2: Raw string or object in request body
    else if (req.body) {
      if (typeof req.body.spec === "string") {
        specContent = req.body.spec;
      } else if (typeof req.body.content === "string") {
        specContent = req.body.content;
      } else if (typeof req.body === "string") {
        specContent = req.body;
      } else if (typeof req.body === "object" && Object.keys(req.body).length > 0) {
        // Direct JSON specification object
        specContent = JSON.stringify(req.body);
      }
    }

    if (!specContent || !specContent.trim()) {
      res.status(400).json({
        success: false,
        error: "No OpenAPI specification provided. Please upload a YAML/JSON file or send the specification in the request body.",
      });
      return;
    }

    // Parse the specification into the Canonical API Model
    const result = await openApiParser.parse(specContent);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Internal server error while parsing specification: ${err.message}`,
    });
  }
};