import mongoose, { Document, Schema, Model, Types } from "mongoose";
import { CanonicalApiModel } from "../services/parser/canonical-model";

export interface IApiVersion extends Document {
  projectId: Types.ObjectId;
  name?: string;
  version: string;
  openApiVersion: string;
  specType: "openapi" | "swagger";
  originalSpec: string;
  canonicalModel: CanonicalApiModel;
  endpointsCount: number;
  schemasCount: number;
  createdAt: Date;
}

const apiVersionSchema = new Schema<IApiVersion>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    version: {
      type: String,
      required: [true, "API version is required"],
      trim: true,
    },
    openApiVersion: {
      type: String,
      required: [true, "OpenAPI version is required"],
      trim: true,
    },
    specType: {
      type: String,
      enum: ["openapi", "swagger"],
      required: [true, "Spec type is required"],
      default: "openapi",
    },
    originalSpec: {
      type: String,
      required: [true, "Original specification string is required"],
    },
    canonicalModel: {
      type: Schema.Types.Mixed,
      required: [true, "Canonical API model is required"],
    },
    endpointsCount: {
      type: Number,
      default: 0,
    },
    schemasCount: {
      type: Number,
      default: 0,
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

apiVersionSchema.index({ projectId: 1, createdAt: -1 });

export const ApiVersion: Model<IApiVersion> =
  mongoose.models.ApiVersion ||
  mongoose.model<IApiVersion>("ApiVersion", apiVersionSchema);
