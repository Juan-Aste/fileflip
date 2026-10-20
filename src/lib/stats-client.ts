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
