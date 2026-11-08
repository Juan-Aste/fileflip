import type { FormatId } from "@/config/formats";
import type { FaqItem } from "@/lib/faq";

/**
 * Text of its own for an indexed conversion page (phase 19.2b): when the
 * conversion is worth it, how the two formats differ, what survives and what
 * doesn't, the limits of our tool, concrete steps and an FAQ. Facts must match
 * what the tool really does (see the engine notes next to each entry).
 */
export interface ConversionContent {
  /** When this conversion makes sense (1–2 paragraphs). */
  when: string[];
  /** How the two formats differ (1–2 paragraphs). */
  differences: string[];
  /** What the result keeps. */
  kept: string[];
  /** What is lost or may change. */
  lost: string[];
  /** Limits of our tool for this conversion. */
  limits: string[];
  /** Concrete steps for this conversion (3 or 4); they replace the generic ones. */
  steps: string[];
  faq: FaqItem[];
}

export type ConversionKey = `${FormatId}>${FormatId}`;

export type ConversionContentMap = Partial<
  Record<ConversionKey, ConversionContent>
>;
