"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  findConversion,
  formats,
  outputFilename,
  type FormatId,
} from "@/config/formats";
import { limits } from "@/config/limits";
import { useSessionInfo } from "@/components/session/SessionInfo";
import type { ApiErrorCode } from "@/lib/api-errors";
import { deviceConcurrency, runLimited } from "@/lib/concurrency";
import { convertFile, type ConvertOptions } from "@/lib/convert";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { detectFileFormat } from "@/lib/detect";
import { reportConversion } from "@/lib/stats-client";
import { FAKE_BG_DETECT_MAX_BYTES, fakeBgInputs, type FakeBgOutput } from "@/lib/image/fake-bg-shared";

export type JobState =
  | { status: "working"; progress: number }
  | {
      status: "done";
      blob: Blob;
      url: string;
      name: string;
      engine: "browser" | "server";
    }
  | { status: "error"; code: ApiErrorCode };

export interface QueuedFile {
  id: string;
  file: File;
  /** undefined while detecting, null when unsupported. */
  format: FormatId | null | undefined;
  job?: JobState;
  /** After the check: "none", "found" (a drawn checkerboard background) or "fixed" (turned into real transparency). */
  fake?: "none" | "found" | "fixed";
}

let nextId = 0;

const revoke = (item: QueuedFile) => {
  if (item.job?.status === "done") URL.revokeObjectURL(item.job.url);
};

/** Files picked by the user, their detected real format and conversion state. */
export function useFileQueue() {
  const { plan } = useSessionInfo();
  const [items, setItems] = useState<QueuedFile[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Free object URLs when the component goes away.
  useEffect(() => () => itemsRef.current.forEach(revoke), []);

  const update = useCallback((id: string, patch: Partial<QueuedFile>) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  /** Looks for a drawn checkerboard background (in a worker loaded only now). */
  const checkFake = useCallback(
    (id: string, file: File, format: FormatId) => {
      import("@/lib/image/fake-bg-client")
        .then(({ detectFakeBackground }) => detectFakeBackground(file, format))
        .then(({ found }) => update(id, { fake: found ? "found" : "none" }))
        .catch(() => undefined);
    },
    [update],
  );

  const add = useCallback(
    (files: Iterable<File>) => {
      const added = [...files].map((file) => ({
        id: `f${nextId++}`,
        file,
        format: undefined,
      }));
      setItems((prev) => [...prev, ...added]);
      for (const item of added) {
        detectFileFormat(item.file)
          .catch(() => null)
          .then((format) => {
            update(item.id, { format });
            if (format && fakeBgInputs.includes(format) && item.file.size <= FAKE_BG_DETECT_MAX_BYTES) checkFake(item.id, item.file, format);
          });
      }
    },
    [update, checkFake],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      prev.filter((p) => p.id === id).forEach(revoke);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setItems((prev) => {
      prev.forEach(revoke);
      return [];
    });
  }, []);

  /**
   * Converts every supported file to `to`. Browser conversions run in
   * parallel, limited to what the device can take; server ones go one after
   * another (they are rate limited per IP), alongside the browser lane.
   */
  const convertAll = useCallback(
    async (to: FormatId, options: Omit<ConvertOptions, "onProgress"> = {}) => {
      const queue = itemsRef.current.filter((i) => i.format);
      for (const item of queue) revoke(item);
      for (const item of queue) {
        update(item.id, { job: { status: "working", progress: 0 } });
      }

      const convertOne = async (item: QueuedFile) => {
        const start = performance.now();
        const durationMs = () => Math.round(performance.now() - start);
        try {
          const { blob, engine, filename } = await convertFile(
            item.file,
            item.format as FormatId,
            to,
            {
              ...options,
              plan,
              onProgress: (progress) =>
                update(item.id, { job: { status: "working", progress } }),
            },
          );
          // Server conversions are logged by the API itself.
          if (engine === "browser") {
            reportConversion({
              from: item.format as FormatId,
              to,
              size: item.file.size,
              outputSize: blob.size,
              success: true,
              durationMs: durationMs(),
            });
          }
          update(item.id, {
            job: {
              status: "done",
              blob,
              url: URL.createObjectURL(blob),
              name: filename ?? outputFilename(item.file.name, to),
              engine,
            },
          });
        } catch (error) {
          console.error(error);
          const code = errorCode(error);
          // The API already logged the failures it saw.
          const fromServer = error instanceof ConversionError && error.loggedByServer;
          if (!fromServer) {
            reportConversion({
              from: item.format as FormatId,
              to,
              size: item.file.size,
              success: false,
              durationMs: durationMs(),
              errorCode: code,
              ...(isServer(item) ? { engine: "server" as const } : {}),
            });
          }
          update(item.id, { job: { status: "error", code } });
        }
      };

      const isServer = (item: QueuedFile) =>
        findConversion(item.format as FormatId, to)?.engine === "server";
      const browserJobs = queue.filter((item) => !isServer(item));
      // Server conversions cost us money: free batches are capped.
      const serverJobs = queue.filter(isServer);
      const allowed = serverJobs.slice(0, limits[plan].serverMaxBatch);
      for (const item of serverJobs.slice(allowed.length)) {
        update(item.id, { job: { status: "error", code: "tooManyFiles" } });
      }

      await Promise.all([
        runLimited(browserJobs, deviceConcurrency(), convertOne),
        runLimited(allowed, 1, convertOne),
      ]);
    },
    [update, plan],
  );

  /** Turns the drawn checkerboard of one file into real transparency (PNG, WEBP or AVIF). */
  const removeFake = useCallback(
    async (id: string, to: FakeBgOutput) => {
      const item = itemsRef.current.find((i) => i.id === id);
      if (!item?.format) return;
      revoke(item);
      update(id, { job: { status: "working", progress: 0 } });
      const start = performance.now();
      try {
        const { removeFakeBackground } = await import("@/lib/image/fake-bg-client");
        const { buffer } = await removeFakeBackground(item.file, item.format, to, {
          onProgress: (progress) => update(id, { job: { status: "working", progress } }),
        });
        const blob = new Blob([buffer], { type: formats[to].mime });
        reportConversion({ from: item.format, to, size: item.file.size, outputSize: blob.size, success: true, durationMs: Math.round(performance.now() - start) });
        update(id, { fake: "fixed", job: { status: "done", blob, url: URL.createObjectURL(blob), name: outputFilename(item.file.name, to), engine: "browser" } });
      } catch (error) {
        update(id, { job: { status: "error", code: errorCode(error) } });
      }
    },
    [update],
  );

  return { items, add, remove, clear, convertAll, removeFake };
}
