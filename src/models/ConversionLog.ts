import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { formats } from "@/config/formats";
import { toolIds } from "@/config/tools";
import { apiErrorCodes } from "@/lib/api-errors";

const formatIds = Object.keys(formats);

/** "convert" is the format converter; the rest are the PDF tools. */
export const conversionTools = ["convert", ...toolIds] as const;
export type ConversionTool = (typeof conversionTools)[number];

/**
 * Metadata of one conversion, for usage stats and limits. Never the file
 * itself, its name or its content.
 */
const conversionLogSchema = new Schema(
  {
    from: { type: String, enum: formatIds, required: true },
    to: { type: String, enum: formatIds, required: true },
    engine: { type: String, enum: ["browser", "server"], required: true },
    /** Input size in bytes. */
    size: { type: Number, min: 0, required: true },
    outputSize: { type: Number, min: 0 },
    success: { type: Boolean, required: true },
    /** Which tool ran it (older entries without it are "convert"). */
    tool: { type: String, enum: conversionTools, default: "convert" },
    /** Wall time of the conversion itself, in milliseconds. */
    durationMs: { type: Number, min: 0 },
    /** Why it failed (an API error code, never a message). */
    errorCode: { type: String, enum: apiErrorCodes },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

// Stats older than a year are dropped automatically.
conversionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

export type ConversionLogDoc = InferSchemaType<typeof conversionLogSchema>;

export const ConversionLog: Model<ConversionLogDoc> =
  (mongoose.models.ConversionLog as Model<ConversionLogDoc>) ??
  mongoose.model<ConversionLogDoc>("ConversionLog", conversionLogSchema);
