import type { AdminStats } from "@/lib/admin/stats";

type Cell = string | number | null | undefined;

/**
 * One CSV field (RFC 4180). Text that a spreadsheet would run as a formula
 * (=, +, -, @, tab, CR at the start) gets a leading apostrophe.
 */
export function csvField(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV text with a header row and CRLF line endings. */
export function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}

type Source = Exclude<keyof AdminStats, "temp">;

interface CsvTable<S extends Source> {
  source: S;
  header: string[];
  rows: (stats: AdminStats[S]) => Cell[][];
}

const table = <S extends Source>(t: CsvTable<S>) => t;
const countRows = (rows: Array<{ key: string; count: number }>) => rows.map((r) => [r.key, r.count]);

/** The panel's main tables, exportable as CSV (`/api/admin/export?table=…`). */
export const csvTables = {
  "conversions-per-day": table({
    source: "conversions",
    header: ["period", "total", "failed"],
    rows: (s) => s.perBucket.map((b) => [b.key, b.total, b.failed]),
  }),
  "top-conversions": table({
    source: "conversions",
    header: ["tool", "from", "to", "count"],
    rows: (s) => s.top.map((t) => [t.tool, t.from, t.to, t.count]),
  }),
  engines: table({
    source: "conversions",
    header: ["engine", "count"],
    rows: (s) => [
      ["browser", s.engines.browser],
      ["server", s.engines.server],
    ],
  }),
  "usage-by-tool": table({
    source: "tools",
    header: ["tool", "count", "failed", "top_error"],
    rows: (s) => s.byTool.map((u) => [u.tool, u.total, u.failed, u.topError]),
  }),
  "usage-by-category": table({
    source: "tools",
    header: ["category", "count", "failed"],
    rows: (s) => s.byCategory.map((c) => [c.category, c.total, c.failed]),
  }),
  errors: table({ source: "quality", header: ["error_code", "count"], rows: (s) => s.errors.map((e) => [e.code, e.count]) }),
  "visits-per-day": table({ source: "visits", header: ["period", "visits"], rows: (s) => s.perBucket.map((b) => [b.key, b.count]) }),
  "visits-by-locale": table({ source: "visits", header: ["locale", "count"], rows: (s) => countRows(s.byLocale) }),
  "visits-by-country": table({ source: "visits", header: ["country", "count"], rows: (s) => countRows(s.byCountry) }),
  "visits-by-page-kind": table({ source: "visits", header: ["page_kind", "count"], rows: (s) => countRows(s.byKind) }),
  "top-longtail": table({ source: "visits", header: ["page", "count"], rows: (s) => countRows(s.topLongtail) }),
  "users-per-day": table({
    source: "accounts",
    header: ["period", "new_users"],
    rows: (s) => s.newUsersPerBucket.map((b) => [b.key, b.count]),
  }),
  mrr: table({
    source: "accounts",
    header: ["currency", "mrr", "active_subscriptions"],
    rows: (s) => s.mrr.map((m) => [m.currency, m.amount, m.subscriptions]),
  }),
};

export type CsvTableId = keyof typeof csvTables;

export function isCsvTable(id: string | null | undefined): id is CsvTableId {
  return !!id && Object.hasOwn(csvTables, id);
}

/** CSV of one table from the stats of its source. */
export function tableCsv<T extends CsvTableId>(id: T, stats: Pick<AdminStats, (typeof csvTables)[T]["source"]>): string {
  const t = csvTables[id] as unknown as CsvTable<Source>;
  return toCsv(t.header, t.rows((stats as AdminStats)[t.source]));
}
