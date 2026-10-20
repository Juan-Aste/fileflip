"use client";

import type { FormatId } from "@/config/formats";
import type { ToolId } from "@/config/tools";
import type { ApiErrorCode } from "./api-errors";

/** Reports a browser conversion's metadata (formats, sizes and timing only). */
export function reportConversion(entry: {
  from: FormatId;
  to: FormatId;
  size: number;
  outputSize?: number;
  success: boolean;
  /** The PDF tool that ran it; omitted for the format converter. */
  tool?: ToolId;
  durationMs?: number;
  errorCode?: ApiErrorCode;
  /** Only for failures of uploads the server rejected before converting. */
  engine?: "server";
}) {
  try {
    const body = JSON.stringify(entry);
    // sendBeacon survives page navigation and never blocks the UI.
    if (!navigator.sendBeacon?.("/api/stats", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/stats", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Stats are best-effort.
  }
}

/**
 * Runs a PDF tool and reports its use: tool, formats, total input size,
 * output size, duration and whether it worked. Errors are rethrown.
 */
export async function trackTool<T>(
  tool: ToolId,
  input: { from: FormatId; to: FormatId; files: readonly Blob[] },
  run: () => Promise<T>,
  outputSize: (result: T) => number,
): Promise<T> {
  const start = performance.now();
  const size = input.files.reduce((sum, f) => sum + f.size, 0);
  const base = { tool, from: input.from, to: input.to, size };
  try {
    const result = await run();
    reportConversion({ ...base, outputSize: outputSize(result), success: true, durationMs: Math.round(performance.now() - start) });
    return result;
  } catch (error) {
    reportConversion({ ...base, success: false, durationMs: Math.round(performance.now() - start), errorCode: "conversionFailed" });
    throw error;
  }
}
