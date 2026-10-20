"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Counts a page visit (only its path; the server keeps the language, the page
 * and the country). Sent after the page is idle so it never delays loading,
 * and skipped when the browser asks not to be tracked.
 */
export default function VisitBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || navigator.doNotTrack === "1" || pathname.split("/")[2] === "admin") return;
    const send = () => {
      try {
        const body = new Blob([JSON.stringify({ path: pathname })], { type: "application/json" });
        navigator.sendBeacon?.("/api/visit", body);
      } catch {
        // Stats are best-effort.
      }
    };
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(send, { timeout: 5000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(send, 1500);
    return () => clearTimeout(id);
  }, [pathname]);
  return null;
}
