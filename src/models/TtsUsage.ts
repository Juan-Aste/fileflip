import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Characters sent to the cloud voice (task 13.3), one document per month
 * ("m:2026-11") and per day ("d:2026-11-02"). Only the count: never the text,
 * an IP or a user.
 */
const ttsUsageSchema = new Schema(
  {
    _id: { type: String, required: true },
    chars: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

export type TtsUsageDoc = InferSchemaType<typeof ttsUsageSchema>;

export const TtsUsage: Model<TtsUsageDoc> =
  (mongoose.models.TtsUsage as Model<TtsUsageDoc>) ?? mongoose.model<TtsUsageDoc>("TtsUsage", ttsUsageSchema);
