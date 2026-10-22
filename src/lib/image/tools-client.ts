import { createJobPool, type JobOptions } from "@/lib/jobs";
import type {
  CompressArgs,
  CompressResult,
  CropArgs,
  FaviconArgs,
  FaviconResult,
  IdPhotoArgs,
  IdPhotoResult,
  OverlayArgs,
  PreviewArgs,
  PreviewResult,
  ResizeArgs,
  ResizeResult,
  ScanArgs,
  StripArgs,
  StripResult,
  TransformArgs,
} from "@/workers/image-tools.worker";

// One worker for the image tools (compress, resize...), started on first use. Photos
// are decoded whole, so jobs run one at a time to keep memory in check.
const IMAGE_TOOL_TIMEOUT_MS = 5 * 60_000;
const pool = createJobPool(
  () => new Worker(new URL("../../workers/image-tools.worker.ts", import.meta.url), { type: "module" }),
);

export const compressImageFile = (args: CompressArgs, job: JobOptions = {}) =>
  pool.run<CompressResult>("compress", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });

export const resizeImageFile = (args: ResizeArgs, job: JobOptions = {}) =>
  pool.run<ResizeResult>("resize", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });

export const transformImageFile = (args: TransformArgs, job: JobOptions = {}) =>
  pool.run<{ buffer: ArrayBuffer; width: number; height: number }>("transform", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });

export const stripImageMetadata = (args: StripArgs, job: JobOptions = {}) =>
  pool.run<StripResult>("strip", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });

export const previewImageFile = (args: PreviewArgs, job: JobOptions = {}) =>
  pool.run<PreviewResult>("preview", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });

export const cropImageFile = (args: CropArgs, job: JobOptions = {}) =>
  pool.run<{ buffer: ArrayBuffer; width: number; height: number }>("crop", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });

export const overlayImageFile = (args: OverlayArgs, job: JobOptions = {}) =>
  pool.run<{ buffer: ArrayBuffer; width: number; height: number }>("overlay", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });

export const idPhotoFile = (args: IdPhotoArgs, job: JobOptions = {}) =>
  pool.run<IdPhotoResult>("idPhoto", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });

export const scanToPdf = (args: ScanArgs, job: JobOptions = {}) =>
  pool.run<{ buffer: ArrayBuffer; pages: number }>("scan", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });

export const faviconPack = (args: FaviconArgs, job: JobOptions = {}) =>
  pool.run<FaviconResult>("favicon", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });
