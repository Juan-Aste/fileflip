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
  "protect-pdf",
  "unlock-pdf",
  "extract-pdf-images",
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
  "color-converter",
  "unit-converter",
  "compress-image",
  "resize-image",
  "rotate-image",
  "remove-exif",
  "crop-image",
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
/** A feature film's subtitles are ~100 KB; this leaves room for long series files. */
const SUBTITLE_MAX_BYTES = 10 * 1024 * 1024;
/** qpdf holds the PDF and its encrypted copy in WASM memory (max. 2 GB address space). */
const PDF_PASSWORD_MAX_BYTES = 200 * 1024 * 1024;
/** Same cap as the font engine (MAX_FONT_BYTES): bigger than any real font. */
const FONT_MAX_BYTES = 40 * 1024 * 1024;
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
