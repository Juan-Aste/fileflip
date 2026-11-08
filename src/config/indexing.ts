import { categoryEntries } from "./categories";
import type { Conversion, FormatId } from "./formats";
import type { ToolCategory, ToolId } from "./tools";

// Which template pages Google should index (phase 19.2, docs/seo/indexacion.md).
// AdSense rejected the site on 2026-11-07 for "low value content": ~200 pages
// per language were conversion pages built from one template. Only the
// conversions people actually search for stay indexed (and get text of their
// own); the rest keep working for whoever lands on them, with
// `noindex, follow`, a canonical to themselves and out of the sitemap.

/** Conversion pages that stay indexed, by from → to. */
export const indexedConversionPairs: ReadonlyArray<readonly [FormatId, FormatId]> = [
  // Photos from phones and the web
  ["heic", "jpg"],
  ["heic", "png"],
  ["heic", "pdf"],
  ["webp", "jpg"],
  ["webp", "png"],
  ["avif", "jpg"],
  ["avif", "png"],
  // Everyday image formats
  ["jpg", "png"],
  ["png", "jpg"],
  ["jpg", "webp"],
  ["png", "webp"],
  ["jpg", "avif"],
  ["gif", "png"],
  ["gif", "jpg"],
  ["bmp", "jpg"],
  ["bmp", "png"],
  ["tiff", "jpg"],
  ["tiff", "pdf"],
  // Icons and vector
  ["png", "ico"],
  ["jpg", "ico"],
  ["ico", "png"],
  ["svg", "png"],
  ["svg", "jpg"],
  ["svg", "pdf"],
  // Images and PDF
  ["jpg", "pdf"],
  ["png", "pdf"],
  ["pdf", "jpg"],
  ["pdf", "png"],
  // Office documents
  ["pdf", "docx"],
  ["docx", "pdf"],
  ["doc", "pdf"],
  ["xlsx", "pdf"],
  ["xls", "pdf"],
  ["pptx", "pdf"],
  ["ppt", "pdf"],
  ["odt", "pdf"],
  ["rtf", "pdf"],
  ["txt", "pdf"],
];

const indexedConversions = new Set(indexedConversionPairs.map(([from, to]) => `${from}>${to}`));

export function isIndexedConversion(conversion: Pick<Conversion, "from" | "to">): boolean {
  return indexedConversions.has(`${conversion.from}>${conversion.to}`);
}

/**
 * Tool pages that are near copies of another indexed one and get almost no
 * searches of their own: same criterion as the conversion pages.
 */
export const noindexTools: ReadonlySet<ToolId> = new Set<ToolId>([
  "json-to-toml",
  "toml-to-json",
  "excel-to-ods",
  "ods-to-excel",
]);

export function isIndexedTool(id: ToolId): boolean {
  return !noindexTools.has(id);
}

/**
 * A category page with one or two tools is almost the same page as the tool
 * itself: indexed only from three entries up.
 */
export function isIndexedCategory(category: ToolCategory): boolean {
  const { tools, conversions } = categoryEntries(category);
  return tools.length + conversions.length >= 3;
}

/** Next metadata for a page that works but should stay out of the index. */
export const noindexFollow = { index: false, follow: true } as const;
