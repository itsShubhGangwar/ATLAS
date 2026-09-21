import mongoose, { Document, Schema, Model, Types } from "mongoose";
import { DiffChange, DiffSummary } from "../services/diff/diff.types";

export interface IDiffReportModel extends Document {
  projectId: Types.ObjectId;
  baseVersionId: Types.ObjectId;
  newVersionId: Types.ObjectId;
  summary: DiffSummary;
  changes: DiffChange[];
  createdAt: Date;
}

const diffReportSchema = new Schema<IDiffReportModel>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    baseVersionId: {
      type: Schema.Types.ObjectId,
      ref: "ApiVersion",
      required: [true, "Base version ID is required"],
      index: true,
    },
    newVersionId: {
      type: Schema.Types.ObjectId,
      ref: "ApiVersion",
      required: [true, "New version ID is required"],
      index: true,
    },
    summary: {
      type: Schema.Types.Mixed,
      required: true,
    },
    changes: [Schema.Types.Mixed],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

diffReportSchema.index({ projectId: 1, createdAt: -1 });

export const DiffReportModel: Model<IDiffReportModel> =
  mongoose.models.DiffReport ||
  mongoose.model<IDiffReportModel>("DiffReport", diffReportSchema);

export const DiffReport = DiffReportModel;
