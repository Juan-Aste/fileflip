import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { locales } from "@/i18n/routing";

export const pageKinds = ["home", "conversion", "tool", "longtail", "pricing", "legal", "account", "other"] as const;
export type PageKind = (typeof pageKinds)[number];

/**
 * One page visit, for the admin stats. No IP, user, cookie id or full URL:
 * only the language, the country set by the CDN and which page it was.
 */
const pageViewSchema = new Schema(
  {
    locale: { type: String, enum: locales, required: true },
    /** ISO country from the CDN's geo header, when there is one. */
    country: { type: String, match: /^[A-Z]{2}$/ },
    kind: { type: String, enum: pageKinds, required: true },
    /** Language-independent page id: "jpg-webp", "merge-pdf", a long-tail id... */
    page: { type: String, maxlength: 80 },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

// Range queries of the admin panel; visits older than a year are dropped.
pageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

export type PageViewDoc = InferSchemaType<typeof pageViewSchema>;

export const PageView: Model<PageViewDoc> =
  (mongoose.models.PageView as Model<PageViewDoc>) ?? mongoose.model<PageViewDoc>("PageView", pageViewSchema);
