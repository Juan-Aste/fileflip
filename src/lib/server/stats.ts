import "server-only";
import { formats, type FormatId } from "@/config/formats";
import { connectToDatabase } from "@/lib/db";
import { ConversionLog } from "@/models/ConversionLog";

export interface ConversionEntry {
  from: FormatId;
  to: FormatId;
  engine: "browser" | "server";
  size: number;
  outputSize?: number;
  success: boolean;
  userId?: string;
}

/** Stores conversion metadata. Never throws: stats must not break conversions. */
export async function logConversion(entry: ConversionEntry): Promise<void> {
  if (!process.env.MONGODB_URI) return;
  try {
    await connectToDatabase();
    await ConversionLog.create(entry);
  } catch (error) {
    console.warn("Could not log conversion", error);
  }
}

/** Validates an untrusted stats payload (from the browser). */
export function parseConversionEntry(raw: unknown): ConversionEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const isFormat = (v: unknown): v is FormatId => typeof v === "string" && v in formats;
  const isSize = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e12;
  if (!isFormat(r.from) || !isFormat(r.to) || !isSize(r.size) || typeof r.success !== "boolean") return null;
  return {
    from: r.from,
    to: r.to,
    engine: "browser",
    size: Math.round(r.size),
    outputSize: isSize(r.outputSize) ? Math.round(r.outputSize) : undefined,
    success: r.success,
  };
}
