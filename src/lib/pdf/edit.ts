// "Edit PDF": text, highlights, freehand ink, shapes, white boxes and images
// drawn onto the pages with pdf-lib. Positions are in points on the page as
// the reader sees it (origin top-left, also on pages with /Rotate), the same
// units pdf.js uses for a viewport at scale 1. Everything is written into the
// page content (not as annotations), so every viewer shows and prints it.
// A white box only covers: the text below is still in the file. Pages that
// must really hide something are rasterized (`rasterizePages`).
import {
  BlendMode,
  degrees,
  concatTransformationMatrix,
  LineCapStyle,
  PDFDocument,
  PDFName,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { ConversionError } from "@/lib/convert-error";
import { visualPage, type RenderText } from "./stamp";

export type Rgb = [number, number, number];
export type EditFont = "helvetica" | "helvetica-bold" | "times" | "courier";

interface Base {
  /** 0-based page. */
  page: number;
}
export interface TextItem extends Base {
  kind: "text";
  /** Top-left corner of the first line. */
  x: number;
  y: number;
  text: string;
  font: EditFont;
  /** Font size in points. */
  size: number;
  color: Rgb;
}
export interface BoxItem extends Base {
  kind: "highlight" | "whiteout";
  x: number;
  y: number;
  width: number;
  height: number;
  color: Rgb;
  /** White box only: the editor rasterizes its page afterwards so the text below is really gone. */
  redact?: boolean;
}
export interface InkItem extends Base {
  kind: "ink";
  /** x, y pairs. */
  points: number[];
  color: Rgb;
  /** Stroke width in points. */
  width: number;
}
export interface ShapeItem extends Base {
  kind: "rect" | "line" | "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: Rgb;
  width: number;
}
export interface ImageItem extends Base {
  kind: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  /** PNG or JPEG bytes. */
  data: Uint8Array;
}
export type EditItem = TextItem | BoxItem | InkItem | ShapeItem | ImageItem;

/** Height of the capitals and ascenders above the baseline, per point of size (the fonts' ascent). */
export const ASCENT: Record<EditFont, number> = { helvetica: 0.718, "helvetica-bold": 0.718, times: 0.683, courier: 0.629 };
/** Line height as a multiple of the font size (the editor draws text the same way). */
export const LINE_HEIGHT = 1.2;
export const MAX_EDIT_ITEMS = 2000;
export const MAX_TEXT_LENGTH = 5000;
/** Highlights are see-through and multiply: the text below stays readable. */
export const HIGHLIGHT_OPACITY = 0.4;

const STANDARD: Record<EditFont, StandardFonts> = {
  helvetica: StandardFonts.Helvetica,
  "helvetica-bold": StandardFonts.HelveticaBold,
  times: StandardFonts.TimesRoman,
  courier: StandardFonts.Courier,
};

/** Arrow head: length and half-width as multiples of the stroke width (with a minimum). */
export function arrowHead(x1: number, y1: number, x2: number, y2: number, width: number) {
  const length = Math.max(8, width * 4);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;
  return [
    [x2 - length * Math.cos(angle - spread), y2 - length * Math.sin(angle - spread)],
    [x2 - length * Math.cos(angle + spread), y2 - length * Math.sin(angle + spread)],
  ] as const;
}

/** SVG path (top-left origin) of a shape or ink stroke; the editor draws the same path. */
export function strokePath(item: InkItem | ShapeItem): string {
  const n = (v: number) => Math.round(v * 100) / 100;
  if (item.kind === "ink") {
    const p = item.points;
    if (p.length < 2) return "";
    let d = `M ${n(p[0]!)} ${n(p[1]!)}`;
    // A single tap draws a dot.
    if (p.length === 2) return `${d} L ${n(p[0]! + 0.01)} ${n(p[1]!)}`;
    for (let i = 2; i < p.length; i += 2) d += ` L ${n(p[i]!)} ${n(p[i + 1]!)}`;
    return d;
  }
  const { x1, y1, x2, y2 } = item;
  if (item.kind === "rect") return `M ${n(x1)} ${n(y1)} L ${n(x2)} ${n(y1)} L ${n(x2)} ${n(y2)} L ${n(x1)} ${n(y2)} Z`;
  const line = `M ${n(x1)} ${n(y1)} L ${n(x2)} ${n(y2)}`;
  if (item.kind === "line") return line;
  const [a, b] = arrowHead(x1, y1, x2, y2, item.width);
  return `${line} M ${n(a[0])} ${n(a[1])} L ${n(x2)} ${n(y2)} L ${n(b[0])} ${n(b[1])}`;
}

async function load(bytes: Uint8Array) {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new ConversionError("fileDamaged");
  }
}

/** Draws in the reader's view: origin bottom-left of the visible page, y up. */
function inVisualSpace(page: PDFPage, draw: (height: number) => void) {
  const { rotation, box, height } = visualPage(page);
  const { x, y, width: w, height: h } = box;
  const matrix: Record<typeof rotation, [number, number, number, number, number, number]> = {
    0: [1, 0, 0, 1, x, y],
    90: [0, 1, -1, 0, x + w, y],
    180: [-1, 0, 0, -1, x + w, y + h],
    270: [0, -1, 1, 0, x, y + h],
  };
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...matrix[rotation]));
  draw(height);
  page.pushOperators(popGraphicsState());
}

class Fonts {
  private fonts = new Map<EditFont, Promise<PDFFont>>();
  constructor(private doc: PDFDocument) {}
  get(font: EditFont) {
    let f = this.fonts.get(font);
    if (!f) {
      f = this.doc.embedFont(STANDARD[font] ?? StandardFonts.Helvetica);
      this.fonts.set(font, f);
    }
    return f;
  }
}

const encodable = (font: PDFFont, text: string) => {
  try {
    font.encodeText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Draws the items onto the pages. Text the standard fonts can't encode
 * (Chinese, emoji...) is drawn as an image rendered by `renderFor(font)`.
 */
export async function applyEdits(bytes: Uint8Array, items: readonly EditItem[], renderFor?: (font: EditFont) => RenderText): Promise<Uint8Array> {
  if (items.length === 0 || items.length > MAX_EDIT_ITEMS) throw new ConversionError("invalidRequest");
  const doc = await load(bytes);
  try {
    const pages = doc.getPages();
    const fonts = new Fonts(doc);
    for (const item of items) {
      const page = pages[item.page];
      if (!page) throw new ConversionError("pagesOutOfRange");
      // Embedding is async: done before entering the page's graphics state.
      let draw: (height: number) => void;
      switch (item.kind) {
        case "text": {
          const font = await fonts.get(item.font);
          const size = Math.min(Math.max(item.size, 2), 400);
          const ascent = size * (ASCENT[item.font] ?? ASCENT.helvetica);
          const lines = item.text.slice(0, MAX_TEXT_LENGTH).split(/\r\n|\r|\n/);
          const parts: ((height: number) => void)[] = [];
          for (const [i, line] of lines.entries()) {
            if (!line.trim()) continue;
            const top = item.y + i * size * LINE_HEIGHT;
            if (encodable(font, line)) {
              parts.push((h) => page.drawText(line, { x: item.x, y: h - top - ascent, size, font, color: rgb(...item.color) }));
            } else {
              if (!renderFor) throw new ConversionError("invalidRequest");
              const png = await renderFor(item.font)(line, size, item.color);
              const image = await doc.embedPng(png.png);
              // The rendered box is the line box: top aligned with the line's top.
              parts.push((h) => page.drawImage(image, { x: item.x, y: h - top - png.height, width: png.width, height: png.height }));
            }
          }
          draw = (h) => parts.forEach((p) => p(h));
          break;
        }
        case "highlight":
        case "whiteout": {
          const color = item.kind === "whiteout" ? rgb(1, 1, 1) : rgb(...item.color);
          const highlight = item.kind === "highlight";
          draw = (h) =>
            page.drawRectangle({
              x: item.x,
              y: h - item.y - item.height,
              width: item.width,
              height: item.height,
              color,
              ...(highlight && { opacity: HIGHLIGHT_OPACITY, blendMode: BlendMode.Multiply }),
            });
          break;
        }
        case "ink":
        case "rect":
        case "line":
        case "arrow": {
          const path = strokePath(item);
          if (!path) continue;
          // drawSvgPath flips y around its origin: at (0, height) SVG coordinates are the reader's view.
          draw = (h) =>
            page.drawSvgPath(path, {
              x: 0,
              y: h,
              borderColor: rgb(...item.color),
              borderWidth: Math.min(Math.max(item.width, 0.25), 100),
              borderLineCap: LineCapStyle.Round,
            });
          break;
        }
        case "image": {
          const png = item.data[0] === 0x89 && item.data[1] === 0x50;
          let image;
          try {
            image = png ? await doc.embedPng(item.data) : await doc.embedJpg(item.data);
          } catch {
            throw new ConversionError("fileDamaged");
          }
          draw = (h) => page.drawImage(image, { x: item.x, y: h - item.y - item.height, width: item.width, height: item.height });
          break;
        }
      }
      inVisualSpace(page, draw);
    }
    doc.setProducer("Fileflect");
    return await doc.save({ useObjectStreams: true });
  } catch (error) {
    throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
  }
}

/**
 * Replaces pages by a picture of themselves (JPEG of the page as seen), so
 * nothing below a white box survives: no text, no annotations, no hidden
 * layers. The page object is kept (bookmarks and links to it still work).
 */
export async function rasterizePages(bytes: Uint8Array, pages: readonly { index: number; jpeg: Uint8Array }[]): Promise<Uint8Array> {
  const doc = await load(bytes);
  try {
    const all = doc.getPages();
    for (const { index, jpeg } of pages) {
      const page = all[index];
      if (!page) throw new ConversionError("pagesOutOfRange");
      const { width, height } = visualPage(page);
      const image = await doc.embedJpg(jpeg);
      const node = page.node;
      for (const key of ["Annots", "BleedBox", "TrimBox", "ArtBox", "Group", "Thumb", "PieceInfo", "StructParents"]) node.delete(PDFName.of(key));
      node.set(PDFName.of("Resources"), doc.context.obj({}));
      node.set(PDFName.of("Contents"), doc.context.obj([]));
      page.setRotation(degrees(0));
      page.setMediaBox(0, 0, width, height);
      page.setCropBox(0, 0, width, height);
      page.drawImage(image, { x: 0, y: 0, width, height });
    }
    doc.setProducer("Fileflect");
    return await doc.save({ useObjectStreams: true });
  } catch (error) {
    throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
  }
}
