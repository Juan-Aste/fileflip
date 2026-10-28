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
import { applyEdits, rasterizePages, type EditFont, type EditItem } from "@/lib/pdf/edit";
import { originalJpegs } from "@/lib/pdf/jpegs";
import { protectPdf, unlockPdf, withoutEncryption, type Permissions, type Qpdf, type QpdfFactory } from "@/lib/pdf/password";
import { addTextLayers } from "@/lib/pdf/ocr-layer";
import { exposeHandlers } from "@/lib/worker-rpc";

/** Text Helvetica can't encode (Chinese, emoji...) drawn with the device's fonts at 4× for print. */
const textRenderer = (style: string, family: string): RenderText => async (text, size, [r, g, b]) => {
  const scale = 4;
  const font = `${style} ${size * scale}px ${family}`;
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
const SANS = `system-ui, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif`;
const renderText = textRenderer("bold", SANS);
const editRenderers: Record<EditFont, RenderText> = {
  helvetica: textRenderer("normal", SANS),
  "helvetica-bold": renderText,
  times: textRenderer("normal", `"Times New Roman", "Noto Serif", "Songti SC", SimSun, serif`),
  courier: textRenderer("normal", `"Courier New", "Noto Sans Mono", monospace`),
};

// qpdf (1.3 MB of WASM) is only downloaded by the password tools and for
// encrypted inputs of the others.
const qpdfWasm = new URL("../../node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm", import.meta.url).href;
const loadQpdf: QpdfFactory = async () => {
  const { default: create } = (await import("@neslinesli93/qpdf-wasm")) as unknown as {
    default: (options: object) => Promise<Qpdf>;
  };
  return create({ locateFile: () => qpdfWasm, print: () => {}, printErr: () => {} });
};

/** Encrypted inputs decrypted first: pdf-lib would copy unreadable pages (B-18). */
const plain = (bytes: Uint8Array) => withoutEncryption(bytes, loadQpdf);

exposeHandlers({
  count: async (bytes: Uint8Array) => ({ result: await pageCount(bytes) }),
  merge: async (files: Uint8Array[], onProgress) => {
    const result = await mergePdfs(await Promise.all(files.map(plain)), onProgress);
    return { result, transfer: [result.buffer] };
  },
  split: async ({ bytes, groups }: { bytes: Uint8Array; groups: number[][] }, onProgress) => {
    const result = await splitPdf(await plain(bytes), groups, onProgress);
    return { result, transfer: result.map((r) => r.buffer) };
  },
  rotate: async ({ bytes, rotation, pages }: { bytes: Uint8Array; rotation: Rotation; pages?: number[] }) => {
    const result = await rotatePdf(await plain(bytes), rotation, pages);
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
    const result = await compressPdf(await plain(bytes), level, browserRecompress, onProgress);
    return { result, transfer: [result.bytes.buffer] };
  },
  pageNumbers: async ({ bytes, options }: { bytes: Uint8Array; options: PageNumberOptions }, onProgress) => {
    const result = await addPageNumbers(await plain(bytes), options, renderText, onProgress);
    return { result, transfer: [result.buffer] };
  },
  watermark: async ({ bytes, options }: { bytes: Uint8Array; options: WatermarkOptions }, onProgress) => {
    const result = await addWatermark(await plain(bytes), options, renderText, onProgress);
    return { result, transfer: [result.buffer] };
  },
  crop: async ({ bytes, margins }: { bytes: Uint8Array; margins: (Margins | null)[] }) => {
    const result = await cropPdf(await plain(bytes), margins);
    return { result, transfer: [result.buffer] };
  },
  sign: async ({ bytes, png, placements }: { bytes: Uint8Array; png: Uint8Array; placements: SignaturePlacement[] }) => {
    const result = await signPdf(await plain(bytes), png, placements);
    return { result, transfer: [result.buffer] };
  },
  edit: async ({ bytes, items }: { bytes: Uint8Array; items: EditItem[] }) => {
    const result = await applyEdits(await plain(bytes), items, (font) => editRenderers[font] ?? editRenderers.helvetica);
    return { result, transfer: [result.buffer] };
  },
  rasterize: async ({ bytes, pages }: { bytes: Uint8Array; pages: { index: number; jpeg: Uint8Array }[] }) => {
    const result = await rasterizePages(bytes, pages);
    return { result, transfer: [result.buffer] };
  },
  protect: async ({ bytes, password, permissions }: { bytes: Uint8Array; password: string; permissions: Permissions }) => {
    const result = await protectPdf(bytes, password, permissions, loadQpdf);
    return { result, transfer: [result.buffer] };
  },
  ocrLayers: async ({ bytes, layers }: { bytes: Uint8Array; layers: (Uint8Array | null)[] }) => {
    const result = await addTextLayers(await plain(bytes), layers);
    return { result, transfer: [result.buffer] };
  },
  unlock: async ({ bytes, password }: { bytes: Uint8Array; password: string }) => {
    const result = await unlockPdf(bytes, password, loadQpdf);
    return { result, transfer: [result.buffer] };
  },
  jpegs: async (bytes: Uint8Array) => {
    const result = await originalJpegs(await plain(bytes));
    return { result, transfer: Object.values(result).map((b) => b.buffer as ArrayBuffer) };
  },
  organize: async ({ bytes, specs }: { bytes: Uint8Array; specs: PageSpec[] }) => {
    const result = await organizePdf(await plain(bytes), specs);
    return { result, transfer: [result.buffer] };
  },
});
