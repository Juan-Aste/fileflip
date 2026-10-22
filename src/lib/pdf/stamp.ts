// Page numbers and text watermarks drawn on PDF pages with pdf-lib.
// Positions are "visual": what the reader sees, also on pages with a /Rotate
// entry (scans are often stored sideways and rotated for display). Text the
// standard Helvetica font can't encode (Chinese, emoji...) is drawn as a PNG
// rendered by the caller with the device's fonts.
import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { ConversionError } from "@/lib/convert-error";
import type { Progress } from "./ops";

export type StampPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
export type StampSize = "small" | "medium" | "large";
export type WatermarkLayout = "diagonal" | "horizontal" | "tiled";

/** Text drawn as an image: PNG bytes and its size in points. */
export interface RenderedText {
  png: Uint8Array;
  width: number;
  height: number;
}
/** Renders text at a font size (points) and color (0-1 RGB) into a transparent PNG. */
export type RenderText = (text: string, size: number, color: [number, number, number]) => Promise<RenderedText>;

export interface PageNumberOptions {
  position: StampPosition;
  /** "{n}" is the number, "{total}" the last number. */
  template: string;
  /** Number printed on the first numbered page. */
  start: number;
  /** Leave the first page (a cover) without a number; numbering starts on page 2. */
  skipFirst: boolean;
  size: StampSize;
}

export interface WatermarkOptions {
  text: string;
  layout: WatermarkLayout;
  size: StampSize;
  /** 0.05-1. */
  opacity: number;
  color: [number, number, number];
  /** 0-based pages to mark; all when omitted. */
  pages?: readonly number[];
}

export const MAX_STAMP_TEXT = 200;
const NUMBER_SIZES: Record<StampSize, number> = { small: 9, medium: 11, large: 14 };
/** Distance from the page edge to page numbers (about 1 cm). */
const NUMBER_MARGIN = 28;

async function load(bytes: Uint8Array) {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new ConversionError("fileDamaged");
  }
}

/** pdf-lib loads some broken files and fails later, while reading their pages. */
async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
  }
}

async function save(doc: PDFDocument) {
  doc.setProducer("Fileflect");
  return doc.save({ useObjectStreams: true });
}

// --- Geometry

interface Visual {
  /** Visible size as displayed. */
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  box: { x: number; y: number; width: number; height: number };
}

export function visualPage(page: Pick<PDFPage, "getCropBox" | "getRotation">): Visual {
  const box = page.getCropBox();
  // /Rotate must be a multiple of 90; round anything else the way viewers do.
  const rotation = ((((Math.round(page.getRotation().angle / 90) * 90) % 360) + 360) % 360) as Visual["rotation"];
  const sideways = rotation === 90 || rotation === 270;
  return { width: sideways ? box.height : box.width, height: sideways ? box.width : box.height, rotation, box };
}

/** A point as seen by the reader (origin bottom-left) → the page's own coordinates. */
export function toUserSpace({ rotation, box }: Visual, vx: number, vy: number) {
  const { x, y, width: w, height: h } = box;
  if (rotation === 90) return { x: x + w - vy, y: y + vx };
  if (rotation === 180) return { x: x + w - vx, y: y + h - vy };
  if (rotation === 270) return { x: x + vy, y: y + h - vx };
  return { x: x + vx, y: y + vy };
}

/**
 * Where to draw a box of `width` × `height` so that the reader sees it
 * centered on (cx, cy) and turned `angle` degrees counter-clockwise: pdf-lib
 * draws from the bottom-left corner and rotates around it.
 */
export function placeBox(visual: Visual, width: number, height: number, cx: number, cy: number, angle: number) {
  const a = (angle * Math.PI) / 180;
  const dx = (width / 2) * Math.cos(a) - (height / 2) * Math.sin(a);
  const dy = (width / 2) * Math.sin(a) + (height / 2) * Math.cos(a);
  const { x, y } = toUserSpace(visual, cx - dx, cy - dy);
  return { x, y, rotate: degrees((angle + visual.rotation) % 360) };
}

// --- Drawing text (vector when possible, PNG otherwise)

interface Stamp {
  width: number;
  height: number;
  draw: (page: PDFPage, at: ReturnType<typeof placeBox>, opacity: number) => void;
}

class Stamper {
  private images = new Map<string, Promise<{ image: PDFImage; width: number; height: number }>>();
  constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private render?: RenderText,
  ) {}

  private encodable(text: string) {
    try {
      this.font.encodeText(text);
      return true;
    } catch {
      return false;
    }
  }

  /** Width of the text at a size, without embedding anything. */
  async measure(text: string, size: number): Promise<number> {
    if (this.encodable(text)) return this.font.widthOfTextAtSize(text, size);
    if (!this.render) throw new ConversionError("invalidRequest");
    return (await this.render(text, size, [0, 0, 0])).width;
  }

  async stamp(text: string, size: number, color: [number, number, number]): Promise<Stamp> {
    if (this.encodable(text)) {
      const width = this.font.widthOfTextAtSize(text, size);
      // The box is the cap height, so the text looks centered.
      const height = this.font.heightAtSize(size, { descender: false }) * 0.72;
      return {
        width,
        height,
        draw: (page, { x, y, rotate }, opacity) => page.drawText(text, { x, y, size, font: this.font, color: rgb(...color), rotate, opacity }),
      };
    }
    const render = this.render;
    if (!render) throw new ConversionError("invalidRequest");
    const key = `${size}|${color.join(",")}|${text}`;
    let cached = this.images.get(key);
    if (!cached) {
      cached = render(text, size, color).then(async ({ png, width, height }) => ({ image: await this.doc.embedPng(png), width, height }));
      this.images.set(key, cached);
    }
    const { image, width, height } = await cached;
    return { width, height, draw: (page, { x, y, rotate }, opacity) => page.drawImage(image, { x, y, width, height, rotate, opacity }) };
  }
}

// --- Page numbers

export function pageNumberText(template: string, n: number, total: number) {
  return template.replace(/\{n\}/g, String(n)).replace(/\{total\}/g, String(total));
}

export const addPageNumbers = (bytes: Uint8Array, options: PageNumberOptions, render?: RenderText, onProgress?: Progress) =>
  guard(() => pageNumbers(bytes, options, render, onProgress));

async function pageNumbers(bytes: Uint8Array, options: PageNumberOptions, render?: RenderText, onProgress?: Progress) {
  const template = options.template.slice(0, MAX_STAMP_TEXT);
  if (!template.includes("{n}")) throw new ConversionError("invalidRequest");
  const doc = await load(bytes);
  const stamper = new Stamper(doc, await doc.embedFont(StandardFonts.Helvetica), render);
  const pages = doc.getPages();
  const first = options.skipFirst ? 1 : 0;
  const total = options.start + pages.length - first - 1;
  const size = NUMBER_SIZES[options.size];
  const [vertical, horizontal] = options.position.split("-") as ["top" | "bottom", "left" | "center" | "right"];
  for (let i = first; i < pages.length; i++) {
    const page = pages[i]!;
    const visual = visualPage(page);
    const stamp = await stamper.stamp(pageNumberText(template, options.start + i - first, total), size, [0.15, 0.15, 0.15]);
    const cx =
      horizontal === "left" ? NUMBER_MARGIN + stamp.width / 2 : horizontal === "right" ? visual.width - NUMBER_MARGIN - stamp.width / 2 : visual.width / 2;
    const cy = vertical === "bottom" ? NUMBER_MARGIN + stamp.height / 2 : visual.height - NUMBER_MARGIN - stamp.height / 2;
    stamp.draw(page, placeBox(visual, stamp.width, stamp.height, cx, cy, 0), 1);
    onProgress?.((i + 1) / pages.length);
  }
  return save(doc);
}

// --- Watermark

/** Share of the page the text spans (diagonal / width), or its size against the short side when tiled. */
const WATERMARK_SPAN: Record<StampSize, number> = { small: 0.45, medium: 0.65, large: 0.85 };
const TILE_SIZE: Record<StampSize, number> = { small: 0.035, medium: 0.05, large: 0.075 };
/** Tiled copies per page at most (tiny text on a huge page). */
const MAX_TILES = 400;

export const addWatermark = (bytes: Uint8Array, options: WatermarkOptions, render?: RenderText, onProgress?: Progress) =>
  guard(() => watermark(bytes, options, render, onProgress));

async function watermark(bytes: Uint8Array, options: WatermarkOptions, render?: RenderText, onProgress?: Progress) {
  const text = options.text.trim().slice(0, MAX_STAMP_TEXT);
  if (!text) throw new ConversionError("invalidRequest");
  const opacity = Math.min(1, Math.max(0.05, options.opacity));
  const doc = await load(bytes);
  const stamper = new Stamper(doc, await doc.embedFont(StandardFonts.HelveticaBold), render);
  const pages = doc.getPages();
  const targets = options.pages ?? pages.map((_, i) => i);
  // Measured once at 10 pt: the width scales with the size.
  const unitWidth = await stamper.measure(text, 10);
  for (const [done, index] of targets.entries()) {
    const page = pages[index];
    if (!page) continue;
    const visual = visualPage(page);
    const short = Math.min(visual.width, visual.height);
    if (options.layout === "tiled") {
      const size = short * TILE_SIZE[options.size];
      const stamp = await stamper.stamp(text, size, options.color);
      const stepX = stamp.width + size * 2;
      const stepY = size * 4;
      // Cover the page's diagonal so the turned rows reach every corner.
      const reach = Math.hypot(visual.width, visual.height);
      const cols = Math.ceil(reach / stepX) + 1;
      const rows = Math.ceil(reach / stepY) + 1;
      if (cols * rows > MAX_TILES * 4) throw new ConversionError("invalidRequest");
      const a = (30 * Math.PI) / 180;
      let drawn = 0;
      for (let r = -rows; r <= rows && drawn < MAX_TILES; r++) {
        for (let c = -cols; c <= cols && drawn < MAX_TILES; c++) {
          // Rows offset like bricks, laid along the 30° direction.
          const u = (c + (r % 2 ? 0.5 : 0)) * stepX;
          const v = r * stepY;
          const cx = visual.width / 2 + u * Math.cos(a) - v * Math.sin(a);
          const cy = visual.height / 2 + u * Math.sin(a) + v * Math.cos(a);
          const margin = Math.max(stamp.width, stamp.height) / 2;
          if (cx < -margin || cy < -margin || cx > visual.width + margin || cy > visual.height + margin) continue;
          stamp.draw(page, placeBox(visual, stamp.width, stamp.height, cx, cy, 30), opacity);
          drawn++;
        }
      }
    } else {
      const angle = options.layout === "diagonal" ? (Math.atan2(visual.height, visual.width) * 180) / Math.PI : 0;
      const span = options.layout === "diagonal" ? Math.hypot(visual.width, visual.height) : visual.width;
      const size = Math.min((span * WATERMARK_SPAN[options.size] * 10) / unitWidth, short * 0.4);
      const stamp = await stamper.stamp(text, size, options.color);
      stamp.draw(page, placeBox(visual, stamp.width, stamp.height, visual.width / 2, visual.height / 2, angle), opacity);
    }
    onProgress?.((done + 1) / targets.length);
  }
  return save(doc);
}
