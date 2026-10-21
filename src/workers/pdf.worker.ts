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
import { compressPdf, type CompressionLevel } from "@/lib/pdf/compress";
import { browserRecompress } from "@/lib/pdf/recompress-browser";
import { addPageNumbers, addWatermark, type PageNumberOptions, type RenderText, type WatermarkOptions } from "@/lib/pdf/stamp";
import { cropPdf, type Margins } from "@/lib/pdf/crop";
import { signPdf, type SignaturePlacement } from "@/lib/pdf/sign";
import { originalJpegs } from "@/lib/pdf/images";
import { protectPdf, unlockPdf, type Permissions, type Qpdf, type QpdfFactory } from "@/lib/pdf/password";
import { exposeHandlers } from "@/lib/worker-rpc";

/** Text Helvetica can't encode (Chinese, emoji...) drawn with the device's fonts at 4× for print. */
const renderText: RenderText = async (text, size, [r, g, b]) => {
  const scale = 4;
  const font = `bold ${size * scale}px system-ui, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif`;
  const measure = new OffscreenCanvas(1, 1).getContext("2d")!;
  measure.font = font;
  const width = Math.ceil(measure.measureText(text).width) + 2;
  const height = Math.ceil(size * scale * 1.25);
  const canvas = new OffscreenCanvas(Math.max(1, width), height);
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  ctx.fillStyle = `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 1, height / 2);
  const png = new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
  return { png, width: width / scale, height: height / scale };
};

// qpdf (1.3 MB of WASM) is only downloaded by the password tools.
const qpdfWasm = new URL("../../node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm", import.meta.url).href;
const loadQpdf: QpdfFactory = async () => {
  const { default: create } = (await import("@neslinesli93/qpdf-wasm")) as unknown as {
    default: (options: object) => Promise<Qpdf>;
  };
  return create({ locateFile: () => qpdfWasm, print: () => {}, printErr: () => {} });
};

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
  compress: async ({ bytes, level }: { bytes: Uint8Array; level: CompressionLevel }, onProgress) => {
    const result = await compressPdf(bytes, level, browserRecompress, onProgress);
    return { result, transfer: [result.bytes.buffer] };
  },
  pageNumbers: async ({ bytes, options }: { bytes: Uint8Array; options: PageNumberOptions }, onProgress) => {
    const result = await addPageNumbers(bytes, options, renderText, onProgress);
    return { result, transfer: [result.buffer] };
  },
  watermark: async ({ bytes, options }: { bytes: Uint8Array; options: WatermarkOptions }, onProgress) => {
    const result = await addWatermark(bytes, options, renderText, onProgress);
    return { result, transfer: [result.buffer] };
  },
  crop: async ({ bytes, margins }: { bytes: Uint8Array; margins: (Margins | null)[] }) => {
    const result = await cropPdf(bytes, margins);
    return { result, transfer: [result.buffer] };
  },
  sign: async ({ bytes, png, placements }: { bytes: Uint8Array; png: Uint8Array; placements: SignaturePlacement[] }) => {
    const result = await signPdf(bytes, png, placements);
    return { result, transfer: [result.buffer] };
  },
  protect: async ({ bytes, password, permissions }: { bytes: Uint8Array; password: string; permissions: Permissions }) => {
    const result = await protectPdf(bytes, password, permissions, loadQpdf);
    return { result, transfer: [result.buffer] };
  },
  unlock: async ({ bytes, password }: { bytes: Uint8Array; password: string }) => {
    const result = await unlockPdf(bytes, password, loadQpdf);
    return { result, transfer: [result.buffer] };
  },
  jpegs: async (bytes: Uint8Array) => {
    const result = await originalJpegs(bytes);
    return { result, transfer: Object.values(result).map((b) => b.buffer as ArrayBuffer) };
  },
  organize: async ({ bytes, specs }: { bytes: Uint8Array; specs: PageSpec[] }) => {
    const result = await organizePdf(bytes, specs);
    return { result, transfer: [result.buffer] };
  },
});
