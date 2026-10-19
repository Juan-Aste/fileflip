// Rebuilds paragraphs from positioned PDF text runs (pdf.js text content).

export interface TextRun {
  str: string;
  x: number;
  /** Baseline, in PDF points from the bottom of the page. */
  y: number;
  /** Font size in points. */
  size: number;
  width: number;
}

export interface Paragraph {
  text: string;
  size: number;
  heading: boolean;
}

interface Line {
  y: number;
  size: number;
  x: number;
  /** Right edge of the last run. */
  end: number;
  text: string;
}

/** Groups runs that share a baseline into lines, top to bottom. */
function toLines(runs: readonly TextRun[]): Line[] {
  const sorted = runs.filter((r) => r.str.trim() || r.str === " ").sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; runs: TextRun[] }[] = [];
  for (const run of sorted) {
    const line = lines.find((l) => Math.abs(l.y - run.y) <= Math.max(2, run.size * 0.3));
    if (line) line.runs.push(run);
    else lines.push({ y: run.y, runs: [run] });
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map(({ y, runs: lineRuns }) => {
      lineRuns.sort((a, b) => a.x - b.x);
      let text = "";
      let end = -Infinity;
      for (const r of lineRuns) {
        // A visible horizontal gap means a space the PDF did not encode.
        if (text && r.x - end > r.size * 0.2 && !text.endsWith(" ") && !r.str.startsWith(" ")) text += " ";
        text += r.str;
        end = r.x + r.width;
      }
      const size = Math.max(...lineRuns.map((r) => r.size));
      return { y, size, x: lineRuns[0].x, end, text: text.replace(/\s+/g, " ").trim() };
    })
    .filter((l) => l.text);
}

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/**
 * Joins lines into paragraphs: a new paragraph starts after a vertical gap
 * larger than usual, a font size change, or a line that is clearly indented.
 * Lines much larger than the body text become headings.
 */
export function paragraphsFromRuns(runs: readonly TextRun[]): Paragraph[] {
  const lines = toLines(runs);
  if (!lines.length) return [];
  const body = median(lines.map((l) => l.size)) || 10;
  const gaps = lines.slice(1).map((l, i) => lines[i].y - l.y).filter((g) => g > 0);
  // Lower quartile: the line spacing inside paragraphs, not the gaps between them.
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const usualGap = sortedGaps[Math.floor((sortedGaps.length - 1) / 4)] || body * 1.2;

  const paragraphs: Paragraph[] = [];
  let current: Line[] = [];
  const flush = () => {
    if (!current.length) return;
    const size = Math.round(median(current.map((l) => l.size)) * 2) / 2;
    const text = current.reduce((acc, l) => (acc.endsWith("-") ? acc.slice(0, -1) + l.text : acc ? `${acc} ${l.text}` : l.text), "");
    paragraphs.push({ text, size, heading: size >= body * 1.25 });
    current = [];
  };

  const left = Math.min(...lines.map((l) => l.x));
  const right = Math.max(...lines.map((l) => l.end));
  lines.forEach((line, i) => {
    const prev = lines[i - 1];
    if (prev) {
      const gap = prev.y - line.y;
      const sizeChange = Math.abs(prev.size - line.size) > 0.5;
      const indented = line.x - prev.x > body * 1.5;
      // A line ending well before the text block's right edge ends its paragraph.
      const shortLine = prev.end - left < (right - left) * 0.7 && !prev.text.endsWith("-");
      if (gap > usualGap * 1.4 || sizeChange || indented || shortLine) flush();
    }
    current.push(line);
  });
  flush();
  return paragraphs;
}
