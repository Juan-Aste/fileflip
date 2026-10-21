import { formats, type Conversion, type Engine, type FormatId } from "./formats";
import type { Locale } from "@/i18n/routing";

// The tool catalog: the single registry every visible list is built from
// (pages, sitemap, footer, search, categories). Each tool has its own page
// and a translated slug per language: /es/unir-pdf, /en/merge-pdf, ...
// Only tools with status "verified" are published: a tool is verified when it
// processes real files end to end and has tests that check the output file.

export const toolCategories = [
  "image",
  "pdf",
  "document",
  "data",
  "developer",
  "utility",
  "subtitle",
  "font",
  "archive",
  "ocr",
  "ebook",
  "audio",
  "video",
  "3d",
  "cad",
] as const;

export type ToolCategory = (typeof toolCategories)[number];

export const toolIds = [
  "merge-pdf",
  "split-pdf",
  "rotate-pdf",
  "organize-pdf",
  "images-to-pdf",
  "compress-pdf",
  "json-to-csv",
  "csv-to-json",
  "json-to-yaml",
  "yaml-to-json",
  "json-to-toml",
  "toml-to-json",
  "json-to-xml",
  "xml-to-json",
  "json-formatter",
  "xml-formatter",
  "yaml-formatter",
  "base64-encode",
  "base64-decode",
  "url-encode",
  "hash-generator",
  "uuid-generator",
  "timestamp-converter",
  "qr-generator",
  "qr-reader",
] as const;

export type ToolId = (typeof toolIds)[number];

export type ToolStatus = "draft" | "verified";

export interface ToolLimits {
  /**
   * How many files one run takes ("none": text or options only, so no file
   * limits apply). Sizes and batch counts come from the plan (limits.ts).
   */
  files: "single" | "multiple" | "none";
  /** A job running longer than this is stopped (its worker is terminated). */
  timeoutMs: number;
  /** Per-file cap below the plan's, when the tool needs it (text parsed whole in memory...). */
  maxFileBytes?: number;
}

export interface ToolInfo {
  id: ToolId;
  category: ToolCategory;
  /** Formats the tool reads, and the ones it produces. */
  inputs: readonly FormatId[];
  outputs: readonly FormatId[];
  /** Where files are processed. */
  engine: Engine;
  /** Libraries doing the work (licenses in docs/dependencies.md). */
  libraries: readonly string[];
  limits: ToolLimits;
  status: ToolStatus;
  slugs: Record<Locale, string>;
}

const imageInputs: readonly FormatId[] = ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "ico", "heic", "svg"];
const MINUTE = 60_000;
/** Text data is parsed whole: beyond this a tab can run out of memory. */
const DATA_MAX_BYTES = 50 * 1024 * 1024;

export const tools: Record<ToolId, ToolInfo> = {
  "merge-pdf": {
    id: "merge-pdf",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf-lib"],
    limits: { files: "multiple", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "unir-pdf", en: "merge-pdf", pt: "juntar-pdf", fr: "fusionner-pdf", zh: "merge-pdf" },
  },
  "split-pdf": {
    id: "split-pdf",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf-lib", "fflate"],
    limits: { files: "single", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "dividir-pdf", en: "split-pdf", pt: "dividir-pdf", fr: "diviser-pdf", zh: "split-pdf" },
  },
  "rotate-pdf": {
    id: "rotate-pdf",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf-lib"],
    limits: { files: "single", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "rotar-pdf", en: "rotate-pdf", pt: "girar-pdf", fr: "pivoter-pdf", zh: "rotate-pdf" },
  },
  "organize-pdf": {
    id: "organize-pdf",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf-lib", "pdfjs-dist"],
    limits: { files: "single", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "ordenar-pdf", en: "organize-pdf", pt: "organizar-pdf", fr: "organiser-pdf", zh: "organize-pdf" },
  },
  "images-to-pdf": {
    id: "images-to-pdf",
    category: "pdf",
    inputs: imageInputs,
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf-lib", "@jsquash", "libheif-js", "utif2"],
    limits: { files: "multiple", timeoutMs: 10 * MINUTE },
    status: "verified",
    slugs: { es: "imagenes-a-pdf", en: "images-to-pdf", pt: "imagens-para-pdf", fr: "images-en-pdf", zh: "images-to-pdf" },
  },
  "compress-pdf": {
    id: "compress-pdf",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf-lib", "fflate", "@jsquash/jpeg"],
    limits: { files: "single", timeoutMs: 10 * MINUTE },
    status: "verified",
    slugs: { es: "comprimir-pdf", en: "compress-pdf", pt: "comprimir-pdf", fr: "compresser-pdf", zh: "compress-pdf" },
  },
  "json-to-csv": {
    id: "json-to-csv",
    category: "data",
    inputs: ["json"],
    outputs: ["csv", "tsv"],
    engine: "browser",
    libraries: ["papaparse"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "json-a-csv", en: "json-to-csv", pt: "json-para-csv", fr: "json-en-csv", zh: "json-to-csv" },
  },
  "csv-to-json": {
    id: "csv-to-json",
    category: "data",
    inputs: ["csv", "tsv"],
    outputs: ["json"],
    engine: "browser",
    libraries: ["papaparse"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "csv-a-json", en: "csv-to-json", pt: "csv-para-json", fr: "csv-en-json", zh: "csv-to-json" },
  },
  "json-to-yaml": {
    id: "json-to-yaml",
    category: "data",
    inputs: ["json"],
    outputs: ["yaml"],
    engine: "browser",
    libraries: ["yaml"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "json-a-yaml", en: "json-to-yaml", pt: "json-para-yaml", fr: "json-en-yaml", zh: "json-to-yaml" },
  },
  "yaml-to-json": {
    id: "yaml-to-json",
    category: "data",
    inputs: ["yaml"],
    outputs: ["json"],
    engine: "browser",
    libraries: ["yaml"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "yaml-a-json", en: "yaml-to-json", pt: "yaml-para-json", fr: "yaml-en-json", zh: "yaml-to-json" },
  },
  "json-to-toml": {
    id: "json-to-toml",
    category: "data",
    inputs: ["json"],
    outputs: ["toml"],
    engine: "browser",
    libraries: ["smol-toml"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "json-a-toml", en: "json-to-toml", pt: "json-para-toml", fr: "json-en-toml", zh: "json-to-toml" },
  },
  "toml-to-json": {
    id: "toml-to-json",
    category: "data",
    inputs: ["toml"],
    outputs: ["json"],
    engine: "browser",
    libraries: ["smol-toml"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "toml-a-json", en: "toml-to-json", pt: "toml-para-json", fr: "toml-en-json", zh: "toml-to-json" },
  },
  "json-to-xml": {
    id: "json-to-xml",
    category: "data",
    inputs: ["json"],
    outputs: ["xml"],
    engine: "browser",
    libraries: ["fast-xml-parser"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "json-a-xml", en: "json-to-xml", pt: "json-para-xml", fr: "json-en-xml", zh: "json-to-xml" },
  },
  "xml-to-json": {
    id: "xml-to-json",
    category: "data",
    inputs: ["xml"],
    outputs: ["json"],
    engine: "browser",
    libraries: ["fast-xml-parser"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "xml-a-json", en: "xml-to-json", pt: "xml-para-json", fr: "xml-en-json", zh: "xml-to-json" },
  },
  "json-formatter": {
    id: "json-formatter",
    category: "developer",
    inputs: ["json"],
    outputs: ["json"],
    engine: "browser",
    libraries: ["native JSON"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "formatear-json", en: "json-formatter", pt: "formatar-json", fr: "formater-json", zh: "json-formatter" },
  },
  "xml-formatter": {
    id: "xml-formatter",
    category: "developer",
    inputs: ["xml"],
    outputs: ["xml"],
    engine: "browser",
    libraries: ["fast-xml-parser"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "formatear-xml", en: "xml-formatter", pt: "formatar-xml", fr: "formater-xml", zh: "xml-formatter" },
  },
  "yaml-formatter": {
    id: "yaml-formatter",
    category: "developer",
    inputs: ["yaml"],
    outputs: ["yaml"],
    engine: "browser",
    libraries: ["yaml"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "formatear-yaml", en: "yaml-formatter", pt: "formatar-yaml", fr: "formater-yaml", zh: "yaml-formatter" },
  },
  "base64-encode": {
    id: "base64-encode",
    category: "developer",
    inputs: ["bin", "txt"],
    outputs: ["base64"],
    engine: "browser",
    libraries: ["native btoa"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "codificar-base64", en: "base64-encode", pt: "codificar-base64", fr: "encoder-base64", zh: "base64-encode" },
  },
  "base64-decode": {
    id: "base64-decode",
    category: "developer",
    inputs: ["base64", "txt"],
    outputs: ["bin"],
    engine: "browser",
    libraries: ["native atob"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: DATA_MAX_BYTES },
    status: "verified",
    slugs: { es: "decodificar-base64", en: "base64-decode", pt: "decodificar-base64", fr: "decoder-base64", zh: "base64-decode" },
  },
  "url-encode": {
    id: "url-encode",
    category: "developer",
    inputs: ["txt"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["native encodeURIComponent"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: { es: "codificar-url", en: "url-encode", pt: "codificar-url", fr: "encoder-url", zh: "url-encode" },
  },
  "hash-generator": {
    id: "hash-generator",
    category: "developer",
    inputs: ["bin", "txt"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["hash-wasm"],
    // Files are read in 4 MB chunks: the plan's size limit applies, not a tool limit.
    limits: { files: "multiple", timeoutMs: 10 * MINUTE },
    status: "verified",
    slugs: { es: "generador-hash", en: "hash-generator", pt: "gerador-de-hash", fr: "generateur-hash", zh: "hash-generator" },
  },
  "uuid-generator": {
    id: "uuid-generator",
    category: "developer",
    inputs: [],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["native crypto.getRandomValues"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: { es: "generador-uuid", en: "uuid-generator", pt: "gerador-de-uuid", fr: "generateur-uuid", zh: "uuid-generator" },
  },
  "timestamp-converter": {
    id: "timestamp-converter",
    category: "developer",
    inputs: ["txt"],
    outputs: ["csv"],
    engine: "browser",
    libraries: ["native Intl"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: {
      es: "convertir-timestamp",
      en: "timestamp-converter",
      pt: "conversor-de-timestamp",
      fr: "convertisseur-timestamp",
      zh: "timestamp-converter",
    },
  },
  "qr-generator": {
    id: "qr-generator",
    category: "utility",
    inputs: [],
    outputs: ["png", "svg"],
    engine: "browser",
    libraries: ["qrcode"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: { es: "generador-codigo-qr", en: "qr-code-generator", pt: "gerador-de-qr-code", fr: "generateur-qr-code", zh: "qr-code-generator" },
  },
  "qr-reader": {
    id: "qr-reader",
    category: "utility",
    inputs: ["png", "jpg", "webp", "gif", "bmp", "avif"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["jsqr"],
    // The photo is decoded whole into memory before scanning.
    limits: { files: "multiple", timeoutMs: MINUTE, maxFileBytes: 25 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "leer-codigo-qr", en: "qr-code-reader", pt: "ler-qr-code", fr: "lire-qr-code", zh: "qr-code-reader" },
  },
};

/** Published tools: only verified ones get pages, links and sitemap entries. */
export const availableTools: readonly ToolId[] = toolIds.filter((id) => tools[id].status === "verified");

/** A published tool by its slug in a language (draft tools have no page). */
export function toolFromSlug(locale: Locale, slug: string): ToolInfo | undefined {
  return availableTools.map((id) => tools[id]).find((t) => t.slugs[locale] === slug);
}

/** Published tools of a category, in registry order. */
export function toolsInCategory(category: ToolCategory): ToolInfo[] {
  return availableTools.map((id) => tools[id]).filter((t) => t.category === category);
}

/** Category of a format-conversion page (the converter's pairs in formats.ts). */
export function conversionCategory(conversion: Pick<Conversion, "from" | "to">): ToolCategory {
  const from = formats[conversion.from].category;
  if (from === "document") return "document";
  if (from === "pdf" && conversion.to === "docx") return "document";
  if (from === "pdf" || conversion.to === "pdf") return "pdf";
  return "image";
}

/**
 * Published tools to link from a tool's page: same category first, then
 * tools sharing an input format, in registry order.
 */
export function relatedTools(id: ToolId, max = 6): ToolInfo[] {
  const tool = tools[id];
  const others = availableTools.map((other) => tools[other]).filter((other) => other.id !== id);
  const sameCategory = others.filter((other) => other.category === tool.category);
  const sharedInput = others.filter(
    (other) => other.category !== tool.category && other.inputs.some((f) => tool.inputs.includes(f)),
  );
  return [...sameCategory, ...sharedInput].slice(0, max);
}
