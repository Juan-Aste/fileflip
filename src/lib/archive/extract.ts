import { Gunzip, Inflate } from "fflate";
import { ConversionError } from "@/lib/convert-error";
import { uniqueNames } from "@/lib/zip";

// Extracts ZIP, TAR, TAR.GZ and GZ in the data worker, treating the archive
// as hostile: sizes are counted while inflating (zip bombs stop at the cap),
// paths are rebuilt from safe segments (no "..", no absolute paths: zip slip),
// and links, devices and other special entries are skipped, never followed.

export interface ExtractLimits {
  /** Total extracted bytes. */
  maxBytes: number;
  /** Extracted files. */
  maxEntries: number;
}

/** Everything extracted is held in memory, and each file becomes a result row. */
export const EXTRACT_LIMITS: ExtractLimits = { maxBytes: 500 * 1024 * 1024, maxEntries: 5000 };

export type ArchiveKind = "zip" | "tar" | "tgz" | "gz";

export interface ExtractedFile {
  /** Relative path with "/" separators; always inside the extraction folder. */
  path: string;
  data: Uint8Array;
}

export interface ExtractResult {
  kind: ArchiveKind;
  files: ExtractedFile[];
  /** Entries left out on purpose: symbolic and hard links, devices, FIFOs. */
  skipped: number;
}

const damaged = () => new ConversionError("fileDamaged");
const tooLarge = () => new ConversionError("archiveTooLarge");
const CHUNK = 64 * 1024;

export function detectArchive(bytes: Uint8Array): ArchiveKind | null {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 || bytes[2] === 5) && (bytes[3] === 4 || bytes[3] === 6)) return "zip";
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return "gz";
  if (isTarHeader(bytes)) return "tar";
  return null;
}

export function extractArchive(bytes: Uint8Array, archiveName: string, limits: ExtractLimits = EXTRACT_LIMITS): ExtractResult {
  const kind = detectArchive(bytes);
  if (!kind) throw new ConversionError("unsupportedFormat");
  const budget = new Budget(limits);
  let result: ExtractResult;
  if (kind === "zip") result = { kind, ...readZip(bytes, budget) };
  else if (kind === "tar") result = { kind, ...readTar(bytes, budget) };
  else {
    const inner = gunzip(bytes, budget);
    if (isTarHeader(inner)) {
      // The TAR's files are the same bytes again: count them against a fresh budget.
      result = { kind: "tgz", ...readTar(inner, new Budget(limits)) };
    } else {
      const name = safePath(gzipName(bytes) ?? archiveName.replace(/\.(gz|tgz)$/i, "")) ?? "file";
      result = { kind: "gz", files: [{ path: name, data: inner }], skipped: 0 };
    }
  }
  const paths = uniqueNames(result.files.map((f) => f.path));
  result.files.forEach((f, i) => (f.path = paths[i]!));
  return result;
}

class Budget {
  bytes = 0;
  entries = 0;
  constructor(private readonly limits: ExtractLimits) {}
  /** Bytes are counted as they are produced, so an archive lying about sizes still stops here. */
  addBytes(n: number) {
    this.bytes += n;
    if (this.bytes > this.limits.maxBytes) throw tooLarge();
  }
  addEntry() {
    if (++this.entries > this.limits.maxEntries) throw tooLarge();
  }
}

// --- Paths ---

const RESERVED = /[\u0000-\u001f\u007f<>:"|?*]/g;

/**
 * A relative path made only of normal segments: separators normalized,
 * "", "." and ".." dropped, drive letters and leading slashes removed.
 * Null when nothing is left (the entry is skipped).
 */
export function safePath(raw: string): string | null {
  const segments = raw
    .replace(/\\/g, "/")
    .replace(/^[a-zA-Z]:/, "")
    .split("/")
    .map((s) => s.replace(RESERVED, "_").trim().slice(0, 255))
    .filter((s) => s !== "" && s !== "." && s !== ".." && !/^\.+$/.test(s));
  return segments.length ? segments.slice(-32).join("/") : null;
}

// --- ZIP ---

const u16 = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8);
const u32 = (b: Uint8Array, o: number) => (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;

// The code page old ZIP tools (Windows Explorer, WinZip) use for names without the UTF-8 flag.
const CP437 =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";
const utf8 = new TextDecoder("utf-8", { fatal: true });
function zipName(raw: Uint8Array, utf8Flag: boolean): string {
  if (utf8Flag) return new TextDecoder().decode(raw);
  try {
    return utf8.decode(raw);
  } catch {
    return Array.from(raw, (b) => (b < 0x80 ? String.fromCharCode(b) : CP437[b - 0x80])).join("");
  }
}

interface ZipEntry {
  name: string;
  method: number;
  flags: number;
  crc: number;
  compressed: number;
  size: number;
  offset: number;
  isLink: boolean;
  isDir: boolean;
}

function findEndOfCentralDirectory(b: Uint8Array): number {
  // The record is 22 bytes plus a comment of up to 65 535 bytes.
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 0xffff); i--) {
    if (u32(b, i) === 0x06054b50) return i;
  }
  throw damaged();
}

function zipEntries(b: Uint8Array, budget: Budget): ZipEntry[] {
  const end = findEndOfCentralDirectory(b);
  let count = u16(b, end + 10);
  let p = u32(b, end + 16);
  if (count === 0xffff || p === 0xffffffff) {
    // ZIP64: the real values are in the ZIP64 end record.
    const locator = end - 20;
    if (locator < 0 || u32(b, locator) !== 0x07064b50) throw damaged();
    const record = readU64(b, locator + 8);
    if (!(record >= 0) || record + 56 > b.length || u32(b, record) !== 0x06064b50) throw damaged();
    count = readU64(b, record + 32);
    p = readU64(b, record + 48);
  }
  if (!Number.isSafeInteger(count) || !Number.isSafeInteger(p)) throw damaged();
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (p + 46 > b.length || u32(b, p) !== 0x02014b50) throw damaged();
    const flags = u16(b, p + 8);
    const nameLength = u16(b, p + 28);
    const extraLength = u16(b, p + 30);
    const commentLength = u16(b, p + 32);
    const madeBy = b[p + 5]!;
    const external = u32(b, p + 38);
    const rawName = b.subarray(p + 46, p + 46 + nameLength);
    let name = zipName(rawName, (flags & 0x800) !== 0);
    let compressed = u32(b, p + 20);
    let size = u32(b, p + 24);
    let offset = u32(b, p + 42);
    // Extra fields: ZIP64 sizes (0x0001) and the Info-ZIP UTF-8 path (0x7075).
    const extraEnd = p + 46 + nameLength + extraLength;
    for (let e = p + 46 + nameLength; e + 4 <= extraEnd; ) {
      const id = u16(b, e);
      const length = u16(b, e + 2);
      let q = e + 4;
      if (id === 0x0001) {
        if (size === 0xffffffff) {
          size = readU64(b, q);
          q += 8;
        }
        if (compressed === 0xffffffff) {
          compressed = readU64(b, q);
          q += 8;
        }
        if (offset === 0xffffffff) offset = readU64(b, q);
      } else if (id === 0x7075 && length > 5) {
        name = new TextDecoder().decode(b.subarray(e + 9, e + 4 + length));
      }
      e += 4 + length;
    }
    // Unix "made by" stores the file mode in the high 16 bits of the external attributes.
    const mode = madeBy === 3 ? external >>> 16 : 0;
    if (![size, compressed, offset].every(Number.isSafeInteger)) throw damaged();
    const isLink = (mode & 0xf000) === 0xa000;
    const isDir = name.endsWith("/") || name.endsWith("\\") || (mode & 0xf000) === 0x4000 || (external & 0x10) !== 0;
    entries.push({ name, method: u16(b, p + 10), flags, crc: u32(b, p + 16), compressed, size, offset, isLink, isDir });
    if (!isDir && !isLink) {
      budget.addEntry();
      // Refuse before inflating anything when the archive itself declares too much.
      budget.addBytes(size);
    }
    p = extraEnd + commentLength;
  }
  budget.bytes = 0;
  return entries;
}

const readU64 = (b: Uint8Array, o: number) => (o + 8 > b.length ? NaN : u32(b, o) + u32(b, o + 4) * 2 ** 32);

function readZip(b: Uint8Array, budget: Budget): Omit<ExtractResult, "kind"> {
  const files: ExtractedFile[] = [];
  let skipped = 0;
  for (const entry of zipEntries(b, budget)) {
    if (entry.isDir) continue;
    if (entry.isLink) {
      skipped++;
      continue;
    }
    if (entry.flags & 0x1) throw new ConversionError("archiveEncrypted");
    if (entry.method !== 0 && entry.method !== 8) throw new ConversionError("archiveUnsupported");
    const local = entry.offset;
    if (local + 30 > b.length || u32(b, local) !== 0x04034b50) throw damaged();
    const start = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    if (start + entry.compressed > b.length) throw damaged();
    const raw = b.subarray(start, start + entry.compressed);
    const data = entry.method === 0 ? raw.slice() : inflate(raw, entry.size, budget);
    if (entry.method === 0) budget.addBytes(data.length);
    if (data.length !== entry.size || crc32(data) !== entry.crc) throw damaged();
    const path = safePath(entry.name);
    if (path) files.push({ path, data });
  }
  return { files, skipped };
}

/** Inflates into a buffer of the declared size; producing more than that fails at once. */
function inflate(raw: Uint8Array, declared: number, budget: Budget): Uint8Array {
  const out = new Uint8Array(declared);
  let written = 0;
  let ended = false;
  const stream = new Inflate((chunk, final) => {
    if (written + chunk.length > declared) throw damaged();
    out.set(chunk, written);
    written += chunk.length;
    budget.addBytes(chunk.length);
    if (final) ended = true;
  });
  try {
    for (let i = 0; i < raw.length; i += CHUNK) stream.push(raw.subarray(i, i + CHUNK), i + CHUNK >= raw.length);
    if (raw.length === 0) stream.push(raw, true);
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    throw damaged();
  }
  if (!ended && declared > 0) throw damaged();
  return out.subarray(0, written);
}

// --- GZIP ---

function gunzip(b: Uint8Array, budget: Budget): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  let ended = false;
  const stream = new Gunzip((chunk, final) => {
    budget.addBytes(chunk.length);
    chunks.push(chunk);
    total += chunk.length;
    if (final) ended = true;
  });
  try {
    for (let i = 0; i < b.length; i += CHUNK) stream.push(b.subarray(i, i + CHUNK), i + CHUNK >= b.length);
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    throw damaged();
  }
  if (!ended) throw damaged();
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** The original file name stored in a gzip header (FNAME), if any. */
function gzipName(b: Uint8Array): string | null {
  const flags = b[3]!;
  if (!(flags & 0x08)) return null;
  let p = 10;
  if (flags & 0x04) p += 2 + u16(b, 10);
  const end = b.indexOf(0, p);
  if (end < 0) return null;
  return Array.from(b.subarray(p, end), (c) => String.fromCharCode(c)).join("");
}

// --- TAR ---

const BLOCK = 512;
const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join("");
const field = (h: Uint8Array, offset: number, length: number) => {
  const raw = h.subarray(offset, offset + length);
  const nul = raw.indexOf(0);
  return raw.subarray(0, nul < 0 ? length : nul);
};

function tarNumber(h: Uint8Array, offset: number, length: number): number {
  // GNU base-256 for sizes over 8 GB: high bit set, big-endian binary.
  if (h[offset]! & 0x80) {
    let value = 0;
    for (let i = offset + 1; i < offset + length; i++) value = value * 256 + h[i]!;
    return value;
  }
  const text = latin1(field(h, offset, length)).trim();
  if (text === "") return 0;
  if (!/^[0-7]+$/.test(text)) return NaN;
  return parseInt(text, 8);
}

function isTarHeader(h: Uint8Array): boolean {
  if (h.length < BLOCK) return false;
  const stored = tarNumber(h, 148, 8);
  if (!Number.isFinite(stored)) return false;
  let unsigned = 0;
  let signed = 0;
  for (let i = 0; i < BLOCK; i++) {
    const byte = i >= 148 && i < 156 ? 0x20 : h[i]!;
    unsigned += byte;
    signed += byte > 127 ? byte - 256 : byte;
  }
  return stored === unsigned || stored === signed;
}

const isZeroBlock = (h: Uint8Array) => h.every((b) => b === 0);

/** PAX records ("<len> key=value\n"); only the path matters here. */
function paxPath(data: Uint8Array): string | null {
  const text = new TextDecoder().decode(data);
  let path: string | null = null;
  for (const line of text.split("\n")) {
    const match = /^\d+ path=([\s\S]*)$/.exec(line);
    if (match) path = match[1]!;
  }
  return path;
}

function readTar(b: Uint8Array, budget: Budget): Omit<ExtractResult, "kind"> {
  const files: ExtractedFile[] = [];
  let skipped = 0;
  let longName: string | null = null;
  for (let p = 0; ; ) {
    if (p + BLOCK > b.length) {
      // No end marker: fine at the end of the data, but a partial header means it was cut.
      if (b.subarray(p).some((byte) => byte !== 0)) throw damaged();
      break;
    }
    const h = b.subarray(p, p + BLOCK);
    if (isZeroBlock(h)) break;
    if (!isTarHeader(h)) throw damaged();
    const size = tarNumber(h, 124, 12);
    if (!Number.isFinite(size)) throw damaged();
    const start = p + BLOCK;
    if (start + size > b.length) throw damaged();
    const data = b.subarray(start, start + size);
    p = start + Math.ceil(size / BLOCK) * BLOCK;
    const type = String.fromCharCode(h[156]!);
    if (type === "x") {
      longName = paxPath(data) ?? longName;
      continue;
    }
    if (type === "L") {
      longName = new TextDecoder().decode(field(data, 0, data.length));
      continue;
    }
    if (type === "g" || type === "K") continue;
    // A long name (PAX or GNU) belongs to the next entry, whatever its type.
    const name = longName ?? tarName(h);
    longName = null;
    if (type === "5") continue;
    if (type !== "0" && type !== "\0" && type !== "7") {
      // Links (1, 2), devices (3, 4), FIFOs (6) and unknown types are never created.
      skipped++;
      continue;
    }
    if (name.endsWith("/")) continue;
    budget.addEntry();
    budget.addBytes(size);
    const path = safePath(name);
    if (path) files.push({ path, data: data.slice() });
  }
  return { files, skipped };
}

function tarName(h: Uint8Array): string {
  const decode = (raw: Uint8Array) => {
    try {
      return utf8.decode(raw);
    } catch {
      return latin1(raw);
    }
  };
  const name = decode(field(h, 0, 100));
  const ustar = latin1(h.subarray(257, 262)) === "ustar";
  const prefix = ustar ? decode(field(h, 345, 155)) : "";
  return prefix ? `${prefix}/${name}` : name;
}

// --- CRC-32 (ZIP's check of each file) ---

let table: Uint32Array | null = null;
export function crc32(data: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
