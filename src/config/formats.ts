// Registry of supported file formats and the conversions between them.
// `engine` says where a conversion runs: on the user's device or on our server.

export type FormatId =
  | "jpg"
  | "png"
  | "webp"
  | "avif"
  | "gif"
  | "bmp"
  | "tiff"
  | "ico"
  | "heic"
  | "svg"
  | "pdf"
  | "docx"
  | "doc"
  | "xlsx"
  | "xls"
  | "csv"
  | "pptx"
  | "ppt"
  | "odt"
  | "ods"
  | "odp"
  | "rtf"
  | "txt"
  | "json"
  | "tsv"
  | "yaml"
  | "toml"
  | "xml"
  | "base64"
  | "bin"
  | "srt"
  | "vtt"
  | "ass"
  | "ssa";

/** "data" formats are only read and written by the data tools, not the converter. */
export type FormatCategory = "image" | "pdf" | "document" | "data";
export type Engine = "browser" | "server";

export interface FormatInfo {
  id: FormatId;
  /** Short label shown in the UI (not translated: it is the format name). */
  label: string;
  mime: string;
  extensions: readonly string[];
  category: FormatCategory;
}

export const formats: Record<FormatId, FormatInfo> = {
  jpg: { id: "jpg", label: "JPG", mime: "image/jpeg", extensions: ["jpg", "jpeg", "jfif"], category: "image" },
  png: { id: "png", label: "PNG", mime: "image/png", extensions: ["png"], category: "image" },
  webp: { id: "webp", label: "WEBP", mime: "image/webp", extensions: ["webp"], category: "image" },
  avif: { id: "avif", label: "AVIF", mime: "image/avif", extensions: ["avif"], category: "image" },
  gif: { id: "gif", label: "GIF", mime: "image/gif", extensions: ["gif"], category: "image" },
  bmp: { id: "bmp", label: "BMP", mime: "image/bmp", extensions: ["bmp"], category: "image" },
  tiff: { id: "tiff", label: "TIFF", mime: "image/tiff", extensions: ["tif", "tiff"], category: "image" },
  ico: { id: "ico", label: "ICO", mime: "image/x-icon", extensions: ["ico"], category: "image" },
  heic: { id: "heic", label: "HEIC", mime: "image/heic", extensions: ["heic", "heif"], category: "image" },
  svg: { id: "svg", label: "SVG", mime: "image/svg+xml", extensions: ["svg"], category: "image" },
  pdf: { id: "pdf", label: "PDF", mime: "application/pdf", extensions: ["pdf"], category: "pdf" },
  docx: { id: "docx", label: "Word", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extensions: ["docx"], category: "document" },
  doc: { id: "doc", label: "Word 97", mime: "application/msword", extensions: ["doc"], category: "document" },
  xlsx: { id: "xlsx", label: "Excel", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extensions: ["xlsx"], category: "document" },
  xls: { id: "xls", label: "Excel 97", mime: "application/vnd.ms-excel", extensions: ["xls"], category: "document" },
  csv: { id: "csv", label: "CSV", mime: "text/csv", extensions: ["csv"], category: "document" },
  pptx: { id: "pptx", label: "PowerPoint", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", extensions: ["pptx"], category: "document" },
  ppt: { id: "ppt", label: "PowerPoint 97", mime: "application/vnd.ms-powerpoint", extensions: ["ppt"], category: "document" },
  odt: { id: "odt", label: "ODT", mime: "application/vnd.oasis.opendocument.text", extensions: ["odt"], category: "document" },
  ods: { id: "ods", label: "ODS", mime: "application/vnd.oasis.opendocument.spreadsheet", extensions: ["ods"], category: "document" },
  odp: { id: "odp", label: "ODP", mime: "application/vnd.oasis.opendocument.presentation", extensions: ["odp"], category: "document" },
  rtf: { id: "rtf", label: "RTF", mime: "application/rtf", extensions: ["rtf"], category: "document" },
  txt: { id: "txt", label: "TXT", mime: "text/plain", extensions: ["txt"], category: "document" },
  json: { id: "json", label: "JSON", mime: "application/json", extensions: ["json"], category: "data" },
  tsv: { id: "tsv", label: "TSV", mime: "text/tab-separated-values", extensions: ["tsv", "tab"], category: "data" },
  yaml: { id: "yaml", label: "YAML", mime: "application/yaml", extensions: ["yaml", "yml"], category: "data" },
  toml: { id: "toml", label: "TOML", mime: "application/toml", extensions: ["toml"], category: "data" },
  xml: { id: "xml", label: "XML", mime: "application/xml", extensions: ["xml"], category: "data" },
  base64: { id: "base64", label: "Base64", mime: "text/plain", extensions: ["b64", "base64"], category: "data" },
  /** Any file, as raw bytes (Base64 tools). */
  srt: { id: "srt", label: "SRT", mime: "application/x-subrip", extensions: ["srt"], category: "data" },
  vtt: { id: "vtt", label: "VTT", mime: "text/vtt", extensions: ["vtt"], category: "data" },
  ass: { id: "ass", label: "ASS", mime: "text/x-ssa", extensions: ["ass"], category: "data" },
  ssa: { id: "ssa", label: "SSA", mime: "text/x-ssa", extensions: ["ssa"], category: "data" },
  bin: { id: "bin", label: "BIN", mime: "application/octet-stream", extensions: ["bin"], category: "data" },
};

/** Raster formats we can encode as output in the browser. */
export const imageOutputs = ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "ico"] as const satisfies readonly FormatId[];

const imageInputs: readonly FormatId[] = ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "ico", "heic", "svg"];
const officeInputs: readonly FormatId[] = ["docx", "doc", "xlsx", "xls", "csv", "pptx", "ppt", "odt", "ods", "odp", "rtf", "txt"];

export interface Conversion {
  from: FormatId;
  to: FormatId;
  engine: Engine;
}

/** Formats that can be re-encoded into themselves to compress or resize. */
export const recompressible: readonly FormatId[] = ["jpg", "png", "webp", "avif"];

function buildConversions(): Conversion[] {
  const list: Conversion[] = [];
  for (const from of imageInputs) {
    for (const to of imageOutputs) {
      if (to !== from || recompressible.includes(from)) list.push({ from, to, engine: "browser" });
    }
    list.push({ from, to: "pdf", engine: "browser" });
  }
  list.push({ from: "pdf", to: "jpg", engine: "browser" });
  list.push({ from: "pdf", to: "png", engine: "browser" });
  list.push({ from: "pdf", to: "docx", engine: "server" });
  for (const from of officeInputs) list.push({ from, to: "pdf", engine: "server" });
  return list;
}

export const conversions: readonly Conversion[] = buildConversions();

/** Valid output formats for a detected input, in display order. */
export function outputsFor(from: FormatId): Conversion[] {
  return conversions.filter((c) => c.from === from);
}

export function findConversion(from: FormatId, to: FormatId): Conversion | undefined {
  return conversions.find((c) => c.from === from && c.to === to);
}

export function formatFromExtension(filename: string): FormatId | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (!filename.includes(".")) return null;
  const match = Object.values(formats).find((f) => f.extensions.includes(ext));
  return match?.id ?? null;
}

/** Output file name: same base name with the new extension. */
export function outputFilename(filename: string, to: FormatId): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  return `${base || "file"}.${formats[to].extensions[0]}`;
}

/** Outputs every input can be converted to (for a batch), keeping display order. */
export function commonOutputs(inputs: readonly FormatId[]): Conversion[] {
  if (inputs.length === 0) return [];
  const [first, ...rest] = [...new Set(inputs)];
  return outputsFor(first).filter((c) =>
    rest.every((from) => findConversion(from, c.to)),
  );
}
