// DXF drawings → a flat list of 2D shapes (polylines and texts in drawing
// units), which the SVG/PNG/PDF writers draw. dxf-parser (MIT) reads the
// file; the geometry (arcs, bulges, ellipses, splines, nested blocks, colors)
// is ours. Only model space is drawn; entities we can't draw are counted so
// the page can say which ones were left out.
import DxfParser from "dxf-parser";
import type { IDxf, IEntity, IPoint } from "dxf-parser";
import type DxfArrayScanner from "dxf-parser/dist/DxfArrayScanner";
import type { IGroup } from "dxf-parser/dist/DxfArrayScanner";
import { checkCommonEntityProperties, parsePoint } from "dxf-parser/dist/ParseHelpers";
import { ConversionError } from "@/lib/convert-error";
import { MAX_DXF_POINTS, MAX_DXF_BLOCK_DEPTH, MAX_DXF_ARRAY } from "./options";

export interface DrawPath {
  /** Flattened points, in drawing units (Y up). */
  points: [number, number][];
  closed: boolean;
  /** Filled (SOLID) instead of stroked. */
  fill: boolean;
  /** "#rrggbb". */
  color: string;
}

export interface DrawText {
  x: number;
  y: number;
  /** Cap height, in drawing units. */
  height: number;
  /** Counter-clockwise, in radians. */
  rotation: number;
  text: string;
  color: string;
  align: "start" | "middle" | "end";
  baseline: "alphabetic" | "middle" | "hanging";
}

export interface Drawing {
  paths: DrawPath[];
  texts: DrawText[];
  /** [minX, minY, maxX, maxY] of everything drawn. */
  bounds: [number, number, number, number];
  /** Drawing units from $INSUNITS, when the file says. */
  units: "mm" | "cm" | "m" | "in" | "ft" | null;
  /** Entity types left out (not supported), with how many of each. */
  skipped: Record<string, number>;
}

/** 2D affine transform: (x, y) → (a·x + c·y + e, b·x + d·y + f). */
type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const multiply = ([a1, b1, c1, d1, e1, f1]: Matrix, [a2, b2, c2, d2, e2, f2]: Matrix): Matrix => [
  a1 * a2 + c1 * b2,
  b1 * a2 + d1 * b2,
  a1 * c2 + c1 * d2,
  b1 * c2 + d1 * d2,
  a1 * e2 + c1 * f2 + e1,
  b1 * e2 + d1 * f2 + f1,
];
const apply = ([a, b, c, d, e, f]: Matrix, x: number, y: number): [number, number] => [a * x + c * y + e, b * x + d * y + f];
const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
const rotate = (r: number): Matrix => [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
const scale = (x: number, y: number): Matrix => [x, 0, 0, y, 0, 0];
/** Entities whose extrusion points down (−Z) are mirrored on X in their own coordinate system. */
const ocs = (z: number | undefined): Matrix => (z !== undefined && z < 0 ? scale(-1, 1) : IDENTITY);

// Entity types dxf-parser reads and we draw; ATTDEF (attribute templates inside blocks) isn't drawn on purpose.
const DRAWN = new Set(["LINE", "LWPOLYLINE", "POLYLINE", "CIRCLE", "ARC", "ELLIPSE", "SPLINE", "SOLID", "3DFACE", "POINT", "TEXT", "MTEXT", "INSERT", "DIMENSION"]);
const NOT_ENTITIES = new Set(["SECTION", "ENDSEC", "BLOCK", "ENDBLK", "SEQEND", "VERTEX", "ATTDEF", "VIEWPORT", "EOF"]);

const UNITS: Record<number, Drawing["units"]> = { 1: "in", 2: "ft", 4: "mm", 5: "cm", 6: "m" };

/** AutoCAD color index 7 is "white on black, black on white": we draw on white. */
const hex = (rgb: number) => (rgb === 0xffffff ? "#000000" : `#${rgb.toString(16).padStart(6, "0")}`);

/** Entity types in the ENTITIES and BLOCKS sections (paper space blocks aside) that we don't draw. */
export function skippedEntities(text: string): Record<string, number> {
  const lines = text.split(/\r\n|\r|\n/);
  const skipped: Record<string, number> = {};
  let section = "";
  let paperBlock = false;
  for (let i = 0; i + 1 < lines.length; i += 2) {
    if (lines[i]!.trim() !== "0") continue;
    const value = lines[i + 1]!.trim();
    if (value === "SECTION") section = lines[i + 3]?.trim() ?? "";
    else if (value === "BLOCK") {
      // The block's name (group 2) follows within its header.
      for (let j = i + 2; j + 1 < lines.length && lines[j]!.trim() !== "0"; j += 2) {
        if (lines[j]!.trim() === "2") paperBlock = /^\*paper_space/i.test(lines[j + 1]!.trim());
      }
    } else if (value === "ENDBLK") paperBlock = false;
    else if ((section === "ENTITIES" || (section === "BLOCKS" && !paperBlock)) && !DRAWN.has(value) && !NOT_ENTITIES.has(value) && /^[A-Z0-9_]+$/.test(value)) {
      skipped[value] = (skipped[value] ?? 0) + 1;
    }
  }
  return skipped;
}

/** MTEXT/TEXT codes → plain lines: paragraphs, formatting groups, special characters and \U+XXXX escapes. */
export function plainText(raw: string): string {
  // Escaped "\\", "\{" and "\}" are set aside first so the formatting codes around them can go.
  const kept = ["\\", "{", "}"];
  return raw
    .replace(/\\([\\{}])/g, (_, c: string) => String.fromCharCode(0xe000 + kept.indexOf(c)))
    .replace(/\\U\+([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/%%[cC]/g, "Ø")
    .replace(/%%[dD]/g, "°")
    .replace(/%%[pP]/g, "±")
    .replace(/%%[uUoOkK]/g, "")
    .replace(/%%%/g, "%")
    .replace(/\\P/g, "\n")
    .replace(/\\~/g, "\u00a0")
    .replace(/\\S([^;]*?)[#^/]([^;]*?);/g, "$1/$2")
    .replace(/\\[ACFHQTWfcp][^;\\{}]*;/g, "")
    .replace(/\\[LlOoKkNX]/g, "")
    .replace(/[{}]/g, "")
    .replace(/[\ue000-\ue002]/g, (c) => kept[c.charCodeAt(0) - 0xe000]!);
}

/** dxf-parser's CIRCLE handler drops the extrusion direction (210/220/230), which mirrors circles drawn from below. */
class CircleWithExtrusion {
  ForEntityName = "CIRCLE" as const;
  parseEntity(scanner: DxfArrayScanner, curr: IGroup): IEntity {
    const entity = { type: curr.value } as IEntity & Record<string, unknown>;
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) break;
      if (curr.code === 10) entity.center = parsePoint(scanner);
      else if (curr.code === 40) entity.radius = curr.value as number;
      else if (curr.code === 230) entity.extrusionDirectionZ = curr.value as number;
      else if (curr.code !== 210 && curr.code !== 220) checkCommonEntityProperties(entity, curr, scanner);
      curr = scanner.next();
    }
    return entity;
  }
}

interface Context {
  matrix: Matrix;
  /** Color for BYBLOCK entities (from the INSERT that placed them). */
  blockColor: string;
  depth: number;
  /** Blocks being expanded (a block that inserts itself would never end). */
  stack: string[];
}

export function parseDxf(text: string): Drawing {
  if (text.startsWith("AutoCAD Binary DXF")) throw new ConversionError("unsupportedFormat");
  if (!/^\s*0\s*\r?\n\s*SECTION/.test(text.slice(0, 4096)) && !/\n\s*0\s*\r?\n\s*SECTION/.test(text.slice(0, 64 * 1024))) {
    throw new ConversionError("unsupportedFormat");
  }
  // Every DXF ends with "0 / EOF": without it the file was cut, and dxf-parser would quietly draw part of it.
  if (!/\n\s*0\s*\r?\n\s*EOF\s*$/.test(text.slice(-64))) throw new ConversionError("fileDamaged");
  let dxf: IDxf | null;
  try {
    const parser = new DxfParser();
    parser.registerEntityHandler(CircleWithExtrusion);
    dxf = parser.parseSync(text);
  } catch {
    throw new ConversionError("fileDamaged");
  }
  if (!dxf || !Array.isArray(dxf.entities)) throw new ConversionError("fileDamaged");

  const layers = dxf.tables?.layer?.layers ?? {};
  const blocks = dxf.blocks ?? {};
  const paths: DrawPath[] = [];
  const texts: DrawText[] = [];
  let points = 0;

  const hidden = (e: IEntity) => {
    if (e.visible === false || e.inPaperSpace) return true;
    const layer = layers[e.layer];
    return !!layer && (layer.visible === false || layer.frozen === true);
  };
  const colorOf = (e: IEntity, ctx: Context) => {
    if (e.colorIndex === 0) return ctx.blockColor;
    if (e.colorIndex !== 256 && typeof e.color === "number") return hex(e.color);
    const layer = layers[e.layer];
    return typeof layer?.color === "number" ? hex(layer.color) : "#000000";
  };
  const addPath = (local: [number, number][], closed: boolean, fill: boolean, color: string, m: Matrix) => {
    if (local.length < 1) return;
    points += local.length;
    if (points > MAX_DXF_POINTS) throw new ConversionError("dxfTooComplex");
    const out = local.map(([x, y]) => apply(m, x, y));
    if (out.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) return;
    paths.push({ points: out, closed, fill, color });
  };
  const angleOf = (m: Matrix) => Math.atan2(m[1], m[0]);
  const scaleOf = (m: Matrix) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

  const extraSkipped: Record<string, number> = {};
  const countSkipped = (type: string) => (extraSkipped[type] = (extraSkipped[type] ?? 0) + 1);
  const pushText = (value: string, x: number, y: number, height: number, rotation: number, color: string, align: DrawText["align"], baseline: DrawText["baseline"], m: Matrix) => {
    if (!value.trim()) return;
    const [tx, ty] = apply(m, x, y);
    texts.push({ x: tx, y: ty, height: height * scaleOf(m), rotation: rotation + angleOf(m), text: value, color, align, baseline });
  };

  const walk = (entities: IEntity[], ctx: Context) => {
    for (const entity of entities) {
      if (hidden(entity)) continue;
      const color = colorOf(entity, ctx);
      const e = entity as IEntity & Record<string, unknown>;
      const m = ctx.matrix;
      switch (entity.type) {
        case "LINE": {
          const v = e.vertices as IPoint[] | undefined;
          if (v?.length === 2) addPath(v.map((p) => [p.x, p.y]), false, false, color, m);
          break;
        }
        case "LWPOLYLINE":
        case "POLYLINE": {
          // 3D meshes and polyface meshes have no outline we could draw faithfully.
          if (e.isPolyfaceMesh || e.is3dPolygonMesh) {
            countSkipped(entity.type === "POLYLINE" ? "POLYLINE (mesh)" : entity.type);
            break;
          }
          const v = (e.vertices as (IPoint & { bulge?: number })[] | undefined) ?? [];
          const closed = !!e.shape;
          const pts = bulgedPolyline(v, closed);
          const z = (e.extrusionDirectionZ as number | undefined) ?? (e.extrusionDirection as IPoint | undefined)?.z;
          addPath(pts, closed, false, color, multiply(m, ocs(z)));
          break;
        }
        case "CIRCLE":
        case "ARC": {
          const c = e.center as IPoint | undefined;
          const r = e.radius as number | undefined;
          if (!c || !r || r <= 0) break;
          const full = entity.type === "CIRCLE";
          const start = full ? 0 : ((e.startAngle as number) ?? 0);
          let end = full ? Math.PI * 2 : ((e.endAngle as number) ?? 0);
          if (end <= start) end += Math.PI * 2;
          addPath(arcPoints(c.x, c.y, r, start, end), full, false, color, multiply(m, ocs(e.extrusionDirectionZ as number | undefined)));
          break;
        }
        case "ELLIPSE": {
          const c = e.center as IPoint | undefined;
          const major = e.majorAxisEndPoint as IPoint | undefined;
          const ratio = (e.axisRatio as number | undefined) ?? 1;
          if (!c || !major) break;
          const start = (e.startAngle as number | undefined) ?? 0;
          let end = (e.endAngle as number | undefined) ?? Math.PI * 2;
          if (end <= start) end += Math.PI * 2;
          const full = Math.abs(end - start - Math.PI * 2) < 1e-6;
          addPath(ellipsePoints(c, major, ratio, start, end), full, false, color, m);
          break;
        }
        case "SPLINE": {
          const pts = splinePoints(e);
          if (pts.length >= 2) addPath(pts, !!e.closed, false, color, m);
          break;
        }
        case "SOLID": {
          // A SOLID lists its corners as 1, 2, 4, 3 (a "Z"); a triangle repeats the last one.
          const p = (e.points as IPoint[] | undefined) ?? [];
          if (p.length < 3) break;
          const corners = (p.length === 4 ? [p[0]!, p[1]!, p[3]!, p[2]!] : p).map((q): [number, number] => [q.x, q.y]);
          addPath(corners, true, true, color, multiply(m, ocs((e.extrusionDirection as IPoint | undefined)?.z)));
          break;
        }
        case "3DFACE": {
          const v = (e.vertices as IPoint[] | undefined) ?? [];
          if (v.length >= 3) addPath(v.map((q) => [q.x, q.y]), true, false, color, m);
          break;
        }
        case "POINT": {
          const p = e.position as IPoint | undefined;
          if (p) addPath([[p.x, p.y]], false, false, color, m);
          break;
        }
        case "TEXT": {
          const raw = e.text as string | undefined;
          const height = (e.textHeight as number | undefined) ?? 0;
          if (!raw || height <= 0) break;
          const halign = (e.halign as number | undefined) ?? 0;
          const valign = (e.valign as number | undefined) ?? 0;
          // Aligned text is placed by its second point, unless it's plain "left, baseline".
          const anchor = ((halign || valign) && (e.endPoint as IPoint | undefined)) || (e.startPoint as IPoint | undefined);
          if (!anchor) break;
          const align = halign === 1 || halign === 4 ? "middle" : halign === 2 ? "end" : "start";
          const baseline = halign === 4 || valign === 2 ? "middle" : valign === 3 ? "hanging" : "alphabetic";
          pushText(plainText(raw), anchor.x, anchor.y, height, (((e.rotation as number | undefined) ?? 0) * Math.PI) / 180, color, align, baseline, m);
          break;
        }
        case "MTEXT": {
          const raw = e.text as string | undefined;
          const p = e.position as IPoint | undefined;
          const height = (e.height as number | undefined) ?? 0;
          if (!raw || !p || height <= 0) break;
          const dir = e.directionVector as IPoint | undefined;
          const rotation = dir ? Math.atan2(dir.y, dir.x) : (((e.rotation as number | undefined) ?? 0) * Math.PI) / 180;
          // Attachment 1–9: top/middle/bottom × left/center/right.
          const attach = (e.attachmentPoint as number | undefined) ?? 1;
          const align = (["start", "middle", "end"] as const)[(attach - 1) % 3]!;
          const row = Math.floor((attach - 1) / 3);
          const lines = plainText(raw).split("\n");
          const step = height * 1.6;
          // First line's offset below the anchor so the block hangs from, centers on or sits on it.
          const first = row === 0 ? 0 : row === 1 ? ((lines.length - 1) * step) / 2 : (lines.length - 1) * step;
          lines.forEach((line, i) => {
            const dy = first - i * step;
            const [x, y] = apply(multiply(translate(p.x, p.y), rotate(rotation)), 0, dy);
            pushText(line, x, y, height, rotation, color, align, row === 0 ? "hanging" : row === 1 ? "middle" : "alphabetic", m);
          });
          break;
        }
        case "INSERT": {
          const block = blocks[e.name as string];
          if (!block?.entities?.length) break;
          if (ctx.depth >= MAX_DXF_BLOCK_DEPTH || ctx.stack.includes(block.name)) throw new ConversionError("dxfTooComplex");
          const pos = (e.position as IPoint | undefined) ?? { x: 0, y: 0, z: 0 };
          const base = block.position ?? { x: 0, y: 0, z: 0 };
          const cols = Math.max(1, (e.columnCount as number | undefined) ?? 1);
          const rows = Math.max(1, (e.rowCount as number | undefined) ?? 1);
          if (cols * rows > MAX_DXF_ARRAY) throw new ConversionError("dxfTooComplex");
          const rotation = (((e.rotation as number | undefined) ?? 0) * Math.PI) / 180;
          const shape = multiply(multiply(rotate(rotation), scale((e.xScale as number | undefined) ?? 1, (e.yScale as number | undefined) ?? 1)), translate(-base.x, -base.y));
          const mirror = ocs((e.extrusionDirection as IPoint | undefined)?.z);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              // Array copies are spaced along the block's rotated axes (spacing isn't scaled).
              const [ox, oy] = apply(rotate(rotation), c * ((e.columnSpacing as number | undefined) ?? 0), r * ((e.rowSpacing as number | undefined) ?? 0));
              const placed = multiply(mirror, multiply(translate(pos.x + ox, pos.y + oy), shape));
              walk(block.entities, { matrix: multiply(m, placed), blockColor: color, depth: ctx.depth + 1, stack: [...ctx.stack, block.name] });
            }
          }
          break;
        }
        case "DIMENSION": {
          // A dimension's look (lines, arrows, text) is stored as an anonymous block in world coordinates.
          const block = blocks[e.block as string];
          if (block?.entities?.length && ctx.depth < MAX_DXF_BLOCK_DEPTH && !ctx.stack.includes(block.name)) {
            walk(block.entities, { matrix: m, blockColor: color, depth: ctx.depth + 1, stack: [...ctx.stack, block.name] });
          }
          break;
        }
        default:
          break;
      }
    }
  };


  walk(dxf.entities, { matrix: IDENTITY, blockColor: "#000000", depth: 0, stack: [] });

  const bounds = drawingBounds(paths, texts);
  if (!bounds) throw new ConversionError("dxfEmpty");
  const skipped = skippedEntities(text);
  for (const [type, n] of Object.entries(extraSkipped)) skipped[type] = (skipped[type] ?? 0) + n;
  const units = UNITS[(dxf.header?.["$INSUNITS"] as number | undefined) ?? 0] ?? null;
  return { paths, texts, bounds, units, skipped };
}

/** Box of all points and an estimate of each text's extent (0.6 × height per character). */
function drawingBounds(paths: DrawPath[], texts: DrawText[]): Drawing["bounds"] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const p of paths) for (const [x, y] of p.points) add(x, y);
  for (const t of texts) {
    const width = Math.max(...t.text.split("\n").map((l) => l.length)) * t.height * 0.6;
    const start = t.align === "start" ? 0 : t.align === "middle" ? -width / 2 : -width;
    const bottom = t.baseline === "alphabetic" ? 0 : t.baseline === "middle" ? -t.height / 2 : -t.height;
    for (const [dx, dy] of [[start, bottom], [start + width, bottom], [start, bottom + t.height], [start + width, bottom + t.height]] as const) {
      add(t.x + dx * Math.cos(t.rotation) - dy * Math.sin(t.rotation), t.y + dx * Math.sin(t.rotation) + dy * Math.cos(t.rotation));
    }
  }
  if (!Number.isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}

/** Segments for an arc: about one every 3.75° (96 per full turn), at least 4. */
const segmentsFor = (sweep: number) => Math.max(4, Math.ceil((Math.abs(sweep) / (Math.PI * 2)) * 96));

export function arcPoints(cx: number, cy: number, r: number, start: number, end: number): [number, number][] {
  const n = segmentsFor(end - start);
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = start + ((end - start) * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

function ellipsePoints(c: IPoint, major: IPoint, ratio: number, start: number, end: number): [number, number][] {
  const n = segmentsFor(end - start);
  const minor = [-major.y * ratio, major.x * ratio];
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = start + ((end - start) * i) / n;
    return [c.x + major.x * Math.cos(t) + minor[0]! * Math.sin(t), c.y + major.y * Math.cos(t) + minor[1]! * Math.sin(t)];
  });
}

/**
 * Polyline vertices with bulges (the tangent of a quarter of each segment's
 * arc angle; positive = counter-clockwise) → points, arcs flattened.
 */
export function bulgedPolyline(vertices: (IPoint & { bulge?: number })[], closed: boolean): [number, number][] {
  const out: [number, number][] = [];
  const count = closed ? vertices.length : vertices.length - 1;
  if (vertices.length === 1) return [[vertices[0]!.x, vertices[0]!.y]];
  for (let i = 0; i < count; i++) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % vertices.length]!;
    if (i === 0) out.push([a.x, a.y]);
    const bulge = a.bulge ?? 0;
    const chord = Math.hypot(b.x - a.x, b.y - a.y);
    if (!bulge || chord === 0) {
      out.push([b.x, b.y]);
      continue;
    }
    const theta = 4 * Math.atan(bulge);
    const r = chord / (2 * Math.sin(theta / 2));
    // Center: from the chord's midpoint, along its normal, at r·cos(θ/2).
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const h = r * Math.cos(theta / 2);
    const nx = -(b.y - a.y) / chord;
    const ny = (b.x - a.x) / chord;
    const cx = mx + nx * h;
    const cy = my + ny * h;
    const start = Math.atan2(a.y - cy, a.x - cx);
    const pts = arcPoints(cx, cy, Math.abs(r), start, start + theta);
    out.push(...pts.slice(1, -1), [b.x, b.y]);
  }
  if (closed && out.length > 1) out.pop();
  return out;
}

/** A B-spline from its control points and knots (de Boor), or the fit points when there are no control points. */
export function splinePoints(e: Record<string, unknown>): [number, number][] {
  const control = (e.controlPoints as IPoint[] | undefined) ?? [];
  const knots = (e.knotValues as number[] | undefined) ?? [];
  const degree = (e.degreeOfSplineCurve as number | undefined) ?? 3;
  if (control.length >= 2 && knots.length === control.length + degree + 1 && degree >= 1) {
    const lo = knots[degree]!;
    const hi = knots[control.length]!;
    const n = Math.min(2000, Math.max(32, control.length * 12));
    return Array.from({ length: n + 1 }, (_, i) => deBoor(degree, control, knots, lo + ((hi - lo) * i) / n));
  }
  const fit = (e.fitPoints as IPoint[] | undefined) ?? [];
  return (fit.length >= 2 ? fit : control).map((p) => [p.x, p.y]);
}

function deBoor(p: number, control: IPoint[], knots: number[], t: number): [number, number] {
  let k = p;
  while (k < control.length - 1 && t >= knots[k + 1]!) k++;
  const d = Array.from({ length: p + 1 }, (_, j) => [control[j + k - p]!.x, control[j + k - p]!.y]);
  for (let r = 1; r <= p; r++) {
    for (let j = p; j >= r; j--) {
      const i = j + k - p;
      const span = knots[i + p - r + 1]! - knots[i]!;
      const alpha = span === 0 ? 0 : (t - knots[i]!) / span;
      d[j] = [(1 - alpha) * d[j - 1]![0]! + alpha * d[j]![0]!, (1 - alpha) * d[j - 1]![1]! + alpha * d[j]![1]!];
    }
  }
  return [d[p]![0]!, d[p]![1]!];
}
