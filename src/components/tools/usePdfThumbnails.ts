"use client";

import { useEffect, useState } from "react";
import { openPdf, pageThumbnail } from "@/lib/pdf/render";

/** Renders thumbnail URLs for every page of a PDF, progressively. */
export function usePdfThumbnails(file: File | null) {
  const [thumbs, setThumbs] = useState<(string | undefined)[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setThumbs([]);
    setFailed(false);
    if (!file) return;
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      const doc = await openPdf(file);
      if (cancelled) return;
      setThumbs(Array(doc.numPages).fill(undefined));
      for (let i = 0; i < doc.numPages && !cancelled; i++) {
        const url = await pageThumbnail(doc, i);
        urls.push(url);
        if (!cancelled) setThumbs((prev) => prev.map((t, j) => (j === i ? url : t)));
      }
      await doc.loadingTask.destroy();
    })().catch((error) => {
      console.error(error);
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [file]);

  return { thumbs, failed };
}
