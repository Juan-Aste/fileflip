"use client";

import { useCallback, useEffect, useState } from "react";
import { countPdfPages } from "@/lib/pdf/client";
import { useToolFiles } from "./useToolFiles";

const ACCEPTED = ["pdf"] as const;

/** One PDF input (a new pick replaces it) plus its page count. */
export function useSinglePdf() {
  const { files, ready, detecting, add, remove, clear } = useToolFiles(ACCEPTED);
  const [pages, setPages] = useState<number | null>(null);
  const [broken, setBroken] = useState(false);
  const file = ready[0]?.file ?? null;

  const pick = useCallback(
    (picked: File[]) => {
      clear();
      add(picked.slice(0, 1));
    },
    [add, clear],
  );

  useEffect(() => {
    setPages(null);
    setBroken(false);
    if (!file) return;
    let cancelled = false;
    countPdfPages(file)
      .then((n) => !cancelled && setPages(n))
      .catch(() => !cancelled && setBroken(true));
    return () => {
      cancelled = true;
    };
  }, [file]);

  return { files, file, pages, broken, detecting, pick, remove, clear };
}
