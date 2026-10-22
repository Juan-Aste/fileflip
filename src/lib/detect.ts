import { formatFromExtension, type FormatId } from "@/config/formats";

/** How many leading bytes `detectFormat` needs for reliable results. */
export const SNIFF_BYTES = 64 * 1024;

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0) {
  return signature.every((b, i) => bytes[offset + i] === b);
}

function includesAscii(bytes: Uint8Array, needle: string) {
  // latin1 decoding keeps a 1:1 byte/char mapping.
  return new TextDecoder("latin1").decode(bytes).includes(needle);
}

const AVIF_BRANDS = new Set(["avif", "avis"]);
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

/** ISO-BMFF `ftyp` box: decides between AVIF and HEIC. */
function detectFtyp(bytes: Uint8Array): FormatId | null {
  if (ascii(bytes, 4, 4) !== "ftyp") return null;
  const size = Math.min(
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0,
    bytes.length,
  );
  const brands = [ascii(bytes, 8, 4)];
  for (let i = 16; i + 4 <= size; i += 4) brands.push(ascii(bytes, i, 4));
  if (brands.some((b) => AVIF_BRANDS.has(b))) return "avif";
  if (brands.some((b) => HEIC_BRANDS.has(b))) return "heic";
  return null;
}

/** ZIP containers: OpenDocument and EPUB (mimetype entry) or Office Open XML (part names). */
function detectZip(bytes: Uint8Array, ext: FormatId | null): FormatId | null {
  if (ascii(bytes, 30, 8) === "mimetype") {
    const mime = ascii(bytes, 38, 50);
    if (mime.startsWith("application/vnd.oasis.opendocument.text")) return "odt";
    if (mime.startsWith("application/vnd.oasis.opendocument.spreadsheet")) return "ods";
    if (mime.startsWith("application/vnd.oasis.opendocument.presentation")) return "odp";
    if (mime.startsWith("application/epub+zip")) return "epub";
  }
  if (includesAscii(bytes, "word/")) return "docx";
  if (includesAscii(bytes, "xl/")) return "xlsx";
  if (includesAscii(bytes, "ppt/")) return "pptx";
  // Part names may sit beyond the sniffed bytes; trust a matching extension.
  return ext === "docx" || ext === "xlsx" || ext === "pptx" ? ext : null;
}

function looksLikeText(bytes: Uint8Array) {
  if (bytes.length === 0) return false;
  // Control characters other than tab, newlines and form feed mean binary data.
  const binary = bytes.some(
    (b) => (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0c && b !== 0x0d) || b === 0x7f,
  );
  if (binary) return false;
  // Accepts UTF-8 as well as legacy single-byte text (e.g. Windows-1252 CSVs).
  return true;
}

function isSvg(bytes: Uint8Array) {
  const head = new TextDecoder("utf-8").decode(bytes.subarray(0, 4096)).trimStart().toLowerCase();
  return (head.startsWith("<?xml") || head.startsWith("<svg") || head.startsWith("<!--") || head.startsWith("<!doctype svg")) && head.includes("<svg");
}

/**
 * Detects the real format of a file from its content (magic bytes).
 * The file name is only used to disambiguate containers (OLE2, text files).
 * Returns null when the content is not a supported format.
 */
export function detectFormat(bytes: Uint8Array, filename = ""): FormatId | null {
  const ext = formatFromExtension(filename);

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return "gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  // "BM" alone could start a text file; also require a known DIB header size.
  if (ascii(bytes, 0, 2) === "BM" && [12, 40, 52, 56, 64, 108, 124].includes(bytes[14] | (bytes[15] << 8)) && bytes[16] === 0 && bytes[17] === 0) return "bmp";
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) return "tiff";
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00]) && bytes[4] > 0) return "ico";
  const ftyp = detectFtyp(bytes);
  if (ftyp) return ftyp;
  // Some PDF writers put junk before the header; readers accept it in the first 1 KB.
  if (includesAscii(bytes.subarray(0, 1024), "%PDF-")) return "pdf";
  if (ascii(bytes, 0, 5) === "{\\rtf") return "rtf";
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return detectZip(bytes, ext);
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    // Legacy Office (OLE2) files share one signature; the extension tells them apart.
    return ext === "xls" || ext === "ppt" ? ext : "doc";
  }
  if (isSvg(bytes)) return "svg";
  if (looksLikeText(bytes)) return ext === "csv" ? "csv" : "txt";
  return null;
}

/** Reads the first bytes of a File/Blob and detects its format. */
export async function detectFileFormat(file: Blob & { name?: string }): Promise<FormatId | null> {
  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  return detectFormat(head, file.name ?? "");
}
