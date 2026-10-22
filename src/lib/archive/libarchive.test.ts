import { readFileSync } from "node:fs";
import { join } from "node:path";
import { libarchiveWasm } from "libarchive-wasm";
import { describe, expect, it } from "vitest";
import type { ConversionError } from "@/lib/convert-error";
import { detectLibarchiveFormat, extractWithLibarchive, MAX_LIBARCHIVE_INPUT_BYTES } from "./libarchive";

const dir = join(__dirname, "../../../tests/fixtures");
const fixture = (name: string) => new Uint8Array(readFileSync(join(dir, name)));
const text = (data: Uint8Array) => new TextDecoder().decode(data);
const load = () => libarchiveWasm();
const extract = (name: string, limits?: { maxBytes: number; maxEntries: number }) => extractWithLibarchive(fixture(name), load, limits);
const codeOf = async (promise: Promise<unknown>) =>
  promise.then(
    () => "no error",
    (error: ConversionError) => error.code,
  );

/** libarchive's own check of its RAR 5 test data (test_read_format_rar5.c, verify_data). */
function followsPattern(data: Uint8Array, magic: number) {
  const view = new DataView(data.buffer, data.byteOffset, data.length);
  for (let i = 0; i < data.length / 4; i++) {
    const k = i + 1;
    if (view.getUint32(i * 4, true) !== Math.max(0, k * k - 3 * k + 1 + magic)) return false;
  }
  return true;
}

describe("extractWithLibarchive", () => {
  it("7z (written by py7zr): every file byte for byte, with folders", async () => {
    const result = await extract("archive.7z");
    expect(result).toMatchObject({ kind: "7z", skipped: 0 });
    const files = Object.fromEntries(result.files.map((f) => [f.path, f.data]));
    expect(text(files["docs/readme.txt"]!)).toBe("Léeme: archivo de prueba de Fileflect. ñandú 中文\n".repeat(20));
    expect(Buffer.from(files["images/image.png"]!).equals(Buffer.from(fixture("image.png")))).toBe(true);
    expect(Buffer.from(files["document-1page.pdf"]!).equals(Buffer.from(fixture("document-1page.pdf")))).toBe(true);
    expect(files["empty.txt"]!.length).toBe(0);
    // Known limitation: this libarchive build runs in the C locale, so non-ASCII 7z names
    // lose those characters ("*", then made safe as "_"); the content is intact.
    const notes = result.files.find((f) => f.path.startsWith("docs/a_o 2024/"))!;
    expect(text(notes.data)).toBe("Notas con acentos: canción, pingüino.\n");
    expect(result.files).toHaveLength(5);
  });

  it("RAR 5 (compressed): libarchive's test data, checked with its own pattern", async () => {
    const result = await extract("archive-rar5.rar");
    expect(result.kind).toBe("rar");
    expect(result.files.map((f) => f.path)).toEqual(["test.bin", ...[1, 2, 3, 4, 5, 6].map((n) => `test${n}.bin`)]);
    result.files.forEach((f, i) => expect(followsPattern(f.data, i)).toBe(true));
    expect(result.files[0]!.data.length).toBe(1200);
  });

  it("RAR 4 and RAR 5: symbolic and hard links are skipped; UTF-8 names kept", async () => {
    const rar4 = await extract("archive-rar4.rar");
    expect(rar4.files.map((f) => [f.path, text(f.data)])).toEqual([
      ["test.txt", "test text document\r\n"],
      ["testdir/test.txt", "test text document\r\n"],
    ]);
    expect(rar4.skipped).toBe(1);
    const unicode = await extract("archive-rar5-unicode.rar");
    expect(unicode.files.map((f) => [f.path, text(f.data)])).toEqual([["👋🌎.txt", "Hello, world!"]]);
    expect(unicode.skipped).toBe(2);
  });

  it("encrypted, truncated and oversized archives fail with clear codes", async () => {
    expect(await codeOf(extract("corrupt/encrypted.7z"))).toBe("archiveEncrypted");
    expect(await codeOf(extract("corrupt/encrypted-header.7z"))).toBe("archiveEncrypted");
    expect(await codeOf(extract("corrupt/encrypted.rar"))).toBe("archiveEncrypted");
    expect(await codeOf(extract("corrupt/truncated.7z"))).toBe("fileDamaged");
    expect(await codeOf(extract("corrupt/truncated.rar"))).toBe("fileDamaged");
    const bytes = fixture("archive.7z");
    const flipped = bytes.slice();
    flipped[200] = flipped[200]! ^ 0xff;
    expect(await codeOf(extractWithLibarchive(flipped, load))).toBe("fileDamaged");
    expect(await codeOf(extractWithLibarchive(fixture("archive.zip"), load))).toBe("unsupportedFormat");
    const huge = { length: MAX_LIBARCHIVE_INPUT_BYTES + 1, 0: 0x37, 1: 0x7a, 2: 0xbc, 3: 0xaf, 4: 0x27, 5: 0x1c } as unknown as Uint8Array;
    expect(await codeOf(extractWithLibarchive(huge, load))).toBe("fileTooLarge");
  });

  it("the size and file-count limits apply before reading each entry", async () => {
    expect(await codeOf(extract("archive-rar5.rar", { maxBytes: 10_000, maxEntries: 100 }))).toBe("archiveTooLarge");
    expect(await codeOf(extract("archive.7z", { maxBytes: 1e9, maxEntries: 3 }))).toBe("archiveTooLarge");
  });

  it("detects 7z and both RAR versions by signature", () => {
    expect(detectLibarchiveFormat(fixture("archive.7z"))).toBe("7z");
    expect(detectLibarchiveFormat(fixture("archive-rar4.rar"))).toBe("rar");
    expect(detectLibarchiveFormat(fixture("archive-rar5.rar"))).toBe("rar");
    expect(detectLibarchiveFormat(fixture("archive.zip"))).toBeNull();
  });
});
