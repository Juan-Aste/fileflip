/// <reference lib="webworker" />
import { mergePdfs, pageCount, rotatePdf, splitPdf, type Rotation } from "@/lib/pdf/ops";
import { exposeHandlers } from "@/lib/worker-rpc";

exposeHandlers({
  count: async (bytes: Uint8Array) => ({ result: await pageCount(bytes) }),
  merge: async (files: Uint8Array[], onProgress) => {
    const result = await mergePdfs(files, onProgress);
    return { result, transfer: [result.buffer] };
  },
  split: async ({ bytes, groups }: { bytes: Uint8Array; groups: number[][] }, onProgress) => {
    const result = await splitPdf(bytes, groups, onProgress);
    return { result, transfer: result.map((r) => r.buffer) };
  },
  rotate: async ({ bytes, rotation, pages }: { bytes: Uint8Array; rotation: Rotation; pages?: number[] }) => {
    const result = await rotatePdf(bytes, rotation, pages);
    return { result, transfer: [result.buffer] };
  },
});
