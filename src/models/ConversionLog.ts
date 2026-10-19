import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { formats } from "@/config/formats";

const formatIds = Object.keys(formats);

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
