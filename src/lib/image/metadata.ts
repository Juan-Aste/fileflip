// Lossless metadata removal: the compressed pixels are copied byte for byte
// and only the metadata containers are dropped (EXIF, XMP, IPTC, comments,
// text chunks). A JPEG keeps a tiny EXIF block with just its orientation, so
// a photo taken sideways still shows upright without being re-encoded.

export interface Stripped {
  bytes: Uint8Array;
  /** EXIF orientation (1–8) kept in the output; 1 when none. */
  orientation: number;
}

export class MalformedImageError extends Error {}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

/** Orientation from an EXIF (TIFF) block, or 1. */
function exifOrientation(tiff: Uint8Array): number {
  if (tiff.length < 8) return 1;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const little = view.getUint16(0) === 0x4949;
  const ifd = view.getUint32(4, little);
  if (ifd + 2 > tiff.length) return 1;
  const entries = view.getUint16(ifd, little);
  for (let i = 0; i < entries; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 10 > tiff.length) return 1;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/** APP1 segment holding only the Orientation tag. */
function orientationApp1(orientation: number) {
  const tiff = [
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // "II*", IFD0 at 8
    0x01, 0x00, // one entry
    0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00, // Orientation, SHORT, 1
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ];
  const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff]; // "Exif\0\0"
  const length = payload.length + 2;
  return new Uint8Array([0xff, 0xe1, length >> 8, length & 0xff, ...payload]);
}

/**
 * Keeps the markers needed to decode the image (tables, frame, scans), JFIF,
 * the ICC color profile and Adobe's color transform; drops other APPn
 * segments and comments, and anything after the end of the image (phones
 * append extra pictures there, each with its own EXIF).
 */
export function stripJpeg(bytes: Uint8Array): Stripped {
  const n = bytes.length;
  if (n < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new MalformedImageError("Not a JPEG");
  const kept: Uint8Array[] = [];
  let orientation = 1;
  let i = 2;
  while (i + 1 < n) {
    if (bytes[i] !== 0xff) throw new MalformedImageError("Bad marker");
    const marker = bytes[i + 1]!;
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0xd9) {
      kept.push(bytes.subarray(i, i + 2));
      const head = orientation === 1 ? [] : [orientationApp1(orientation)];
      return { bytes: concat([bytes.subarray(0, 2), ...head, ...kept]), orientation };
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      kept.push(bytes.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 3 >= n) throw new MalformedImageError("Truncated");
    const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    const end = i + 2 + length;
    if (length < 2 || end > n) throw new MalformedImageError("Truncated");
    const segment = bytes.subarray(i, end);
    const isApp = marker >= 0xe0 && marker <= 0xef;
    if (marker === 0xe1 && ascii(bytes, i + 4, 6) === "Exif\0\0") {
      orientation = exifOrientation(bytes.subarray(i + 10, end));
    }
    const keep =
      !isApp && marker !== 0xfe
        ? true
        : marker === 0xe0 && ascii(bytes, i + 4, 5) === "JFIF\0"
          ? true
          : marker === 0xe2 && ascii(bytes, i + 4, 12) === "ICC_PROFILE\0"
            ? true
            : marker === 0xee && ascii(bytes, i + 4, 5) === "Adobe";
    if (keep) kept.push(segment);
    i = end;
    if (marker === 0xda) {
      // Entropy-coded data up to the next real marker.
      const start = i;
      while (i + 1 < n) {
        if (bytes[i] === 0xff) {
          const next = bytes[i + 1]!;
          if (next !== 0x00 && next !== 0xff && !(next >= 0xd0 && next <= 0xd7)) break;
          i += next === 0xff ? 1 : 2;
        } else i++;
      }
      kept.push(bytes.subarray(start, i));
    }
  }
  throw new MalformedImageError("No end of image");
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Text and EXIF chunks; color (iCCP, sRGB, gAMA…), pHYs and animation chunks stay. */
const PNG_METADATA = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

export function stripPng(bytes: Uint8Array): Stripped {
  if (bytes.length < 8 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) throw new MalformedImageError("Not a PNG");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const kept: Uint8Array[] = [bytes.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= bytes.length) {
    const length = view.getUint32(i);
    const type = ascii(bytes, i + 4, 4);
    const end = i + 12 + length;
    if (end > bytes.length) break;
    if (!PNG_METADATA.has(type)) kept.push(bytes.subarray(i, end));
    if (type === "IEND") return { bytes: concat(kept), orientation: 1 };
    i = end;
  }
  throw new MalformedImageError("No IEND");
}

/** RIFF chunks of a WEBP file, with their (padded) bounds. */
function webpChunks(bytes: Uint8Array) {
  if (bytes.length < 12 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
    throw new MalformedImageError("Not a WEBP");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: { type: string; start: number; data: number; size: number; end: number }[] = [];
  let i = 12;
  while (i + 8 <= bytes.length) {
    const size = view.getUint32(i + 4, true);
    const end = i + 8 + size + (size & 1);
    if (i + 8 + size > bytes.length) throw new MalformedImageError("Truncated");
    chunks.push({ type: ascii(bytes, i, 4), start: i, data: i + 8, size, end: Math.min(end, bytes.length) });
    i = end;
  }
  if (!chunks.some((c) => c.type === "VP8 " || c.type === "VP8L" || c.type === "ANIM")) {
    throw new MalformedImageError("No image data");
  }
  return chunks;
}

/** The EXIF block of a WEBP (TIFF data, without the optional "Exif\0\0" prefix), if any. */
export function webpExif(bytes: Uint8Array): Uint8Array | null {
  const chunk = webpChunks(bytes).find((c) => c.type === "EXIF");
  if (!chunk) return null;
  const data = bytes.subarray(chunk.data, chunk.data + chunk.size);
  return ascii(data, 0, 6) === "Exif\0\0" ? data.subarray(6) : data;
}

export function stripWebp(bytes: Uint8Array): Stripped {
  const kept: Uint8Array[] = [];
  for (const chunk of webpChunks(bytes)) {
    if (chunk.type === "EXIF" || chunk.type === "XMP ") continue;
    const copy = bytes.slice(chunk.start, chunk.end);
    // VP8X flags: clear "has EXIF" (0x08) and "has XMP" (0x04).
    if (chunk.type === "VP8X" && copy.length > 8) copy[8] = copy[8]! & ~0x0c;
    kept.push(copy);
  }
  const body = concat(kept);
  const header = new Uint8Array(12);
  header.set([0x52, 0x49, 0x46, 0x46]); // RIFF
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  header.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  return { bytes: concat([header, body]), orientation: 1 };
}

export interface MetadataSummary {
  gps?: { latitude: number; longitude: number };
  camera?: string;
  /** ISO date the photo was taken (or modified). */
  date?: string;
  software?: string;
  author?: string;
}

/** What a user cares about in exifr's output: where, with what, when, by whom. */
export function summarizeMetadata(tags: Record<string, unknown> | undefined | null): MetadataSummary {
  if (!tags) return {};
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const summary: MetadataSummary = {};
  const { latitude, longitude } = tags as { latitude?: unknown; longitude?: unknown };
  if (typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    summary.gps = { latitude, longitude };
  }
  const make = text(tags.Make);
  const model = text(tags.Model);
  const camera = make && model && !model.toLowerCase().startsWith(make.toLowerCase()) ? `${make} ${model}` : (model ?? make);
  if (camera) summary.camera = camera;
  const date = [tags.DateTimeOriginal, tags.CreateDate, tags.ModifyDate].find((d) => d instanceof Date && !Number.isNaN(d.getTime()));
  if (date) summary.date = (date as Date).toISOString();
  const software = text(tags.Software);
  if (software) summary.software = software;
  const author = text(tags.Artist) ?? text(tags.creator) ?? text(tags.Copyright);
  if (author) summary.author = author;
  return summary;
}
