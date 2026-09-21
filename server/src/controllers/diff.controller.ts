import { Request, Response } from "express";
import { diffService } from "../services/diff";
import { openApiParser } from "../services/parser";
import { CanonicalApiModel } from "../services/parser/canonical-model";

export const compareDiffController = async (req: Request, res: Response): Promise<void> => {
  try {
    let baseModel: CanonicalApiModel | undefined;
    let newModel: CanonicalApiModel | undefined;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    // 1. Check for Base Model / Spec
    if (req.body?.baseModel?.metadata) {
      baseModel = req.body.baseModel;
    } else if (req.body?.baseCanonical?.metadata) {
      baseModel = req.body.baseCanonical;
    } else {
      let baseContent: string | undefined;
      if (files?.baseFile?.[0]?.buffer) {
        baseContent = files.baseFile[0].buffer.toString("utf-8");
      } else if (typeof req.body?.baseSpec === "string") {
        baseContent = req.body.baseSpec;
      } else if (typeof req.body?.baseContent === "string") {
        baseContent = req.body.baseContent;
      }

      if (baseContent) {
        const parseBase = await openApiParser.parse(baseContent);
        if (!parseBase.success) {
          res.status(400).json({
            error: `Failed to parse base specification: ${parseBase.error}`,
            details: parseBase.details,
          });
          return;
        }
        baseModel = parseBase.data;
      }
    }

    // 2. Check for New Model / Spec
    if (req.body?.newModel?.metadata) {
      newModel = req.body.newModel;
    } else if (req.body?.newCanonical?.metadata) {
      newModel = req.body.newCanonical;
    } else {
      let newContent: string | undefined;
      if (files?.newFile?.[0]?.buffer) {
        newContent = files.newFile[0].buffer.toString("utf-8");
      } else if (typeof req.body?.newSpec === "string") {
        newContent = req.body.newSpec;
      } else if (typeof req.body?.newContent === "string") {
        newContent = req.body.newContent;
      }

      if (newContent) {
        const parseNew = await openApiParser.parse(newContent);
        if (!parseNew.success) {
          res.status(400).json({
            error: `Failed to parse new specification: ${parseNew.error}`,
            details: parseNew.details,
          });
          return;
        }
        newModel = parseNew.data;
      }
    }

    if (!baseModel || !newModel) {
      res.status(400).json({
        error:
          "Both base and new specifications (or Canonical API Models) must be provided for comparison.",
      });
      return;
    }

    const diffResult = diffService.compareModels(baseModel, newModel);
    if (!diffResult.success || !diffResult.data) {
      res.status(400).json({
        error: diffResult.error || "Failed to compare API models.",
        details: diffResult.details,
      });
      return;
    }

    res.status(200).json(diffResult.data);
  } catch (err: any) {
    res.status(500).json({
      error: `Internal server error during API comparison: ${err.message}`,
    });
  }
};
