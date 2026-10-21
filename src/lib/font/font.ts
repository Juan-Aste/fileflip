// Font containers: TrueType/OpenType (sfnt) ↔ WOFF ↔ WOFF2. WOFF 1.0 is a
// zlib wrapper per table, done here with fflate; WOFF2 (Brotli plus glyph
// transforms) uses Google's reference encoder compiled to WASM, passed in so
// the worker loads it lazily. The outlines are never converted: a TrueType
// font stays TrueType (.ttf) and a CFF one stays CFF (.otf).
import { unzlibSync, zlibSync } from "fflate";
import { ConversionError } from "@/lib/convert-error";

export type FontContainer = "sfnt" | "woff" | "woff2";
/** Outline flavor: TrueType glyphs (.ttf) or CFF (.otf). */
export type FontFlavor = "ttf" | "otf";

export interface Woff2Codec {
  compress(sfnt: Uint8Array): Promise<Uint8Array>;
  decompress(woff2: Uint8Array): Promise<Uint8Array>;
}

/** Larger than any real web or desktop font (CJK families are 5–20 MB); also the cap for what a WOFF may inflate to. */
export const MAX_FONT_BYTES = 40 * 1024 * 1024;
const MAX_TABLES = 256;

const damaged = () => new ConversionError("fileDamaged");
const tagOf = (b: Uint8Array, at: number) => String.fromCharCode(b[at]!, b[at + 1]!, b[at + 2]!, b[at + 3]!);
const view = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);

function flavorOf(tag: string): FontFlavor | null {
  if (tag === "\0\x01\0\0" || tag === "true") return "ttf";
  if (tag === "OTTO") return "otf";
  return null;
}

/** What a file is, from its first bytes; null when it isn't a single font we can read (collections included). */
export function detectFont(bytes: Uint8Array): { container: FontContainer; flavor: FontFlavor } | null {
  if (bytes.length < 12) return null;
  const sig = tagOf(bytes, 0);
  if (sig === "wOFF" || sig === "wOF2") {
    const flavor = flavorOf(tagOf(bytes, 4));
    return flavor && { container: sig === "wOFF" ? "woff" : "woff2", flavor };
  }
  const flavor = flavorOf(sig);
  return flavor && { container: "sfnt", flavor };
}

interface Table {
  tag: string;
  checksum: number;
  data: Uint8Array;
}

/** Tables of an sfnt, checked to lie inside the file; the font must have outlines. */
function readSfnt(bytes: Uint8Array): Table[] {
  if (bytes.length < 12 || bytes.length > MAX_FONT_BYTES) throw damaged();
  const v = view(bytes);
  const n = v.getUint16(4);
  if (!n || n > MAX_TABLES || 12 + n * 16 > bytes.length) throw damaged();
  const tables: Table[] = [];
  for (let i = 0; i < n; i++) {
    const at = 12 + i * 16;
    const offset = v.getUint32(at + 8);
    const length = v.getUint32(at + 12);
    if (offset + length > bytes.length) throw damaged();
    tables.push({ tag: tagOf(bytes, at), checksum: v.getUint32(at + 4), data: bytes.subarray(offset, offset + length) });
  }
  checkTables(tables);
  return tables;
}

function checkTables(tables: Table[]) {
  const tags = new Set(tables.map((t) => t.tag));
  const outlines = (tags.has("glyf") && tags.has("loca")) || tags.has("CFF ") || tags.has("CFF2");
  if (!tags.has("head") || !tags.has("cmap") || !outlines) throw damaged();
}

const pad = (n: number) => (n + 3) & ~3;

/** Writes an sfnt with the tables sorted by tag and 4-byte aligned. */
function writeSfnt(flavor: number, tables: Table[]): Uint8Array {
  const sorted = [...tables].sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const n = sorted.length;
  const size = 12 + n * 16 + sorted.reduce((s, t) => s + pad(t.data.length), 0);
  const out = new Uint8Array(size);
  const v = view(out);
  const search = 2 ** Math.floor(Math.log2(n));
  v.setUint32(0, flavor);
  v.setUint16(4, n);
  v.setUint16(6, search * 16);
  v.setUint16(8, Math.log2(search));
  v.setUint16(10, n * 16 - search * 16);
  let offset = 12 + n * 16;
  sorted.forEach((t, i) => {
    const at = 12 + i * 16;
    for (let k = 0; k < 4; k++) out[at + k] = t.tag.charCodeAt(k);
    v.setUint32(at + 4, t.checksum);
    v.setUint32(at + 8, offset);
    v.setUint32(at + 12, t.data.length);
    out.set(t.data, offset);
    offset += pad(t.data.length);
  });
  return out;
}

/** WOFF 1.0 → sfnt, refusing tables that claim to inflate beyond MAX_FONT_BYTES (zip bombs). */
export function woffToSfnt(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 44) throw damaged();
  const v = view(bytes);
  const n = v.getUint16(12);
  const total = v.getUint32(16);
  if (!n || n > MAX_TABLES || 44 + n * 20 > bytes.length || total > MAX_FONT_BYTES) throw damaged();
  const tables: Table[] = [];
  let inflated = 0;
  for (let i = 0; i < n; i++) {
    const at = 44 + i * 20;
    const offset = v.getUint32(at + 4);
    const compLength = v.getUint32(at + 8);
    const origLength = v.getUint32(at + 12);
    inflated += origLength;
    if (offset + compLength > bytes.length || compLength > origLength || inflated > MAX_FONT_BYTES) throw damaged();
    const raw = bytes.subarray(offset, offset + compLength);
    let data = raw;
    if (compLength < origLength) {
      try {
        // A fixed output buffer: fflate stops there whatever the stream claims.
        data = unzlibSync(raw, { out: new Uint8Array(origLength) });
      } catch {
        throw damaged();
      }
      if (data.length !== origLength) throw damaged();
    }
    tables.push({ tag: tagOf(bytes, at), checksum: v.getUint32(at + 16), data });
  }
  checkTables(tables);
  return writeSfnt(v.getUint32(4), tables);
}

/** sfnt → WOFF 1.0: each table zlib-compressed when that makes it smaller. */
export function sfntToWoff(bytes: Uint8Array): Uint8Array {
  const tables = readSfnt(bytes).sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const stored = tables.map((t) => {
    const z = zlibSync(t.data, { level: 9 });
    return z.length < t.data.length ? z : t.data;
  });
  const n = tables.length;
  const size = 44 + n * 20 + stored.reduce((s, d) => s + pad(d.length), 0);
  const out = new Uint8Array(size);
  const v = view(out);
  out.set([0x77, 0x4f, 0x46, 0x46]); // "wOFF"
  v.setUint32(4, view(bytes).getUint32(0));
  v.setUint32(8, size);
  v.setUint16(12, n);
  v.setUint32(16, 12 + n * 16 + tables.reduce((s, t) => s + pad(t.data.length), 0));
  v.setUint16(20, 1);
  let offset = 44 + n * 20;
  tables.forEach((t, i) => {
    const at = 44 + i * 20;
    for (let k = 0; k < 4; k++) out[at + k] = t.tag.charCodeAt(k);
    v.setUint32(at + 4, offset);
    v.setUint32(at + 8, stored[i]!.length);
    v.setUint32(at + 12, t.data.length);
    v.setUint32(at + 16, t.checksum);
    out.set(stored[i]!, offset);
    offset += pad(stored[i]!.length);
  });
  return out;
}

async function toSfnt(bytes: Uint8Array, container: FontContainer, codec: () => Promise<Woff2Codec>): Promise<Uint8Array> {
  if (container === "sfnt") return bytes;
  if (container === "woff") return woffToSfnt(bytes);
  // WOFF2 header: totalSfntSize at 16. Checked before the decoder allocates it.
  if (bytes.length < 48 || view(bytes).getUint32(16) > MAX_FONT_BYTES) throw damaged();
  try {
    return await (await codec()).decompress(bytes);
  } catch {
    throw damaged();
  }
}

/** Converts a font to another container; the outline flavor (and so .ttf/.otf) is kept. */
export async function convertFont(
  bytes: Uint8Array,
  to: FontContainer,
  codec: () => Promise<Woff2Codec>,
): Promise<{ bytes: Uint8Array; flavor: FontFlavor }> {
  const kind = detectFont(bytes);
  if (!kind) throw new ConversionError("unsupportedFormat");
  if (bytes.length > MAX_FONT_BYTES) throw new ConversionError("fileTooLarge");
  const sfnt = await toSfnt(bytes, kind.container, codec);
  readSfnt(sfnt); // the decoded font must be whole
  if (to === "sfnt") return { bytes: sfnt, flavor: kind.flavor };
  if (to === "woff") return { bytes: sfntToWoff(sfnt), flavor: kind.flavor };
  let out: Uint8Array;
  try {
    out = await (await codec()).compress(sfnt);
  } catch {
    throw damaged();
  }
  if (!out.length) throw damaged();
  return { bytes: out, flavor: kind.flavor };
}
