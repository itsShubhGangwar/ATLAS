import mongoose, { Document, Schema, Model, Types } from "mongoose";
import { GovernanceFinding, GovernanceSummary } from "../services/governance/governance.types";

export interface IGovernanceReportModel extends Document {
  projectId: Types.ObjectId;
  apiVersionId: Types.ObjectId;
  score: number;
  findings: GovernanceFinding[];
  summary: GovernanceSummary;
  rulesRun: number;
  createdAt: Date;
}

const governanceReportSchema = new Schema<IGovernanceReportModel>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    apiVersionId: {
      type: Schema.Types.ObjectId,
      ref: "ApiVersion",
      required: [true, "API Version ID is required"],
      index: true,
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
    },
    findings: [Schema.Types.Mixed],
    summary: {
      type: Schema.Types.Mixed,
      required: true,
    },
    rulesRun: {
      type: Number,
      required: true,
      default: 8,
    },
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

governanceReportSchema.index({ apiVersionId: 1, createdAt: -1 });
governanceReportSchema.index({ projectId: 1, createdAt: -1 });

export const GovernanceReportModel: Model<IGovernanceReportModel> =
  mongoose.models.GovernanceReport ||
  mongoose.model<IGovernanceReportModel>("GovernanceReport", governanceReportSchema);

export const GovernanceReport = GovernanceReportModel;
