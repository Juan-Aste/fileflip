import { ArchiveReader } from "libarchive-wasm/dist/ArchiveReader";
import type { LibarchiveWasm } from "libarchive-wasm/dist/libarchiveWasm";
import { ConversionError } from "@/lib/convert-error";
import { detectLibarchiveFormat } from "./detect";
import { Budget, crc32, EXTRACT_LIMITS, safePath, withUniquePaths, type ExtractedFile, type ExtractLimits, type ExtractResult } from "./extract";

// 7Z and RAR (v4 and v5) are read with libarchive compiled to WebAssembly
// (our own build, see libarchive-module.ts). It runs inside the data worker's WASM sandbox, and gets a
// fresh instance per archive so nothing carries over from a hostile file.
// Sizes are checked before each entry is read, and libarchive never writes
// more than the declared size into the buffer it is given.

export { detectLibarchiveFormat };

export type LibarchiveLoader = () => Promise<LibarchiveWasm>;

/** The archive and the extracted entry both live in the 2 GB WASM heap. */
export const MAX_LIBARCHIVE_INPUT_BYTES = 250 * 1024 * 1024;

const damaged = () => new ConversionError("fileDamaged");
const u32 = (b: Uint8Array, o: number) => (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;

/**
 * libarchive stops quietly when a 7z is cut before its header (stored at the
 * end), so the start header is checked here: the header must be in the file
 * and match its CRC.
 */
function check7z(b: Uint8Array) {
  if (b.length < 32 || crc32(b.subarray(12, 32)) !== u32(b, 8)) throw damaged();
  const offset = u32(b, 12) + u32(b, 16) * 2 ** 32;
  const size = u32(b, 20) + u32(b, 24) * 2 ** 32;
  const start = 32 + offset;
  if (size === 0 || start + size > b.length || crc32(b.subarray(start, start + size)) !== u32(b, 28)) throw damaged();
}

export async function extractWithLibarchive(bytes: Uint8Array, load: LibarchiveLoader, limits: ExtractLimits = EXTRACT_LIMITS): Promise<ExtractResult> {
  const kind = detectLibarchiveFormat(bytes);
  if (!kind) throw new ConversionError("unsupportedFormat");
  if (bytes.length > MAX_LIBARCHIVE_INPUT_BYTES) throw new ConversionError("fileTooLarge");
  if (kind === "7z") check7z(bytes);
  const lib = await load();
  let reader: ArchiveReader;
  try {
    reader = new ArchiveReader(lib, new Int8Array(bytes.buffer, bytes.byteOffset, bytes.length));
  } catch {
    throw damaged();
  }
  const budget = new Budget(limits);
  const files: ExtractedFile[] = [];
  let skipped = 0;
  try {
    for (;;) {
      const entry = reader.nextEntry();
      if (!entry) break;
      const type = entry.getFiletype();
      const name = entry.getPathname();
      if (type === "Directory") {
        entry.free();
        continue;
      }
      // Symbolic and hard links, devices, sockets, FIFOs: never created.
      if (type !== "File" || entry.getHardlinkTarget()) {
        skipped++;
        entry.free();
        continue;
      }
      if (entry.isEncrypted()) throw new ConversionError("archiveEncrypted");
      const size = entry.getSize();
      if (!Number.isSafeInteger(size) || size < 0) throw damaged();
      budget.addEntry();
      budget.addBytes(size);
      let data: Uint8Array;
      try {
        const read = entry.readData();
        data = read ? new Uint8Array(read.buffer, read.byteOffset, read.length) : new Uint8Array(0);
      } catch (error) {
        throw /encrypt/i.test(String(error)) ? new ConversionError("archiveEncrypted") : damaged();
      }
      entry.free();
      if (data.length !== size) throw damaged();
      const path = safePath(name ?? "");
      if (path) files.push({ path, data });
    }
    const error = lib.error_string(reader.archive);
    if (error) throw /encrypt/i.test(error) ? new ConversionError("archiveEncrypted") : damaged();
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    throw damaged();
  } finally {
    try {
      reader.free();
    } catch {
      // The instance is dropped anyway.
    }
  }
  return withUniquePaths({ kind, files, skipped });
}
