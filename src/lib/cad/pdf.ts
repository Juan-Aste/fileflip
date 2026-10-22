// A parsed DXF drawing → a one-page vector PDF with pdf-lib: the page (A4 or
// A3) turns to match the drawing, which is fitted inside a 10 mm margin.
// PDF space goes up like DXF, so no flip is needed. Text Helvetica can't
// encode (Chinese, Cyrillic...) is drawn as a PNG rendered by the caller,
// as the PDF stamp tools do.
import {
  closePath,
  degrees,
  fillAndStroke,
  LineCapStyle,
  LineJoinStyle,
  lineTo,
  moveTo,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFillingRgbColor,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingRgbColor,
  StandardFonts,
  stroke,
  type PDFOperator,
} from "pdf-lib";
import type { RenderText } from "@/lib/pdf/stamp";
import type { Drawing } from "./dxf";
import { DXF_PDF_MARGIN, dxfPages, type DxfPage } from "./options";

export interface PdfOptions {
  page: DxfPage;
  title: string;
  /** Draws text Helvetica can't encode; without it such characters become "?". */
  renderText?: RenderText;
}

/** Helvetica's cap height, as a share of the font size. */
const HELVETICA_CAP = 0.718;
/** Line width in points (a fine pen). */
const LINE = 0.35;

const channels = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];

export async function drawingToPdf(drawing: Drawing, options: PdfOptions): Promise<{ data: Uint8Array; scale: number }> {
  const [minX, minY, maxX, maxY] = drawing.bounds;
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const [short, long] = dxfPages[options.page];
  const [pw, ph] = w >= h ? [long, short] : [short, long];
  const s = Math.min((pw - 2 * DXF_PDF_MARGIN) / w, (ph - 2 * DXF_PDF_MARGIN) / h);
  const ox = (pw - w * s) / 2;
  const oy = (ph - h * s) / 2;
  const X = (x: number) => ox + (x - minX) * s;
  const Y = (y: number) => oy + (y - minY) * s;

  const doc = await PDFDocument.create();
  doc.setTitle(options.title);
  doc.setCreator("Fileflect");
  doc.setProducer("Fileflect (pdf-lib)");
  const page = doc.addPage([pw, ph]);
  const ops: PDFOperator[] = [pushGraphicsState(), setLineWidth(LINE), setLineCap(LineCapStyle.Round), setLineJoin(LineJoinStyle.Round)];
  let current = "";
  for (const path of drawing.paths) {
    if (path.color !== current) {
      ops.push(setStrokingRgbColor(...channels(path.color)), setFillingRgbColor(...channels(path.color)));
      current = path.color;
    }
    if (path.points.length === 1) {
      // A point: a tiny square, filled.
      const [x, y] = path.points[0]!;
      const r = LINE;
      ops.push(moveTo(X(x) - r, Y(y) - r), lineTo(X(x) + r, Y(y) - r), lineTo(X(x) + r, Y(y) + r), lineTo(X(x) - r, Y(y) + r), closePath(), fillAndStroke());
      continue;
    }
    path.points.forEach(([x, y], i) => ops.push(i ? lineTo(X(x), Y(y)) : moveTo(X(x), Y(y))));
    if (path.closed) ops.push(closePath());
    ops.push(path.fill ? fillAndStroke() : stroke());
  }
  ops.push(popGraphicsState());
  page.pushOperators(...ops);

  if (drawing.texts.length) {
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const encodable = (text: string) => {
      try {
        font.encodeText(text);
        return true;
      } catch {
        return false;
      }
    };
    const images = new Map<string, Promise<{ image: Awaited<ReturnType<PDFDocument["embedPng"]>>; width: number; height: number }>>();
    for (const t of drawing.texts) {
      const size = (t.height * s) / HELVETICA_CAP;
      if (size < 0.5) continue;
      const color = channels(t.color);
      const useImage = !encodable(t.text) && !!options.renderText;
      const text = useImage || encodable(t.text) ? t.text : [...t.text].map((c) => (encodable(c) ? c : "?")).join("");
      let width: number;
      let draw: (x: number, y: number) => void;
      const rotate = degrees((t.rotation * 180) / Math.PI);
      if (useImage) {
        const key = `${size}|${t.color}|${text}`;
        let cached = images.get(key);
        if (!cached) {
          cached = options.renderText!(text, size, color).then(async (r) => ({ image: await doc.embedPng(r.png), width: r.width, height: r.height }));
          images.set(key, cached);
        }
        const img = await cached;
        width = img.width;
        // The rendered box goes from the descender to the ascender: put its baseline (~22 % up) on the text's.
        draw = (x, y) => page.drawImage(img.image, { x: x - 0.22 * img.height * -Math.sin(t.rotation), y: y - 0.22 * img.height * Math.cos(t.rotation), width: img.width, height: img.height, rotate });
      } else {
        width = font.widthOfTextAtSize(text, size);
        draw = (x, y) => page.drawText(text, { x, y, size, font, color: rgb(...color), rotate });
      }
      // Offsets along the text's own axes, then turned with it.
      const dx = t.align === "start" ? 0 : t.align === "middle" ? -width / 2 : -width;
      const cap = size * HELVETICA_CAP;
      const dy = t.baseline === "alphabetic" ? 0 : t.baseline === "middle" ? -cap / 2 : -cap;
      const cos = Math.cos(t.rotation);
      const sin = Math.sin(t.rotation);
      draw(X(t.x) + dx * cos - dy * sin, Y(t.y) + dx * sin + dy * cos);
    }
  }
  return { data: await doc.save(), scale: s };
}
