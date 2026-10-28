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
  "delete-pdf-pages",
  "extract-pdf-pages",
  "pdf-page-numbers",
  "pdf-watermark",
  "pdf-to-text",
  "crop-pdf",
  "sign-pdf",
  "edit-pdf",
  "protect-pdf",
  "unlock-pdf",
  "extract-pdf-images",
  "pdf-to-pdfa",
  "pdf-to-excel",
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
  "password-generator",
  "word-counter",
  "case-converter",
  "compare-text",
  "remove-duplicate-lines",
  "lorem-ipsum",
  "color-converter",
  "unit-converter",
  "compress-image",
  "resize-image",
  "rotate-image",
  "remove-exif",
  "crop-image",
  "id-photo",
  "remove-background",
  "scan-document",
  "watermark-image",
  "add-text-to-image",
  "favicon-generator",
  "svg-converter",
  "subtitle-converter",
  "subtitle-sync",
  "font-converter",
  "markdown-to-html",
  "html-to-markdown",
  "markdown-to-pdf",
  "html-to-pdf",
  "spreadsheet-converter",
  "excel-to-csv",
  "csv-to-excel",
  "xls-to-xlsx",
  "excel-to-ods",
  "ods-to-excel",
  "excel-to-json",
  "json-to-excel",
  "merge-excel",
  "split-excel",
  "create-archive",
  "extract-archive",
  "image-to-text",
  "ocr-pdf",
  "epub-converter",
  "epub-to-pdf",
  "create-epub",
  "audio-converter",
  "trim-audio",
  "adjust-audio",
  "normalize-audio",
  "join-audio",
  "text-to-speech",
  "video-converter",
  "extract-audio",
  "compress-video",
  "trim-video",
  "video-to-gif",
  "video-speed",
  "join-videos",
  "model-converter",
  "image-to-lithophane",
  "dxf-converter",
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
  /** Tools of other categories it pairs with, linked both ways from their pages. */
  related?: readonly ToolId[];
}

const imageInputs: readonly FormatId[] = ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "ico", "heic", "svg"];
const MINUTE = 60_000;
/** Text data is parsed whole: beyond this a tab can run out of memory. */
const DATA_MAX_BYTES = 50 * 1024 * 1024;
/** A feature film's subtitles are ~100 KB; this leaves room for long series files. */
const SUBTITLE_MAX_BYTES = 10 * 1024 * 1024;
/** qpdf holds the PDF and its encrypted copy in WASM memory (max. 2 GB address space). */
const PDF_PASSWORD_MAX_BYTES = 200 * 1024 * 1024;
/** Same cap as the font engine (MAX_FONT_BYTES): bigger than any real font. */
const FONT_MAX_BYTES = 40 * 1024 * 1024;
/** pdf.js reads the text page by page; the tables found are kept in memory. */
const PDF_TABLES_MAX_BYTES = 100 * 1024 * 1024;
/** Spreadsheets are read whole by SheetJS in the worker (cells are also capped: MAX_CELLS). */
const SHEET_MAX_BYTES = 50 * 1024 * 1024;
/** Archives are built in memory (input + output): the same cap as the engine (MAX_ARCHIVE_INPUT_BYTES). */
const ARCHIVE_MAX_BYTES = 500 * 1024 * 1024;
/** Photos and scans; they are resized to at most 4000 px before OCR (ocrSize). */
const OCR_MAX_BYTES = 50 * 1024 * 1024;
/** Scanned PDFs are rendered page by page; the original is kept whole to add the text layers. */
const OCR_PDF_MAX_BYTES = 100 * 1024 * 1024;
/** Books are unpacked in the worker (EPUB_LIMITS) and assembled into one page in the tab. */
const EPUB_MAX_BYTES = 100 * 1024 * 1024;
/** 3D models: a 3-million-triangle binary STL is ~150 MB. */
const MODEL_MAX_BYTES = 200 * 1024 * 1024;
/** EPUB → PDF uploads the book already assembled into one page (images embedded): the Pro server limit. */
const EPUB_PDF_MAX_BYTES = 50 * 1024 * 1024;
/** Chapters are sanitized and serialized on the page; room for images embedded as data: URLs. */
const CREATE_EPUB_MAX_BYTES = 20 * 1024 * 1024;
/** Audio is streamed from the file, but the converted output is kept in memory until it is downloaded. */
/** Input and output are both held in memory while a video is converted. */
const VIDEO_MAX_BYTES = 500 * 1024 * 1024;
const AUDIO_MAX_BYTES = 500 * 1024 * 1024;
/** Markdown/HTML are converted on the page (they need a DOM): keep it responsive. */
const MARKUP_MAX_BYTES = 5 * 1024 * 1024;
const subtitleFormats: readonly FormatId[] = ["srt", "vtt", "ass", "ssa"];

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
  "delete-pdf-pages": {
    id: "delete-pdf-pages",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf-lib", "pdf.js"],
    limits: { files: "single", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "eliminar-paginas-pdf", en: "delete-pdf-pages", pt: "excluir-paginas-pdf", fr: "supprimer-pages-pdf", zh: "delete-pdf-pages" },
  },
  "extract-pdf-pages": {
    id: "extract-pdf-pages",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf-lib", "pdf.js", "fflate"],
    limits: { files: "single", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "extraer-paginas-pdf", en: "extract-pdf-pages", pt: "extrair-paginas-pdf", fr: "extraire-pages-pdf", zh: "extract-pdf-pages" },
  },
  "pdf-page-numbers": {
    id: "pdf-page-numbers",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf-lib", "canvas"],
    limits: { files: "multiple", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "numerar-paginas-pdf", en: "add-page-numbers-to-pdf", pt: "numerar-paginas-pdf", fr: "numeroter-pages-pdf", zh: "add-page-numbers-to-pdf" },
  },
  "pdf-watermark": {
    id: "pdf-watermark",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf-lib", "canvas"],
    limits: { files: "multiple", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "marca-de-agua-pdf", en: "watermark-pdf", pt: "marca-dagua-pdf", fr: "filigrane-pdf", zh: "watermark-pdf" },
  },
  "pdf-to-text": {
    id: "pdf-to-text",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["pdf.js"],
    limits: { files: "multiple", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "pdf-a-texto", en: "pdf-to-text", pt: "pdf-para-texto", fr: "pdf-en-texte", zh: "pdf-to-text" },
  },
  "crop-pdf": {
    id: "crop-pdf",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf.js", "pdf-lib"],
    limits: { files: "multiple", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "recortar-pdf", en: "crop-pdf", pt: "cortar-pdf", fr: "rogner-pdf", zh: "crop-pdf" },
  },
  "sign-pdf": {
    id: "sign-pdf",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf.js", "pdf-lib", "canvas"],
    limits: { files: "single", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "firmar-pdf", en: "sign-pdf", pt: "assinar-pdf", fr: "signer-pdf", zh: "sign-pdf" },
  },
  "edit-pdf": {
    id: "edit-pdf",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["pdf-lib", "pdfjs-dist"],
    limits: { files: "single", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "editar-pdf", en: "edit-pdf", pt: "editar-pdf", fr: "modifier-pdf", zh: "edit-pdf" },
  },
  "protect-pdf": {
    id: "protect-pdf",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["@neslinesli93/qpdf-wasm", "pdf-lib"],
    // qpdf keeps the input and the output in WASM memory at once.
    limits: { files: "multiple", timeoutMs: 5 * MINUTE, maxFileBytes: PDF_PASSWORD_MAX_BYTES },
    status: "verified",
    slugs: { es: "proteger-pdf", en: "protect-pdf", pt: "proteger-pdf", fr: "proteger-pdf", zh: "protect-pdf" },
  },
  "unlock-pdf": {
    id: "unlock-pdf",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["@neslinesli93/qpdf-wasm", "pdf-lib"],
    limits: { files: "multiple", timeoutMs: 5 * MINUTE, maxFileBytes: PDF_PASSWORD_MAX_BYTES },
    status: "verified",
    slugs: { es: "quitar-contrasena-pdf", en: "unlock-pdf", pt: "desbloquear-pdf", fr: "deverrouiller-pdf", zh: "unlock-pdf" },
  },
  "extract-pdf-images": {
    id: "extract-pdf-images",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["jpg", "png"],
    engine: "browser",
    libraries: ["pdf.js", "pdf-lib", "canvas", "fflate"],
    limits: { files: "multiple", timeoutMs: 5 * MINUTE },
    status: "verified",
    slugs: { es: "extraer-imagenes-pdf", en: "extract-images-from-pdf", pt: "extrair-imagens-pdf", fr: "extraire-images-pdf", zh: "extract-images-from-pdf" },
  },
  "pdf-to-pdfa": {
    id: "pdf-to-pdfa",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["pdf"],
    engine: "server",
    libraries: ["Gotenberg (LibreOffice)", "pdf-lib"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE },
    status: "verified",
    slugs: { es: "pdf-a-pdfa", en: "pdf-to-pdfa", pt: "pdf-para-pdfa", fr: "pdf-en-pdfa", zh: "pdf-to-pdfa" },
  },
  "pdf-to-excel": {
    id: "pdf-to-excel",
    category: "pdf",
    inputs: ["pdf"],
    outputs: ["xlsx", "csv"],
    engine: "browser",
    libraries: ["pdfjs-dist", "xlsx (SheetJS CE)", "papaparse"],
    limits: { files: "single", timeoutMs: 5 * MINUTE, maxFileBytes: PDF_TABLES_MAX_BYTES },
    status: "verified",
    slugs: { es: "pdf-a-excel", en: "pdf-to-excel", pt: "pdf-para-excel", fr: "pdf-en-excel", zh: "pdf-to-excel" },
    related: ["ocr-pdf", "excel-to-csv"],
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
  "password-generator": {
    id: "password-generator",
    category: "utility",
    inputs: [],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["native crypto.getRandomValues"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: {
      es: "generador-de-contrasenas",
      en: "password-generator",
      pt: "gerador-de-senhas",
      fr: "generateur-mot-de-passe",
      zh: "password-generator",
    },
  },
  "word-counter": {
    id: "word-counter",
    category: "utility",
    inputs: ["txt"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["native Intl.Segmenter"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: { es: "contador-de-palabras", en: "word-counter", pt: "contador-de-palavras", fr: "compteur-de-mots", zh: "word-counter" },
  },
  "case-converter": {
    id: "case-converter",
    category: "utility",
    inputs: ["txt"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["native Intl.Segmenter"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: { es: "convertir-mayusculas-minusculas", en: "case-converter", pt: "converter-maiusculas-minusculas", fr: "convertir-majuscules-minuscules", zh: "case-converter" },
    related: ["word-counter"],
  },
  "compare-text": {
    id: "compare-text",
    category: "utility",
    inputs: ["txt"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["diff (jsdiff)", "native Intl.Segmenter"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: { es: "comparar-textos", en: "compare-text", pt: "comparar-textos", fr: "comparer-textes", zh: "compare-text" },
  },
  "remove-duplicate-lines": {
    id: "remove-duplicate-lines",
    category: "utility",
    inputs: ["txt"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["native Intl.Collator"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: { es: "quitar-lineas-duplicadas", en: "remove-duplicate-lines", pt: "remover-linhas-duplicadas", fr: "supprimer-lignes-en-double", zh: "remove-duplicate-lines" },
  },
  "lorem-ipsum": {
    id: "lorem-ipsum",
    category: "utility",
    inputs: ["txt"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["own generator"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: { es: "generador-lorem-ipsum", en: "lorem-ipsum-generator", pt: "gerador-lorem-ipsum", fr: "generateur-lorem-ipsum", zh: "lorem-ipsum-generator" },
    related: ["word-counter"],
  },
  "color-converter": {
    id: "color-converter",
    category: "utility",
    inputs: ["txt"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["own OKLab/WCAG math"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: { es: "conversor-de-colores", en: "color-converter", pt: "conversor-de-cores", fr: "convertisseur-couleurs", zh: "color-converter" },
  },
  "unit-converter": {
    id: "unit-converter",
    category: "utility",
    inputs: ["txt"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["own unit tables"],
    limits: { files: "none", timeoutMs: MINUTE },
    status: "verified",
    slugs: { es: "conversor-de-unidades", en: "unit-converter", pt: "conversor-de-unidades", fr: "convertisseur-unites", zh: "unit-converter" },
  },
  "compress-image": {
    id: "compress-image",
    category: "image",
    inputs: ["jpg", "png", "webp", "avif"],
    outputs: ["jpg", "png", "webp", "avif"],
    engine: "browser",
    libraries: ["@jsquash/jpeg", "@jsquash/webp", "@jsquash/avif", "@jsquash/png", "@jsquash/oxipng", "gifenc"],
    // Photos are decoded whole (4 bytes per pixel) and encoded several times in target mode.
    limits: { files: "multiple", timeoutMs: 5 * MINUTE, maxFileBytes: 50 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "comprimir-imagen", en: "compress-image", pt: "comprimir-imagem", fr: "compresser-image", zh: "compress-image" },
  },
  "resize-image": {
    id: "resize-image",
    category: "image",
    inputs: ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "heic"],
    outputs: ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff"],
    engine: "browser",
    libraries: ["canvas", "@jsquash/jpeg", "@jsquash/webp", "@jsquash/avif", "@jsquash/png", "libheif-js", "utif2", "gifenc"],
    // Decoded whole in memory; results are capped at ~36 MP.
    limits: { files: "multiple", timeoutMs: 5 * MINUTE, maxFileBytes: 50 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "redimensionar-imagen", en: "resize-image", pt: "redimensionar-imagem", fr: "redimensionner-image", zh: "resize-image" },
  },
  "rotate-image": {
    id: "rotate-image",
    category: "image",
    inputs: ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "heic"],
    outputs: ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff"],
    engine: "browser",
    libraries: ["canvas", "@jsquash/jpeg", "@jsquash/webp", "@jsquash/avif", "@jsquash/png", "libheif-js", "utif2", "gifenc"],
    limits: { files: "multiple", timeoutMs: 5 * MINUTE, maxFileBytes: 50 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "rotar-imagen", en: "rotate-image", pt: "girar-imagem", fr: "pivoter-image", zh: "rotate-image" },
  },
  "remove-exif": {
    id: "remove-exif",
    category: "image",
    inputs: ["jpg", "png", "webp", "heic"],
    outputs: ["jpg", "png", "webp"],
    engine: "browser",
    // Own lossless strippers (src/lib/image/metadata.ts); exifr only reads what is removed.
    libraries: ["exifr", "libheif-js", "@jsquash/jpeg"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: 100 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "quitar-metadatos-exif", en: "remove-exif-metadata", pt: "remover-metadados-exif", fr: "supprimer-metadonnees-exif", zh: "remove-exif-metadata" },
  },

  "crop-image": {
    id: "crop-image",
    category: "image",
    inputs: ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "heic"],
    outputs: ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff"],
    engine: "browser",
    libraries: ["own crop geometry", "@jsquash/jpeg", "@jsquash/webp", "@jsquash/avif", "@jsquash/png", "libheif-js", "utif2", "gifenc"],
    // One image at a time: it is edited on a preview before cropping.
    limits: { files: "single", timeoutMs: 5 * MINUTE, maxFileBytes: 50 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "recortar-imagen", en: "crop-image", pt: "cortar-imagem", fr: "recadrer-image", zh: "crop-image" },
  },
  "id-photo": {
    id: "id-photo",
    category: "image",
    inputs: ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "heic"],
    outputs: ["jpg"],
    engine: "browser",
    libraries: ["own layout", "canvas", "@jsquash/jpeg", "libheif-js", "utif2"],
    // One photo at a time: it is framed on a preview first. Outputs: the photo at 600 dpi and a 10 × 15 cm sheet at 300 dpi.
    limits: { files: "single", timeoutMs: 2 * MINUTE, maxFileBytes: 50 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "foto-carnet", en: "id-photo-maker", pt: "foto-3x4", fr: "photo-identite", zh: "id-photo-maker" },
  },
  "scan-document": {
    id: "scan-document",
    category: "pdf",
    inputs: ["jpg", "png", "webp", "avif", "heic"],
    outputs: ["pdf"],
    engine: "browser",
    libraries: ["own perspective and threshold", "gifenc", "@jsquash/jpeg", "libheif-js", "pdf-lib"],
    // Pages are straightened one after another (each up to 2400 px on its longest side) and kept until the PDF is written.
    limits: { files: "multiple", timeoutMs: 5 * MINUTE, maxFileBytes: 50 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "escanear-documento", en: "scan-document", pt: "escanear-documento", fr: "scanner-document", zh: "scan-document" },
  },
  "remove-background": {
    id: "remove-background",
    category: "image",
    inputs: ["jpg", "png", "webp", "avif", "gif", "bmp"],
    outputs: ["png", "jpg"],
    engine: "browser",
    // U²-Net small (u2netp, Apache-2.0) on onnxruntime-web (WASM, one thread); mask applied by our own code.
    libraries: ["onnxruntime-web", "u2netp", "canvas"],
    limits: { files: "multiple", timeoutMs: 3 * MINUTE, maxFileBytes: 30 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "quitar-fondo", en: "remove-background", pt: "remover-fundo", fr: "supprimer-arriere-plan", zh: "remove-background" },
  },

  "watermark-image": {
    id: "watermark-image",
    category: "image",
    inputs: ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "heic"],
    outputs: ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff"],
    engine: "browser",
    libraries: ["canvas", "@jsquash/jpeg", "@jsquash/webp", "@jsquash/avif", "@jsquash/png", "libheif-js", "utif2", "gifenc"],
    limits: { files: "multiple", timeoutMs: 5 * MINUTE, maxFileBytes: 50 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "marca-de-agua-imagen", en: "watermark-image", pt: "marca-dagua-imagem", fr: "filigrane-image", zh: "watermark-image" },
  },
  "add-text-to-image": {
    id: "add-text-to-image",
    category: "image",
    inputs: ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "heic"],
    outputs: ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff"],
    engine: "browser",
    libraries: ["canvas", "@jsquash/jpeg", "@jsquash/webp", "@jsquash/avif", "@jsquash/png", "libheif-js", "utif2", "gifenc"],
    limits: { files: "multiple", timeoutMs: 5 * MINUTE, maxFileBytes: 50 * 1024 * 1024 },
    status: "verified",
    slugs: {
      es: "agregar-texto-a-imagen",
      en: "add-text-to-image",
      pt: "adicionar-texto-na-imagem",
      fr: "ajouter-texte-image",
      zh: "add-text-to-image",
    },
  },

  "favicon-generator": {
    id: "favicon-generator",
    category: "image",
    inputs: ["png", "jpg", "webp", "avif", "gif", "bmp", "tiff", "heic", "svg"],
    outputs: ["ico", "png"],
    engine: "browser",
    libraries: ["canvas", "@jsquash/png", "own ICO writer", "libheif-js", "utif2"],
    limits: { files: "single", timeoutMs: 2 * MINUTE, maxFileBytes: 25 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "generador-de-favicon", en: "favicon-generator", pt: "gerador-de-favicon", fr: "generateur-favicon", zh: "favicon-generator" },
  },

  "svg-converter": {
    id: "svg-converter",
    category: "image",
    inputs: ["svg"],
    outputs: ["png", "jpg", "webp"],
    engine: "browser",
    // Rasterized by the browser through an <img> (no scripts, no external resources), encoded in the image worker.
    libraries: ["canvas", "@jsquash/png", "@jsquash/jpeg", "@jsquash/webp"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: 10 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "convertir-svg", en: "svg-converter", pt: "converter-svg", fr: "convertir-svg", zh: "svg-converter" },
  },
  "subtitle-converter": {
    id: "subtitle-converter",
    category: "subtitle",
    inputs: subtitleFormats,
    outputs: subtitleFormats,
    engine: "browser",
    libraries: ["own SRT/VTT/ASS parser"],
    limits: { files: "multiple", timeoutMs: MINUTE, maxFileBytes: SUBTITLE_MAX_BYTES },
    status: "verified",
    slugs: { es: "convertir-subtitulos", en: "subtitle-converter", pt: "converter-legendas", fr: "convertir-sous-titres", zh: "subtitle-converter" },
  },
  "subtitle-sync": {
    id: "subtitle-sync",
    category: "subtitle",
    inputs: subtitleFormats,
    outputs: subtitleFormats,
    engine: "browser",
    libraries: ["own SRT/VTT/ASS parser"],
    limits: { files: "multiple", timeoutMs: MINUTE, maxFileBytes: SUBTITLE_MAX_BYTES },
    status: "verified",
    slugs: { es: "sincronizar-subtitulos", en: "subtitle-sync", pt: "sincronizar-legendas", fr: "synchroniser-sous-titres", zh: "subtitle-sync" },
  },
  "font-converter": {
    id: "font-converter",
    category: "font",
    inputs: ["ttf", "otf", "woff", "woff2"],
    outputs: ["ttf", "otf", "woff", "woff2"],
    engine: "browser",
    libraries: ["woff2-encoder", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: FONT_MAX_BYTES },
    status: "verified",
    slugs: { es: "convertir-fuentes", en: "font-converter", pt: "converter-fontes", fr: "convertir-polices", zh: "font-converter" },
  },
  "markdown-to-html": {
    id: "markdown-to-html",
    category: "document",
    inputs: ["md", "txt"],
    outputs: ["html"],
    engine: "browser",
    libraries: ["marked", "dompurify"],
    limits: { files: "multiple", timeoutMs: MINUTE, maxFileBytes: MARKUP_MAX_BYTES },
    status: "verified",
    slugs: { es: "markdown-a-html", en: "markdown-to-html", pt: "markdown-para-html", fr: "markdown-en-html", zh: "markdown-to-html" },
  },
  "html-to-markdown": {
    id: "html-to-markdown",
    category: "document",
    inputs: ["html", "txt"],
    outputs: ["md"],
    engine: "browser",
    libraries: ["turndown", "turndown-plugin-gfm"],
    limits: { files: "multiple", timeoutMs: MINUTE, maxFileBytes: MARKUP_MAX_BYTES },
    status: "verified",
    slugs: { es: "html-a-markdown", en: "html-to-markdown", pt: "html-para-markdown", fr: "html-en-markdown", zh: "html-to-markdown" },
  },
  "markdown-to-pdf": {
    id: "markdown-to-pdf",
    category: "document",
    inputs: ["md", "txt"],
    outputs: ["pdf"],
    engine: "server",
    libraries: ["marked", "Gotenberg (Chromium)"],
    // Each file is one request; Gotenberg's own limit is 90 s per job.
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: MARKUP_MAX_BYTES },
    status: "verified",
    slugs: { es: "markdown-a-pdf", en: "markdown-to-pdf", pt: "markdown-para-pdf", fr: "markdown-en-pdf", zh: "markdown-to-pdf" },
  },
  "html-to-pdf": {
    id: "html-to-pdf",
    category: "document",
    inputs: ["html", "txt"],
    outputs: ["pdf"],
    engine: "server",
    libraries: ["parse5", "Gotenberg (Chromium)"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: MARKUP_MAX_BYTES },
    status: "verified",
    slugs: { es: "html-a-pdf", en: "html-to-pdf", pt: "html-para-pdf", fr: "html-en-pdf", zh: "html-to-pdf" },
  },
  "spreadsheet-converter": {
    id: "spreadsheet-converter",
    category: "document",
    inputs: ["xlsx", "xls", "ods", "csv", "tsv"],
    outputs: ["xlsx", "ods", "csv"],
    engine: "browser",
    libraries: ["xlsx (SheetJS CE)", "papaparse", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: SHEET_MAX_BYTES },
    status: "verified",
    slugs: { es: "convertir-hoja-de-calculo", en: "spreadsheet-converter", pt: "converter-planilha", fr: "convertir-tableur", zh: "spreadsheet-converter" },
  },
  "excel-to-csv": {
    id: "excel-to-csv",
    category: "document",
    inputs: ["xlsx", "xls", "ods"],
    outputs: ["csv"],
    engine: "browser",
    libraries: ["xlsx (SheetJS CE)", "papaparse", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: SHEET_MAX_BYTES },
    status: "verified",
    slugs: { es: "excel-a-csv", en: "excel-to-csv", pt: "excel-para-csv", fr: "excel-en-csv", zh: "excel-to-csv" },
    related: ["spreadsheet-converter", "csv-to-json"],
  },
  "csv-to-excel": {
    id: "csv-to-excel",
    category: "document",
    inputs: ["csv", "tsv"],
    outputs: ["xlsx"],
    engine: "browser",
    libraries: ["xlsx (SheetJS CE)", "papaparse", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: SHEET_MAX_BYTES },
    status: "verified",
    slugs: { es: "csv-a-excel", en: "csv-to-excel", pt: "csv-para-excel", fr: "csv-en-excel", zh: "csv-to-excel" },
    related: ["spreadsheet-converter", "json-to-csv"],
  },
  "xls-to-xlsx": {
    id: "xls-to-xlsx",
    category: "document",
    inputs: ["xls"],
    outputs: ["xlsx"],
    engine: "browser",
    libraries: ["xlsx (SheetJS CE)", "papaparse", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: SHEET_MAX_BYTES },
    status: "verified",
    slugs: { es: "xls-a-xlsx", en: "xls-to-xlsx", pt: "xls-para-xlsx", fr: "xls-en-xlsx", zh: "xls-to-xlsx" },
    related: ["spreadsheet-converter"],
  },
  "excel-to-ods": {
    id: "excel-to-ods",
    category: "document",
    inputs: ["xlsx", "xls"],
    outputs: ["ods"],
    engine: "browser",
    libraries: ["xlsx (SheetJS CE)", "papaparse", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: SHEET_MAX_BYTES },
    status: "verified",
    slugs: { es: "excel-a-ods", en: "excel-to-ods", pt: "excel-para-ods", fr: "excel-en-ods", zh: "excel-to-ods" },
    related: ["spreadsheet-converter"],
  },
  "ods-to-excel": {
    id: "ods-to-excel",
    category: "document",
    inputs: ["ods"],
    outputs: ["xlsx"],
    engine: "browser",
    libraries: ["xlsx (SheetJS CE)", "papaparse", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: SHEET_MAX_BYTES },
    status: "verified",
    slugs: { es: "ods-a-excel", en: "ods-to-excel", pt: "ods-para-excel", fr: "ods-en-excel", zh: "ods-to-excel" },
    related: ["spreadsheet-converter"],
  },
  "excel-to-json": {
    id: "excel-to-json",
    category: "document",
    inputs: ["xlsx", "xls", "ods"],
    outputs: ["json"],
    engine: "browser",
    libraries: ["xlsx (SheetJS CE)", "papaparse", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: SHEET_MAX_BYTES },
    status: "verified",
    slugs: { es: "excel-a-json", en: "excel-to-json", pt: "excel-para-json", fr: "excel-en-json", zh: "excel-to-json" },
    related: ["json-formatter", "json-to-csv"],
  },
  "json-to-excel": {
    id: "json-to-excel",
    category: "document",
    inputs: ["json"],
    outputs: ["xlsx"],
    engine: "browser",
    libraries: ["xlsx (SheetJS CE)", "papaparse", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: SHEET_MAX_BYTES },
    status: "verified",
    slugs: { es: "json-a-excel", en: "json-to-excel", pt: "json-para-excel", fr: "json-en-excel", zh: "json-to-excel" },
    related: ["json-to-csv", "json-formatter"],
  },
  "merge-excel": {
    id: "merge-excel",
    category: "document",
    inputs: ["xlsx", "xls", "ods", "csv", "tsv"],
    outputs: ["xlsx", "ods"],
    engine: "browser",
    libraries: ["xlsx (SheetJS CE)", "papaparse", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: SHEET_MAX_BYTES },
    status: "verified",
    slugs: { es: "unir-excel", en: "merge-excel", pt: "juntar-excel", fr: "fusionner-excel", zh: "merge-excel" },
    related: ["merge-pdf"],
  },
  "split-excel": {
    id: "split-excel",
    category: "document",
    inputs: ["xlsx", "xls", "ods"],
    outputs: ["xlsx", "ods", "csv"],
    engine: "browser",
    libraries: ["xlsx (SheetJS CE)", "papaparse", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: SHEET_MAX_BYTES },
    status: "verified",
    slugs: { es: "separar-hojas-excel", en: "split-excel-sheets", pt: "separar-planilhas-excel", fr: "separer-feuilles-excel", zh: "split-excel-sheets" },
    related: ["split-pdf"],
  },
  "create-archive": {
    id: "create-archive",
    category: "archive",
    inputs: ["bin"],
    outputs: ["zip", "tar", "tgz"],
    engine: "browser",
    libraries: ["fflate"],
    limits: { files: "multiple", timeoutMs: 10 * MINUTE, maxFileBytes: ARCHIVE_MAX_BYTES },
    status: "verified",
    slugs: { es: "crear-zip", en: "create-zip", pt: "criar-zip", fr: "creer-zip", zh: "create-zip" },
  },
  "extract-archive": {
    id: "extract-archive",
    category: "archive",
    inputs: ["zip", "tar", "tgz", "7z", "rar"],
    outputs: ["bin"],
    engine: "browser",
    libraries: ["fflate", "libarchive 3.8 (own WASM build)", "libarchive-wasm (wrapper)"],
    // The extracted files are also capped: EXTRACT_LIMITS (500 MB, 5000 files).
    limits: { files: "multiple", timeoutMs: 10 * MINUTE, maxFileBytes: ARCHIVE_MAX_BYTES },
    status: "verified",
    slugs: { es: "extraer-zip", en: "extract-zip", pt: "extrair-zip", fr: "extraire-zip", zh: "extract-zip" },
  },
  "image-to-text": {
    id: "image-to-text",
    category: "ocr",
    inputs: ["jpg", "png", "webp", "bmp", "gif", "tiff", "heic", "avif"],
    outputs: ["txt"],
    engine: "browser",
    libraries: ["tesseract.js", "tessdata_best (int)"],
    // Per image: loading the model the first time plus recognizing a dense page on a slow phone.
    limits: { files: "multiple", timeoutMs: 3 * MINUTE, maxFileBytes: OCR_MAX_BYTES },
    status: "verified",
    slugs: { es: "imagen-a-texto", en: "image-to-text", pt: "imagem-para-texto", fr: "image-en-texte", zh: "image-to-text" },
  },
  "ocr-pdf": {
    id: "ocr-pdf",
    category: "ocr",
    inputs: ["pdf"],
    outputs: ["pdf", "txt"],
    engine: "browser",
    libraries: ["pdf.js", "tesseract.js", "pdf-lib"],
    // Per page (MAX_OCR_PAGES pages at most).
    limits: { files: "multiple", timeoutMs: 3 * MINUTE, maxFileBytes: OCR_PDF_MAX_BYTES },
    status: "verified",
    slugs: { es: "ocr-pdf", en: "ocr-pdf", pt: "ocr-pdf", fr: "ocr-pdf", zh: "ocr-pdf" },
  },
  "epub-converter": {
    id: "epub-converter",
    category: "ebook",
    inputs: ["epub"],
    outputs: ["html", "txt"],
    engine: "browser",
    libraries: ["fflate", "fast-xml-parser", "dompurify"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: EPUB_MAX_BYTES },
    status: "verified",
    slugs: { es: "convertir-epub", en: "epub-converter", pt: "converter-epub", fr: "convertir-epub", zh: "epub-converter" },
  },
  "epub-to-pdf": {
    id: "epub-to-pdf",
    category: "ebook",
    inputs: ["epub"],
    outputs: ["pdf"],
    engine: "server",
    libraries: ["fflate", "fast-xml-parser", "dompurify", "parse5", "Gotenberg (Chromium)"],
    // The book is read in the browser, then one request per book; Gotenberg's own limit is 90 s per job.
    limits: { files: "multiple", timeoutMs: 3 * MINUTE, maxFileBytes: EPUB_PDF_MAX_BYTES },
    status: "verified",
    slugs: { es: "epub-a-pdf", en: "epub-to-pdf", pt: "epub-para-pdf", fr: "epub-en-pdf", zh: "epub-to-pdf" },
  },
  "create-epub": {
    id: "create-epub",
    category: "ebook",
    inputs: ["md", "html", "txt"],
    outputs: ["epub"],
    engine: "browser",
    libraries: ["marked", "dompurify", "fflate"],
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: CREATE_EPUB_MAX_BYTES },
    status: "verified",
    slugs: { es: "crear-epub", en: "create-epub", pt: "criar-epub", fr: "creer-epub", zh: "create-epub" },
  },
  "audio-converter": {
    id: "audio-converter",
    category: "audio",
    inputs: ["mp3", "wav", "flac", "ogg", "m4a", "aac", "webm", "aiff"],
    outputs: ["mp3", "wav", "flac", "ogg", "m4a", "aiff"],
    engine: "browser",
    libraries: ["mediabunny", "@mediabunny/mp3-encoder (LAME)", "@mediabunny/flac-encoder (libFLAC)", "@mediabunny/aac-encoder (FFmpeg AAC)", "AIFF reader/writer (own)"],
    // Per file: a long file is decoded and re-encoded faster than real time, but slow phones need room.
    limits: { files: "multiple", timeoutMs: 15 * MINUTE, maxFileBytes: AUDIO_MAX_BYTES },
    status: "verified",
    slugs: { es: "convertir-audio", en: "audio-converter", pt: "converter-audio", fr: "convertir-audio", zh: "audio-converter" },
  },
  "trim-audio": {
    id: "trim-audio",
    category: "audio",
    inputs: ["mp3", "wav", "flac", "ogg", "m4a", "aac", "webm", "aiff"],
    outputs: ["mp3", "wav", "flac", "ogg", "m4a", "aiff"],
    engine: "browser",
    libraries: ["mediabunny", "@mediabunny/mp3-encoder (LAME)", "@mediabunny/flac-encoder (libFLAC)", "@mediabunny/aac-encoder (FFmpeg AAC)", "own fades and AIFF reader/writer"],
    limits: { files: "single", timeoutMs: 15 * MINUTE, maxFileBytes: AUDIO_MAX_BYTES },
    status: "verified",
    slugs: { es: "recortar-audio", en: "trim-audio", pt: "cortar-audio", fr: "couper-audio", zh: "trim-audio" },
  },
  "adjust-audio": {
    id: "adjust-audio",
    category: "audio",
    inputs: ["mp3", "wav", "flac", "ogg", "m4a", "aac", "webm", "aiff"],
    outputs: ["mp3", "wav", "flac", "ogg", "m4a", "aiff"],
    engine: "browser",
    libraries: ["mediabunny", "@mediabunny/mp3-encoder (LAME)", "@mediabunny/flac-encoder (libFLAC)", "@mediabunny/aac-encoder (FFmpeg AAC)", "AIFF reader/writer (own)"],
    limits: { files: "multiple", timeoutMs: 15 * MINUTE, maxFileBytes: AUDIO_MAX_BYTES },
    status: "verified",
    slugs: { es: "ajustar-audio", en: "adjust-audio", pt: "ajustar-audio", fr: "ajuster-audio", zh: "adjust-audio" },
  },
  "normalize-audio": {
    id: "normalize-audio",
    category: "audio",
    inputs: ["mp3", "wav", "flac", "ogg", "m4a", "aac", "webm", "aiff"],
    outputs: ["mp3", "wav", "flac", "ogg", "m4a", "aiff"],
    engine: "browser",
    libraries: ["mediabunny", "@mediabunny/mp3-encoder (LAME)", "@mediabunny/flac-encoder (libFLAC)", "@mediabunny/aac-encoder (FFmpeg AAC)", "own level meter and gain"],
    // Two passes (measure, then convert).
    limits: { files: "multiple", timeoutMs: 20 * MINUTE, maxFileBytes: AUDIO_MAX_BYTES },
    status: "verified",
    slugs: { es: "normalizar-audio", en: "normalize-audio", pt: "normalizar-audio", fr: "normaliser-audio", zh: "normalize-audio" },
  },
  "join-audio": {
    id: "join-audio",
    category: "audio",
    inputs: ["mp3", "wav", "flac", "ogg", "m4a", "aac", "webm", "aiff"],
    outputs: ["mp3", "wav", "flac", "ogg", "m4a", "aiff"],
    engine: "browser",
    libraries: ["mediabunny", "@mediabunny/mp3-encoder (LAME)", "@mediabunny/flac-encoder (libFLAC)", "@mediabunny/aac-encoder (FFmpeg AAC)", "AIFF reader/writer (own)"],
    // The whole join is one job.
    limits: { files: "multiple", timeoutMs: 30 * MINUTE, maxFileBytes: AUDIO_MAX_BYTES },
    status: "verified",
    slugs: { es: "unir-audio", en: "join-audio", pt: "juntar-audio", fr: "fusionner-audio", zh: "join-audio" },
  },
  "text-to-speech": {
    id: "text-to-speech",
    category: "audio",
    inputs: ["txt", "md", "html", "pdf", "docx", "epub", "jpg", "png", "webp", "gif", "bmp", "tiff", "heic", "avif"],
    outputs: ["mp3"],
    engine: "browser",
    // Text extracted on the page (pdf.js, tesseract for images, own DOCX/EPUB readers); read by the
    // device's voices or the Supertonic 3 AI voice (onnxruntime-web), MP3 with mediabunny + LAME.
    libraries: ["Web Speech API", "Supertonic 3 (OpenRAIL-M)", "onnxruntime-web", "pdfjs-dist", "tesseract.js", "fflate", "marked", "mediabunny", "@mediabunny/mp3-encoder (LAME)"],
    // TTS_MAX_CHARS (50,000 characters) per reading; files are read whole to extract their text.
    limits: { files: "single", timeoutMs: 10 * MINUTE, maxFileBytes: 50 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "leer-texto-en-voz-alta", en: "text-to-speech", pt: "ler-texto-em-voz-alta", fr: "lire-texte-a-voix-haute", zh: "text-to-speech" },
    related: ["pdf-to-text", "image-to-text", "epub-converter"],
  },
  "video-converter": {
    id: "video-converter",
    category: "video",
    inputs: ["mp4", "mov", "mkv", "webm"],
    outputs: ["mp4", "webm", "mov", "mkv"],
    engine: "browser",
    libraries: ["mediabunny", "@mediabunny/aac-encoder (FFmpeg AAC)"],
    // Per file: copying the streams takes seconds; re-encoding runs at about real time on slow devices.
    limits: { files: "multiple", timeoutMs: 30 * MINUTE, maxFileBytes: VIDEO_MAX_BYTES },
    status: "verified",
    slugs: { es: "convertir-video", en: "video-converter", pt: "converter-video", fr: "convertir-video", zh: "video-converter" },
  },  "extract-audio": {
    id: "extract-audio",
    category: "video",
    inputs: ["mp4", "mov", "mkv", "webm"],
    outputs: ["m4a", "mp3", "ogg", "flac", "wav", "aiff"],
    engine: "browser",
    libraries: ["mediabunny", "@mediabunny/mp3-encoder (LAME)", "@mediabunny/flac-encoder (libFLAC)", "@mediabunny/aac-encoder (FFmpeg AAC)", "AIFF writer (own)"],
    limits: { files: "multiple", timeoutMs: 15 * MINUTE, maxFileBytes: VIDEO_MAX_BYTES },
    status: "verified",
    slugs: { es: "extraer-audio-de-video", en: "extract-audio-from-video", pt: "extrair-audio-de-video", fr: "extraire-audio-video", zh: "extract-audio-from-video" },
  },  "compress-video": {
    id: "compress-video",
    category: "video",
    inputs: ["mp4", "mov", "mkv", "webm"],
    outputs: ["mp4", "webm"],
    engine: "browser",
    libraries: ["mediabunny", "@mediabunny/aac-encoder (FFmpeg AAC)"],
    // Every frame is decoded and encoded again.
    limits: { files: "multiple", timeoutMs: 30 * MINUTE, maxFileBytes: VIDEO_MAX_BYTES },
    status: "verified",
    slugs: { es: "comprimir-video", en: "compress-video", pt: "comprimir-video", fr: "compresser-video", zh: "compress-video" },
  },  "trim-video": {
    id: "trim-video",
    category: "video",
    inputs: ["mp4", "mov", "mkv", "webm"],
    outputs: ["mp4", "mov", "mkv", "webm"],
    engine: "browser",
    libraries: ["mediabunny", "@mediabunny/aac-encoder (FFmpeg AAC)"],
    limits: { files: "single", timeoutMs: 30 * MINUTE, maxFileBytes: VIDEO_MAX_BYTES },
    status: "verified",
    slugs: { es: "recortar-video", en: "trim-video", pt: "cortar-video", fr: "couper-video", zh: "trim-video" },
  },  "video-to-gif": {
    id: "video-to-gif",
    category: "video",
    inputs: ["mp4", "mov", "mkv", "webm"],
    outputs: ["gif"],
    engine: "browser",
    libraries: ["mediabunny", "gifenc"],
    // At most 300 frames (MAX_GIF_FRAMES), each decoded, scaled and quantized in a worker.
    limits: { files: "single", timeoutMs: 10 * MINUTE, maxFileBytes: VIDEO_MAX_BYTES },
    status: "verified",
    slugs: { es: "video-a-gif", en: "video-to-gif", pt: "video-para-gif", fr: "video-en-gif", zh: "video-to-gif" },
  },
  "video-speed": {
    id: "video-speed",
    category: "video",
    inputs: ["mp4", "mov", "mkv", "webm"],
    outputs: ["mp4", "mov", "mkv", "webm"],
    engine: "browser",
    libraries: ["mediabunny", "@mediabunny/aac-encoder (FFmpeg AAC)"],
    limits: { files: "multiple", timeoutMs: 30 * MINUTE, maxFileBytes: VIDEO_MAX_BYTES },
    status: "verified",
    slugs: { es: "cambiar-velocidad-video", en: "change-video-speed", pt: "alterar-velocidade-video", fr: "changer-vitesse-video", zh: "change-video-speed" },
  },
  "join-videos": {
    id: "join-videos",
    category: "video",
    inputs: ["mp4", "mov", "mkv", "webm"],
    outputs: ["mp4", "webm"],
    engine: "browser",
    libraries: ["mediabunny", "@mediabunny/aac-encoder (FFmpeg AAC)"],
    // The whole result is kept in memory: 2 hours in total (MAX_VIDEO_SECONDS).
    limits: { files: "multiple", timeoutMs: 30 * MINUTE, maxFileBytes: VIDEO_MAX_BYTES },
    status: "verified",
    slugs: { es: "unir-videos", en: "join-videos", pt: "juntar-videos", fr: "fusionner-videos", zh: "join-videos" },
  },
  "model-converter": {
    id: "model-converter",
    category: "3d",
    inputs: ["stl", "obj", "ply", "glb", "gltf", "3mf", "dae", "fbx"],
    outputs: ["stl", "obj", "ply", "glb"],
    engine: "browser",
    libraries: ["three"],
    // Up to MAX_MODEL_TRIANGLES (3 million) per model, parsed and written in a worker.
    limits: { files: "multiple", timeoutMs: 5 * MINUTE, maxFileBytes: MODEL_MAX_BYTES },
    status: "verified",
    slugs: { es: "convertir-modelo-3d", en: "3d-model-converter", pt: "converter-modelo-3d", fr: "convertir-modele-3d", zh: "3d-model-converter" },
  },
  "image-to-lithophane": {
    id: "image-to-lithophane",
    category: "3d",
    inputs: ["jpg", "png", "webp", "gif", "bmp", "avif"],
    outputs: ["stl"],
    engine: "browser",
    libraries: ["native canvas", "own STL writer"],
    // The picture is scaled to at most MAX_LITHOPHANE_POINTS grid points (~1.1 million triangles) in the 3D worker.
    limits: { files: "single", timeoutMs: 2 * MINUTE, maxFileBytes: 50 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "imagen-a-litofania", en: "image-to-lithophane", pt: "imagem-para-litofania", fr: "image-en-lithophanie", zh: "image-to-lithophane" },
  },
  "dxf-converter": {
    id: "dxf-converter",
    category: "cad",
    inputs: ["dxf"],
    outputs: ["svg", "png", "pdf"],
    engine: "browser",
    libraries: ["dxf-parser", "own geometry and SVG writer", "OffscreenCanvas", "pdf-lib"],
    // Up to MAX_DXF_POINTS (5 million) flattened points per drawing, in the CAD worker.
    limits: { files: "multiple", timeoutMs: 2 * MINUTE, maxFileBytes: 50 * 1024 * 1024 },
    status: "verified",
    slugs: { es: "convertir-dxf", en: "dxf-converter", pt: "converter-dxf", fr: "convertir-dxf", zh: "dxf-converter" },
  },





};

/** Published tools: only verified ones get pages, links and sitemap entries. */
export const availableTools: readonly ToolId[] = toolIds.filter((id) => tools[id].status === "verified");

/**
 * Tools featured on the home page: the most searched tasks first (PDF and
 * images), then one per area so the variety shows at a glance.
 */
export const popularTools: readonly ToolId[] = [
  "compress-pdf",
  "merge-pdf",
  "compress-image",
  "remove-background",
  "sign-pdf",
  "id-photo",
  "image-to-text",
  "video-converter",
  "extract-archive",
  "qr-generator",
  "audio-converter",
  "split-pdf",
].filter((id) => tools[id as ToolId].status === "verified") as ToolId[];

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

/** How many formats two lists share. */
const shared = (a: readonly FormatId[], b: readonly FormatId[]) => a.filter((f) => b.includes(f)).length;

/**
 * Published tools to link from a tool's page: up to 4 of the same category,
 * its nearest neighbors in registry order going round (so every tool of a
 * big category is linked from two others), then its explicit pairs (`related`,
 * both ways), then tools of other categories that take this tool's output
 * ("next step") or read the same files.
 */
export function relatedTools(id: ToolId, max = 6): ToolInfo[] {
  const tool = tools[id];
  // Explicit pairs first, in both directions.
  const pinned = [...(tool.related ?? []), ...availableTools.filter((other) => tools[other].related?.includes(id))]
    .filter((other, i, list) => other !== id && availableTools.includes(other) && list.indexOf(other) === i)
    .map((other) => tools[other]);
  const category = toolsInCategory(tool.category);
  const at = category.findIndex((t) => t.id === id);
  // Alternating after and before: +1, -1, +2, -2...
  const sameCategory = Array.from({ length: category.length - 1 }, (_, i) => {
    const step = Math.floor(i / 2) + 1;
    return category[(at + (i % 2 === 0 ? step : category.length - step)) % category.length]!;
  }).filter((t, i, list) => list.indexOf(t) === i);
  // Plain text is read by most text tools: as an output it says nothing about the next step.
  const outputs = tool.outputs.filter((f) => f !== "txt");
  const nextStep = (other: ToolInfo) => (shared(other.inputs, outputs) > 0 ? 3 : 0) + Math.min(shared(other.inputs, tool.inputs), 2);
  const otherCategories = availableTools
    .map((other) => tools[other])
    .filter((other) => other.category !== tool.category && nextStep(other) > 0)
    .sort((a, b) => nextStep(b) - nextStep(a));
  const others = [...pinned, ...otherCategories.filter((t) => !pinned.includes(t))];
  const fromCategory = sameCategory.filter((t) => !pinned.includes(t));
  const keep = Math.max(Math.min(4, max - pinned.length), max - others.length);
  return [...fromCategory.slice(0, keep), ...others].slice(0, max);
}

/** Published tools to link from a conversion page: the ones that take its result, then its input. */
export function toolsForConversion(conversion: Pick<Conversion, "from" | "to">, max = 4): ToolInfo[] {
  const score = (tool: ToolInfo) => (tool.inputs.includes(conversion.to) ? 2 : 0) + (tool.inputs.includes(conversion.from) ? 1 : 0);
  return availableTools
    .map((id) => tools[id])
    .filter((tool) => score(tool) > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, max);
}
