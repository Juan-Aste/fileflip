"use client";

import type { FormatId } from "@/config/formats";

/** Reports a browser conversion's metadata (formats and sizes only). */
export function reportConversion(entry: {
  from: FormatId;
  to: FormatId;
  size: number;
  outputSize?: number;
  success: boolean;
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
