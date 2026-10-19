"use client";

import { useCallback, useState } from "react";
import type { FormatId } from "@/config/formats";
import { detectFileFormat } from "@/lib/detect";

export interface ToolFile {
  id: string;
  file: File;
  /** undefined while detecting; null when not accepted by the tool. */
  format: FormatId | null | undefined;
}

let nextId = 0;

/** An ordered list of input files for a tool, keeping only accepted formats. */
export function useToolFiles(accepted: readonly FormatId[]) {
  const [files, setFiles] = useState<ToolFile[]>([]);

  const add = useCallback(
    (picked: Iterable<File>) => {
      const added = [...picked].map((file) => ({ id: `t${nextId++}`, file, format: undefined }));
      setFiles((prev) => [...prev, ...added]);
      for (const item of added) {
        detectFileFormat(item.file)
          .catch(() => null)
          .then((format) =>
            setFiles((prev) =>
              prev.map((p) =>
                p.id === item.id ? { ...p, format: format && accepted.includes(format) ? format : null } : p,
              ),
            ),
          );
      }
    },
    [accepted],
  );

  const remove = useCallback((id: string) => setFiles((prev) => prev.filter((f) => f.id !== id)), []);

  const move = useCallback((id: string, delta: number) => {
    setFiles((prev) => {
      const from = prev.findIndex((f) => f.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }, []);

  const clear = useCallback(() => setFiles([]), []);

  const ready = files.filter((f) => f.format);
  const detecting = files.some((f) => f.format === undefined);

  return { files, ready, detecting, add, remove, move, clear };
}
