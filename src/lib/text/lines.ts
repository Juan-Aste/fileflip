// Line cleanup: remove duplicate and empty lines, trim spaces and sort, with
// the language's collation (á next to a, "item 2" before "item 10").

export type LineSort = "none" | "asc" | "desc";

export interface LineOptions {
  removeDuplicates: boolean;
  /** Duplicates are found without regard to case (the first one seen is kept as written). */
  ignoreCase: boolean;
  trim: boolean;
  removeEmpty: boolean;
  sort: LineSort;
  locale: string;
}

export interface LineResult {
  text: string;
  before: number;
  after: number;
  duplicates: number;
  empty: number;
}

const splitLines = (text: string) => {
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
};

export function cleanLines(text: string, options: LineOptions): LineResult {
  if (text === "") return { text: "", before: 0, after: 0, duplicates: 0, empty: 0 };
  const lines = splitLines(text);
  let out = options.trim ? lines.map((l) => l.trim()) : lines;
  let empty = 0;
  if (options.removeEmpty) {
    const kept = out.filter((l) => l.trim() !== "");
    empty = out.length - kept.length;
    out = kept;
  }
  let duplicates = 0;
  if (options.removeDuplicates) {
    const seen = new Set<string>();
    const kept: string[] = [];
    for (const line of out) {
      const key = options.ignoreCase ? line.toLocaleLowerCase(options.locale) : line;
      if (seen.has(key)) duplicates++;
      else {
        seen.add(key);
        kept.push(line);
      }
    }
    out = kept;
  }
  if (options.sort !== "none") {
    const collator = new Intl.Collator(options.locale, { numeric: true });
    out = [...out].sort(collator.compare);
    if (options.sort === "desc") out.reverse();
  }
  // Keep the original's final newline.
  const final = /(\r\n|\r|\n)$/.exec(text)?.[1];
  const eol = /\r\n/.test(text) ? "\r\n" : "\n";
  return { text: out.join(eol) + (final && out.length ? final : ""), before: lines.length, after: out.length, duplicates, empty };
}
