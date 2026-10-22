import { gzipSync, zipSync, type Zippable } from "fflate";
import { ConversionError } from "@/lib/convert-error";
import { uniqueNames } from "@/lib/zip";

// Creates ZIP, TAR and TAR.GZ archives from the picked files, in the data
// worker. Everything is built in memory, so the total size is capped.

export type ArchiveFormat = "zip" | "tar" | "tgz";

export interface ArchiveEntry {
  name: string;
  data: Uint8Array;
  /** Last modification time in ms (File.lastModified). */
  mtime: number;
}

export interface ArchiveOptions {
  format: ArchiveFormat;
  /** ZIP and TAR.GZ: deflate level (0 = store, 9 = smallest). */
  level: 0 | 6 | 9;
}

/** Input files together; the archive (and a gzip copy for TAR.GZ) must fit in a tab's memory. */
export const MAX_ARCHIVE_INPUT_BYTES = 500 * 1024 * 1024;
/** ZIP without the ZIP64 extension (fflate doesn't write it): 65 535 entries, 4 GB. */
export const MAX_ARCHIVE_ENTRIES = 65_535;

// Formats that are already compressed: deflating them again costs time and saves nothing.
const compressed = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif", "mp3", "mp4", "m4a", "m4v", "mov", "mkv", "webm",
  "ogg", "opus", "aac", "flac", "zip", "gz", "tgz", "bz2", "xz", "7z", "rar", "zst", "docx", "xlsx", "pptx",
  "odt", "ods", "odp", "epub", "woff", "woff2", "jar", "apk",
]);
const extension = (name: string) => name.slice(name.lastIndexOf(".") + 1).toLowerCase();

/**
 * A safe entry name: one path segment, no control characters, no separators
 * (so nothing can climb out of the folder it's extracted to).
 */
export function entryName(name: string): string {
  const clean = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]+/g, "_")
    .trim();
  return clean === "" || clean === "." || clean === ".." ? "file" : clean;
}

export function createArchive(entries: readonly ArchiveEntry[], options: ArchiveOptions): Uint8Array {
  if (entries.length === 0) throw new ConversionError("invalidRequest");
  if (entries.length > MAX_ARCHIVE_ENTRIES) throw new ConversionError("tooManyFiles");
  const total = entries.reduce((sum, e) => sum + e.data.length, 0);
  if (total > MAX_ARCHIVE_INPUT_BYTES) throw new ConversionError("fileTooLarge");
  const names = uniqueNames(entries.map((e) => entryName(e.name)));
  if (options.format === "zip") return createZip(entries, names, options.level);
  const tar = createTar(entries, names);
  return options.format === "tar" ? tar : gzipSync(tar, { level: options.level === 0 ? 1 : options.level });
}

function createZip(entries: readonly ArchiveEntry[], names: string[], level: ArchiveOptions["level"]): Uint8Array {
  const files: Zippable = {};
  entries.forEach((entry, i) => {
    const name = names[i]!;
    files[name] = [entry.data, { level: compressed.has(extension(name)) ? 0 : level, mtime: new Date(zipTime(entry.mtime)) }];
  });
  return zipSync(files);
}

// DOS dates in ZIP go from 1980 to 2107.
const zipTime = (ms: number) => Math.min(Math.max(ms, Date.UTC(1980, 0, 2)), Date.UTC(2107, 11, 31));

// --- TAR (POSIX ustar, with PAX headers for names ustar can't hold) ---

const BLOCK = 512;
const encoder = new TextEncoder();

const pad = (size: number) => (BLOCK - (size % BLOCK)) % BLOCK;

function writeString(header: Uint8Array, offset: number, length: number, value: string) {
  header.set(encoder.encode(value).subarray(0, length), offset);
}

/** Octal number, zero-padded, NUL-terminated (the classic tar layout). */
function writeOctal(header: Uint8Array, offset: number, length: number, value: number) {
  writeString(header, offset, length - 1, value.toString(8).padStart(length - 1, "0"));
}

function header(name: string, size: number, mtime: number, type: "0" | "x"): Uint8Array {
  const h = new Uint8Array(BLOCK);
  writeString(h, 0, 100, name);
  writeOctal(h, 100, 8, 0o644);
  writeOctal(h, 108, 8, 0);
  writeOctal(h, 116, 8, 0);
  writeOctal(h, 124, 12, size);
  writeOctal(h, 136, 12, Math.max(0, Math.floor(mtime / 1000)));
  h.fill(0x20, 148, 156); // checksum is computed with this field as spaces
  writeString(h, 156, 1, type);
  writeString(h, 257, 6, "ustar");
  writeString(h, 263, 2, "00");
  let sum = 0;
  for (const byte of h) sum += byte;
  writeString(h, 148, 7, `${sum.toString(8).padStart(6, "0")}\0`);
  return h;
}

/** A PAX record: "<length> path=<value>\n", where the length counts itself. */
function paxRecord(key: string, value: string): string {
  const body = ` ${key}=${value}\n`;
  const bodyLength = encoder.encode(body).length;
  let length = bodyLength + 1;
  while (String(length).length + bodyLength !== length) length = String(length).length + bodyLength;
  return `${length}${body}`;
}

const isPlainAscii = (s: string) => /^[\x20-\x7e]*$/.test(s);

export function createTar(entries: readonly ArchiveEntry[], names: readonly string[]): Uint8Array {
  const parts: Uint8Array[] = [];
  entries.forEach((entry, i) => {
    const name = names[i]!;
    let shortName = name;
    // ustar holds 100 ASCII bytes; longer or non-ASCII names go in a PAX header (UTF-8).
    if (!isPlainAscii(name) || name.length > 100) {
      const pax = encoder.encode(paxRecord("path", name));
      parts.push(header(`PaxHeaders/${asciiFallback(name)}`.slice(0, 99), pax.length, entry.mtime, "x"), pax, new Uint8Array(pad(pax.length)));
      shortName = asciiFallback(name).slice(-100);
    }
    parts.push(header(shortName, entry.data.length, entry.mtime, "0"), entry.data, new Uint8Array(pad(entry.data.length)));
  });
  parts.push(new Uint8Array(BLOCK * 2));
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** What tar readers without PAX support show: the name with non-ASCII characters replaced. */
const asciiFallback = (name: string) => name.replace(/[^\x20-\x7e]/g, "_");
