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
  | "ssa"
  | "ttf"
  | "otf"
  | "woff"
  | "woff2"
  | "md"
  | "html"
  | "zip"
  | "tar"
  | "tgz"
  | "7z"
  | "rar"
  | "epub"
  | "mp3"
  | "wav"
  | "flac"
  | "ogg"
  | "m4a"
  | "aac"
  | "webm"
  | "aiff"
  | "stl"
  | "obj"
  | "ply"
  | "glb"
  | "gltf"
  | "3mf"
  | "dae"
  | "fbx"
  | "dxf"
  | "mp4"
  | "mov"
  | "mkv"
  // Old formats, read only through the FFmpeg WASM fallback (src/lib/legacy-media).
  | "avi"
  | "wmv"
  | "flv"
  | "mpg"
  | "vob"
  | "3gp"
  | "rm"
  | "wma"
  | "amr"
  | "ac3";

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
  ttf: { id: "ttf", label: "TTF", mime: "font/ttf", extensions: ["ttf"], category: "data" },
  otf: { id: "otf", label: "OTF", mime: "font/otf", extensions: ["otf"], category: "data" },
  woff: { id: "woff", label: "WOFF", mime: "font/woff", extensions: ["woff"], category: "data" },
  woff2: { id: "woff2", label: "WOFF2", mime: "font/woff2", extensions: ["woff2"], category: "data" },
  md: { id: "md", label: "Markdown", mime: "text/markdown", extensions: ["md", "markdown"], category: "data" },
  html: { id: "html", label: "HTML", mime: "text/html", extensions: ["html", "htm"], category: "data" },
  zip: { id: "zip", label: "ZIP", mime: "application/zip", extensions: ["zip"], category: "data" },
  tar: { id: "tar", label: "TAR", mime: "application/x-tar", extensions: ["tar"], category: "data" },
  tgz: { id: "tgz", label: "TAR.GZ", mime: "application/gzip", extensions: ["tgz", "gz"], category: "data" },
  "7z": { id: "7z", label: "7Z", mime: "application/x-7z-compressed", extensions: ["7z"], category: "data" },
  rar: { id: "rar", label: "RAR", mime: "application/vnd.rar", extensions: ["rar"], category: "data" },
  epub: { id: "epub", label: "EPUB", mime: "application/epub+zip", extensions: ["epub"], category: "data" },
  mp3: { id: "mp3", label: "MP3", mime: "audio/mpeg", extensions: ["mp3"], category: "data" },
  wav: { id: "wav", label: "WAV", mime: "audio/wav", extensions: ["wav", "wave"], category: "data" },
  flac: { id: "flac", label: "FLAC", mime: "audio/flac", extensions: ["flac"], category: "data" },
  ogg: { id: "ogg", label: "OGG", mime: "audio/ogg", extensions: ["ogg", "oga", "opus"], category: "data" },
  m4a: { id: "m4a", label: "M4A", mime: "audio/mp4", extensions: ["m4a"], category: "data" },
  aac: { id: "aac", label: "AAC", mime: "audio/aac", extensions: ["aac"], category: "data" },
  mp4: { id: "mp4", label: "MP4", mime: "video/mp4", extensions: ["mp4", "m4v"], category: "data" },
  mov: { id: "mov", label: "MOV", mime: "video/quicktime", extensions: ["mov", "qt"], category: "data" },
  mkv: { id: "mkv", label: "MKV", mime: "video/x-matroska", extensions: ["mkv"], category: "data" },
  avi: { id: "avi", label: "AVI", mime: "video/x-msvideo", extensions: ["avi"], category: "data" },
  wmv: { id: "wmv", label: "WMV", mime: "video/x-ms-wmv", extensions: ["wmv", "asf"], category: "data" },
  flv: { id: "flv", label: "FLV", mime: "video/x-flv", extensions: ["flv"], category: "data" },
  mpg: { id: "mpg", label: "MPG", mime: "video/mpeg", extensions: ["mpg", "mpeg", "m1v", "m2v"], category: "data" },
  vob: { id: "vob", label: "VOB", mime: "video/dvd", extensions: ["vob"], category: "data" },
  "3gp": { id: "3gp", label: "3GP", mime: "video/3gpp", extensions: ["3gp", "3g2"], category: "data" },
  rm: { id: "rm", label: "RM", mime: "application/vnd.rn-realmedia", extensions: ["rm", "rmvb"], category: "data" },
  wma: { id: "wma", label: "WMA", mime: "audio/x-ms-wma", extensions: ["wma"], category: "data" },
  amr: { id: "amr", label: "AMR", mime: "audio/amr", extensions: ["amr", "awb"], category: "data" },
  ac3: { id: "ac3", label: "AC3", mime: "audio/ac3", extensions: ["ac3"], category: "data" },
  webm: { id: "webm", label: "WEBM", mime: "audio/webm", extensions: ["webm", "weba"], category: "data" },
  aiff: { id: "aiff", label: "AIFF", mime: "audio/aiff", extensions: ["aiff", "aif", "aifc"], category: "data" },
  stl: { id: "stl", label: "STL", mime: "model/stl", extensions: ["stl"], category: "data" },
  obj: { id: "obj", label: "OBJ", mime: "model/obj", extensions: ["obj"], category: "data" },
  ply: { id: "ply", label: "PLY", mime: "application/x-ply", extensions: ["ply"], category: "data" },
  glb: { id: "glb", label: "GLB", mime: "model/gltf-binary", extensions: ["glb"], category: "data" },
  gltf: { id: "gltf", label: "glTF", mime: "model/gltf+json", extensions: ["gltf"], category: "data" },
  "3mf": { id: "3mf", label: "3MF", mime: "model/3mf", extensions: ["3mf"], category: "data" },
  dae: { id: "dae", label: "DAE", mime: "model/vnd.collada+xml", extensions: ["dae"], category: "data" },
  fbx: { id: "fbx", label: "FBX", mime: "application/octet-stream", extensions: ["fbx"], category: "data" },
  dxf: { id: "dxf", label: "DXF", mime: "image/vnd.dxf", extensions: ["dxf"], category: "data" },
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
