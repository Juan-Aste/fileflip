"use client";

import { useCallback, useState } from "react";
import type { FormatId } from "@/config/formats";
import { detectFileFormat } from "@/lib/detect";

export interface QueuedFile {
  id: string;
  file: File;
  /** undefined while detecting, null when unsupported. */
  format: FormatId | null | undefined;
}

let nextId = 0;

/** Files picked by the user, with their detected real format. */
export function useFileQueue() {
  const [items, setItems] = useState<QueuedFile[]>([]);

  const add = useCallback((files: Iterable<File>) => {
    const added = [...files].map((file) => ({
      id: `f${nextId++}`,
      file,
      format: undefined,
    }));
    setItems((prev) => [...prev, ...added]);
    for (const item of added) {
      detectFileFormat(item.file)
        .catch(() => null)
        .then((format) =>
          setItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, format } : p)),
          ),
        );
    }
  }, []);

  const remove = useCallback(
    (id: string) => setItems((prev) => prev.filter((p) => p.id !== id)),
    [],
  );

  const clear = useCallback(() => setItems([]), []);

  return { items, add, remove, clear };
}
