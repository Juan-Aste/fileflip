// Tables from PDFs that have text (pdf.js text content): runs are grouped into
// lines by baseline, lines into cells by the horizontal gaps between runs,
// consecutive lines with two or more cells into a table, and cells into
// columns by where the fullest rows put them. A scanned page has no text:
// that needs OCR first.
import { ConversionError } from "@/lib/convert-error";

export interface TextRun {
  str: string;
  /** Left edge and baseline, in PDF points (y from the bottom of the page). */
  x: number;
  y: number;
  width: number;
  /** Font size in points. */
  size: number;
}

export type TableValue = string | number | null;

export interface PdfTable {
  /** 1-based page number. */
  page: number;
  rows: TableValue[][];
  /** False when the page had text but no table: its lines, one row each, split where they have wide gaps. */
  detected: boolean;
}

export interface TableOptions {
  /** Decimal separator of the numbers: guessed per table by default. */
  decimal?: "auto" | "," | ".";
}

interface Cell {
  x0: number;
  x1: number;
  text: string;
}

interface Line {
  y: number;
  size: number;
  cells: Cell[];
}

/** pdf.js text items as runs (upright text only; rotated runs are skipped). */
export function runsFromItems(items: readonly unknown[]): TextRun[] {
  const runs: TextRun[] = [];
  for (const raw of items) {
    const item = raw as { str?: string; transform?: number[]; width?: number; height?: number };
    if (typeof item.str !== "string" || !item.transform || !item.str.trim()) continue;
    const [a, b, , d, x, y] = item.transform as [number, number, number, number, number, number];
    if (Math.abs(b) > Math.abs(a) * 0.1) continue;
    runs.push({ str: item.str, x, y, width: item.width ?? 0, size: Math.abs(d) || item.height || 10 });
  }
  return runs;
}

/** A gap this wide (in font sizes) between runs on a line starts a new cell. */
const CELL_GAP = 0.9;

/** A run whose text has 3+ spaces inside ("Total    12,50") is split there, positions estimated by characters. */
function splitRun(run: TextRun): TextRun[] {
  const parts = run.str.split(/(\s{3,})/);
  if (parts.length === 1) return [run];
  const perChar = run.str.length ? run.width / run.str.length : 0;
  const out: TextRun[] = [];
  let offset = 0;
  for (const part of parts) {
    if (part.trim() && !/^\s+$/.test(part)) out.push({ ...run, str: part, x: run.x + offset * perChar, width: part.length * perChar });
    offset += part.length;
  }
  return out;
}

function toLines(runs: readonly TextRun[]): Line[] {
  const sorted = runs.flatMap(splitRun).sort((a, b) => b.y - a.y || a.x - b.x);
  const groups: { y: number; size: number; runs: TextRun[] }[] = [];
  for (const run of sorted) {
    const group = groups.find((g) => Math.abs(g.y - run.y) <= Math.max(2, Math.min(g.size, run.size) * 0.3));
    if (group) {
      group.runs.push(run);
      group.size = Math.max(group.size, run.size);
    } else groups.push({ y: run.y, size: run.size, runs: [run] });
  }
  return groups
    .sort((a, b) => b.y - a.y)
    .map(({ y, size, runs: lineRuns }) => {
      lineRuns.sort((a, b) => a.x - b.x);
      const cells: Cell[] = [];
      for (const run of lineRuns) {
        const last = cells.at(-1);
        const gap = last ? run.x - last.x1 : Infinity;
        if (last && gap < run.size * CELL_GAP) {
          // A small gap the PDF did not encode as a space is one.
          const space = gap > run.size * 0.15 && !last.text.endsWith(" ") && !run.str.startsWith(" ") ? " " : "";
          last.text += space + run.str;
          last.x1 = Math.max(last.x1, run.x + run.width);
        } else cells.push({ x0: run.x, x1: run.x + run.width, text: run.str });
      }
      for (const cell of cells) cell.text = cell.text.replace(/\s+/g, " ").trim();
      return { y, size, cells: cells.filter((c) => c.text) };
    })
    .filter((line) => line.cells.length > 0);
}

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};

/**
 * Splits the lines into table blocks: runs of lines with 2+ cells, keeping a
 * one-cell line between two of them (a row with only one column filled), and
 * breaking at an unusually large vertical gap.
 */
function tableBlocks(lines: Line[]): Line[][] {
  const gaps = lines.slice(1).map((l, i) => lines[i]!.y - l.y);
  const usual = median(gaps) || 14;
  const blocks: Line[][] = [];
  let current: Line[] = [];
  const flush = () => {
    // Trailing one-cell lines are text after the table.
    while (current.length && current.at(-1)!.cells.length < 2) current.pop();
    if (current.length >= 2) blocks.push(current);
    current = [];
  };
  lines.forEach((line, i) => {
    const gap = i > 0 ? lines[i - 1]!.y - line.y : 0;
    if (current.length && gap > Math.max(usual * 2.2, line.size * 3)) flush();
    if (line.cells.length >= 2) current.push(line);
    else if (current.length) {
      const next = lines[i + 1];
      if (next && next.cells.length >= 2 && line.y - next.y <= Math.max(usual * 2.2, line.size * 3)) current.push(line);
      else flush();
    }
  });
  flush();
  return blocks;
}

/** Column bands [x0, x1] from the rows with the most cells (merging cells that overlap horizontally). */
function columnBands(block: Line[]): [number, number][] {
  const most = Math.max(...block.map((l) => l.cells.length));
  const cells = block.filter((l) => l.cells.length === most).flatMap((l) => l.cells).sort((a, b) => a.x0 - b.x0);
  const bands: [number, number][] = [];
  for (const cell of cells) {
    const last = bands.at(-1);
    if (last && cell.x0 <= last[1] + 1) last[1] = Math.max(last[1], cell.x1);
    else bands.push([cell.x0, cell.x1]);
  }
  return bands;
}

/** The band a cell belongs to: the one it overlaps most, or the nearest. */
function bandOf(cell: Cell, bands: [number, number][]): number {
  let best = 0;
  let score = -Infinity;
  bands.forEach(([x0, x1], i) => {
    const overlap = Math.min(x1, cell.x1) - Math.max(x0, cell.x0);
    const s = overlap > 0 ? overlap : -Math.min(Math.abs(cell.x0 - x1), Math.abs(x0 - cell.x1));
    if (s > score) {
      score = s;
      best = i;
    }
  });
  return best;
}

function blockRows(block: Line[]): string[][] {
  const bands = columnBands(block);
  return block.map((line) => {
    const row: string[] = bands.map(() => "");
    for (const cell of line.cells) {
      const i = bandOf(cell, bands);
      row[i] = row[i] ? `${row[i]} ${cell.text}` : cell.text;
    }
    return row;
  });
}

const MINUS = "[-−]?";
// Unambiguous: a comma (or point) followed by other than exactly 3 digits, or both separators.
const COMMA_DECIMAL = new RegExp(`^${MINUS}(\\d+,(\\d{1,2}|\\d{4,})|\\d{1,3}([. \\u00a0\\u202f]\\d{3})+,\\d+)$`);
const POINT_DECIMAL = new RegExp(`^${MINUS}(\\d+\\.(\\d{1,2}|\\d{4,})|\\d{1,3}(,\\d{3})+\\.\\d+)$`);
const INTEGER = new RegExp(`^${MINUS}(0|[1-9]\\d{0,14})$`);

/** Which decimal separator a table's numbers use, from the cells that can only be read one way. */
function guessDecimal(rows: string[][]): "," | "." {
  let comma = 0;
  let point = 0;
  for (const row of rows) {
    for (const text of row) {
      if (COMMA_DECIMAL.test(text)) comma++;
      else if (POINT_DECIMAL.test(text)) point++;
    }
  }
  return comma > point ? "," : ".";
}

/** A cell as a number when it is one ("007", dates and amounts with symbols stay text). */
export function tableValue(text: string, decimal: "," | "."): TableValue {
  if (text === "") return null;
  const t = text.replace(/^−/, "-");
  const group = decimal === "," ? "[. \\u00a0\\u202f]" : ",";
  const sep = decimal === "," ? "," : "\\.";
  const number = new RegExp(`^-?(0|[1-9]\\d{0,2}(${group}\\d{3})+|[1-9]\\d*)(${sep}\\d+)?$|^-?0?${sep}\\d+$`);
  if (!INTEGER.test(t) && !number.test(t)) return text;
  const plain = t.replace(new RegExp(group, "g"), "").replace(decimal, ".");
  const n = Number(plain);
  // Excel keeps 15 significant digits: longer numbers (account numbers) stay text.
  return Number.isFinite(n) && plain.replace(/[-.]/g, "").replace(/^0+/, "").length <= 15 ? n : text;
}

function typed(rows: string[][], options: TableOptions): TableValue[][] {
  const decimal = !options.decimal || options.decimal === "auto" ? guessDecimal(rows) : options.decimal;
  return rows.map((row) => row.map((text) => tableValue(text, decimal)));
}

/** The tables of one page; a page with text but no table gives its lines instead (`detected: false`). */
export function pageTables(runs: readonly TextRun[], page: number, options: TableOptions = {}): PdfTable[] {
  const lines = toLines(runs);
  if (!lines.length) return [];
  const blocks = tableBlocks(lines);
  if (blocks.length) return blocks.map((block) => ({ page, rows: typed(blockRows(block), options), detected: true }));
  return [{ page, rows: typed(blockRows(lines), options), detected: false }];
}

interface DocLike {
  numPages: number;
  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }>; cleanup?: () => void }>;
}

/** Tables of every page in order; fails with `pdfIsScanned` when the PDF has no text at all. */
export async function extractPdfTables(
  doc: DocLike,
  { onProgress, signal, ...options }: TableOptions & { onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<PdfTable[]> {
  const tables: PdfTable[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    if (signal?.aborted) throw new ConversionError("jobCancelled");
    const page = await doc.getPage(n);
    tables.push(...pageTables(runsFromItems((await page.getTextContent()).items), n, options));
    page.cleanup?.();
    onProgress?.(n / doc.numPages);
  }
  if (!tables.length) throw new ConversionError("pdfIsScanned");
  return tables;
}

export interface TableSheet {
  name: string;
  rows: TableValue[][];
}

/**
 * Tables as sheets: one per page (its tables one under another, an empty row
 * between them), one per table, or all in a single sheet.
 */
export function groupTables(
  tables: readonly PdfTable[],
  by: "page" | "table" | "all",
  names: { page: (n: number) => string; table: (n: number) => string; all: string },
): TableSheet[] {
  const stack = (list: readonly PdfTable[]) => list.flatMap((t, i) => (i > 0 ? [[], ...t.rows] : t.rows));
  if (by === "all") return [{ name: names.all, rows: stack(tables) }];
  if (by === "table") return tables.map((t, i) => ({ name: names.table(i + 1), rows: t.rows }));
  const pages = [...new Set(tables.map((t) => t.page))];
  return pages.map((page) => ({ name: names.page(page), rows: stack(tables.filter((t) => t.page === page)) }));
}
