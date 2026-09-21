import { Request, Response } from "express";
import { governanceService } from "../services/governance";

export const analyzeGovernanceController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Option 1: Direct CanonicalApiModel provided in body
    if (req.body && (req.body.canonicalModel || req.body.metadata)) {
      const canonicalModel = req.body.canonicalModel || req.body;
      const result = governanceService.analyzeCanonicalModel(canonicalModel);
      if (!result.success || !result.data) {
        res.status(400).json({
          error: result.error || "Failed to analyze Canonical API Model.",
          details: result.details,
        });
        return;
      }
      res.status(200).json(result.data);
      return;
    }

    // Option 2: Uploaded file via Multer
    let specContent: string | undefined;
    if (req.file && req.file.buffer) {
      specContent = req.file.buffer.toString("utf-8");
    }
    // Option 3: Raw YAML/JSON string in request body
    else if (req.body) {
      if (typeof req.body.spec === "string") {
        specContent = req.body.spec;
      } else if (typeof req.body.content === "string") {
        specContent = req.body.content;
      } else if (typeof req.body === "string") {
        specContent = req.body;
      } else if (typeof req.body === "object" && Object.keys(req.body).length > 0) {
        specContent = JSON.stringify(req.body);
      }
    }

    if (!specContent || !specContent.trim()) {
      res.status(400).json({
        error: "No OpenAPI specification or CanonicalApiModel provided. Please upload a YAML/JSON file or send the specification in the request body.",
      });
      return;
    }

    // Parser service -> CanonicalApiModel -> GovernanceEngine
    const result = await governanceService.analyzeSpec(specContent);

    if (!result.success || !result.data) {
      res.status(400).json({
        error: result.error || "Failed to analyze specification.",
        details: result.details,
      });
      return;
    }

    res.status(200).json(result.data);
  } catch (err: any) {
    res.status(500).json({
      error: `Internal server error while analyzing governance rules: ${err.message}`,
    });
  }
};
