import "server-only";
import { formats, type FormatId } from "@/config/formats";
import { connectToDatabase } from "@/lib/db";
import { isApiErrorCode, type ApiErrorCode } from "@/lib/api-errors";
import { ConversionLog, conversionTools, type ConversionTool } from "@/models/ConversionLog";

export interface ConversionEntry {
  from: FormatId;
  to: FormatId;
  engine: "browser" | "server";
  size: number;
  outputSize?: number;
  success: boolean;
  tool?: ConversionTool;
  durationMs?: number;
  errorCode?: ApiErrorCode;
  userId?: string;
}

/** Milliseconds elapsed since `start` (a `performance.now()` value). */
export function elapsedMs(start: number): number {
  return Math.max(0, Math.round(performance.now() - start));
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

const MAX_DURATION_MS = 60 * 60 * 1000;

/** Validates an untrusted stats payload (from the browser). */
export function parseConversionEntry(raw: unknown): ConversionEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const isFormat = (v: unknown): v is FormatId => typeof v === "string" && v in formats;
  const isSize = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e12;
  if (!isFormat(r.from) || !isFormat(r.to) || !isSize(r.size) || typeof r.success !== "boolean") return null;
  const isDuration = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v < MAX_DURATION_MS;
  const entry: ConversionEntry = {
    from: r.from,
    to: r.to,
    // Successful server conversions are logged by the API itself; the browser
    // only reports server failures the API never saw (rejected uploads).
    engine: r.engine === "server" && !r.success ? "server" : "browser",
    size: Math.round(r.size),
    outputSize: isSize(r.outputSize) ? Math.round(r.outputSize) : undefined,
    success: r.success,
    tool: conversionTools.includes(r.tool as ConversionTool) ? (r.tool as ConversionTool) : "convert",
  };
  if (isDuration(r.durationMs)) entry.durationMs = Math.round(r.durationMs);
  if (!r.success) entry.errorCode = isApiErrorCode(r.errorCode) ? r.errorCode : "conversionFailed";
  return entry;
}
