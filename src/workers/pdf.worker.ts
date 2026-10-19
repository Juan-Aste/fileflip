/// <reference lib="webworker" />
import {
  imagesToPdf,
  mergePdfs,
  organizePdf,
  pageCount,
  rotatePdf,
  splitPdf,
  type PageSize,
  type PageSpec,
  type PdfImage,
  type Rotation,
} from "@/lib/pdf/ops";
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
  images: async (
    { images, pageSize, margin }: { images: PdfImage[]; pageSize: PageSize; margin: number },
    onProgress,
  ) => {
    const result = await imagesToPdf(images, { pageSize, margin }, onProgress);
    return { result, transfer: [result.buffer] };
  },
  organize: async ({ bytes, specs }: { bytes: Uint8Array; specs: PageSpec[] }) => {
    const result = await organizePdf(bytes, specs);
    return { result, transfer: [result.buffer] };
  },
});
