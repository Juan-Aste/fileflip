import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync, unzipSync } from "fflate";
import { afterAll, describe, expect, it } from "vitest";
import { ConversionError } from "@/lib/convert-error";
import { createArchive, entryName, MAX_ARCHIVE_INPUT_BYTES, type ArchiveEntry, type ArchiveFormat } from "./create";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const mtime = Date.UTC(2024, 4, 17, 12, 30, 0);
const longName = `${"informe-trimestral-".repeat(7)}final.txt`;
const entries: ArchiveEntry[] = [
  { name: "photo.jpg", data: fixture("photo.jpg"), mtime },
  { name: "document.pdf", data: fixture("document.pdf"), mtime },
  { name: "notas año 2024 — 中文.txt", data: new TextEncoder().encode("Hola, ñandú 中文\n".repeat(500)), mtime },
  { name: longName, data: new TextEncoder().encode("long"), mtime },
  { name: "empty.txt", data: new Uint8Array(0), mtime },
  { name: "photo.jpg", data: new Uint8Array([1, 2, 3]), mtime },
  { name: "../../etc/passwd", data: new TextEncoder().encode("x"), mtime },
];
const expected: Record<string, Uint8Array> = {
  "photo.jpg": entries[0]!.data,
  "document.pdf": entries[1]!.data,
  "notas año 2024 — 中文.txt": entries[2]!.data,
  [longName]: entries[3]!.data,
  "empty.txt": entries[4]!.data,
  "photo (1).jpg": entries[5]!.data,
  ".._.._etc_passwd": entries[6]!.data,
};

const dirs: string[] = [];
afterAll(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

/**
 * Independent ZIP reader: Python's zipfile honours the UTF-8 name flag (bit 11)
 * whatever the locale, unlike some builds of Info-ZIP's unzip, which showed
 * the names as CP437 on GitHub's runner. Output is ASCII JSON, so it's locale-proof.
 */
function python(script: string, ...args: string[]): string {
  return execFileSync("python3", ["-I", "-c", script, ...args], { env: { ...process.env, PYTHONIOENCODING: "utf-8" } }).toString();
}
const PY_EXTRACT = "import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])";
const PY_LIST =
  "import sys, json, zipfile; print(json.dumps([[i.filename, i.compress_type, list(i.date_time), i.flag_bits] for i in zipfile.ZipFile(sys.argv[1]).infolist()]))";

/** General purpose flags of every local header and central directory entry, read from the bytes. */
function zipFlags(zip: Uint8Array): { local: Record<string, number>; central: Record<string, number> } {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();
  const local: Record<string, number> = {};
  const central: Record<string, number> = {};
  // The central directory is where the end record says; local headers are where the central entries point.
  let end = zip.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const nameLength = view.getUint16(at + 28, true);
    const name = decoder.decode(zip.subarray(at + 46, at + 46 + nameLength));
    central[name] = view.getUint16(at + 8, true);
    const offset = view.getUint32(at + 42, true);
    expect(view.getUint32(offset, true)).toBe(0x04034b50);
    local[decoder.decode(zip.subarray(offset + 30, offset + 30 + view.getUint16(offset + 26, true)))] = view.getUint16(offset + 6, true);
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return { local, central };
}

/** Writes the archive and extracts it with the system's tools (not our code). */
function extractWithSystem(archive: Uint8Array, format: ArchiveFormat): Record<string, Uint8Array> {
  const dir = mkdtempSync(join(tmpdir(), "archive-"));
  dirs.push(dir);
  const file = join(dir, `out.${format === "tgz" ? "tar.gz" : format}`);
  writeFileSync(file, archive);
  const target = join(dir, "x");
  execFileSync("mkdir", [target]);
  if (format === "zip") python(PY_EXTRACT, file, target);
  else execFileSync("tar", [format === "tgz" ? "-xzf" : "-xf", file, "-C", target]);
  return Object.fromEntries(readdirSync(target).map((name) => [name, new Uint8Array(readFileSync(join(target, name)))]));
}

describe("createArchive", () => {
  for (const format of ["zip", "tar", "tgz"] as const) {
    it(`${format}: the system's extractor gets every file back, byte for byte, with safe unique names`, () => {
      const archive = createArchive(entries, { format, level: 6 });
      const out = extractWithSystem(archive, format);
      expect(Object.keys(out).sort()).toEqual(Object.keys(expected).sort());
      for (const [name, data] of Object.entries(expected)) expect(Buffer.from(out[name]!).equals(Buffer.from(data))).toBe(true);
    });
  }

  it("tar: the system's tar lists names (UTF-8 and > 100 characters), sizes and dates", () => {
    const dir = mkdtempSync(join(tmpdir(), "archive-"));
    dirs.push(dir);
    const file = join(dir, "out.tar");
    writeFileSync(file, createArchive(entries, { format: "tar", level: 6 }));
    const listing = execFileSync("tar", ["-tvf", file], { env: { ...process.env, TZ: "UTC", LC_ALL: "C.UTF-8" } }).toString();
    expect(listing).toContain("notas año 2024 — 中文.txt");
    expect(listing).toContain(longName);
    expect(listing).toContain("2024-05-17 12:30");
    expect(listing).toMatch(new RegExp(`\\s${entries[1]!.data.length}\\s2024-05-17`));
    expect(listing).not.toContain("PaxHeaders");
    // Every header and file is padded to 512-byte blocks, ending with two empty blocks.
    expect(statSync(file).size % 512).toBe(0);
  });

  it("zip: already compressed formats are stored, text is deflated, dates are kept", () => {
    const zip = createArchive(entries, { format: "zip", level: 9 });
    const dir = mkdtempSync(join(tmpdir(), "archive-"));
    dirs.push(dir);
    writeFileSync(join(dir, "out.zip"), zip);
    const listing = JSON.parse(python(PY_LIST, join(dir, "out.zip"))) as [string, number, number[], number][];
    const entry = (name: string) => listing.find(([n]) => n === name);
    const [STORED, DEFLATED] = [0, 8];
    expect(entry("photo.jpg")?.[1]).toBe(STORED);
    expect(entry("notas año 2024 — 中文.txt")?.[1]).toBe(DEFLATED);
    expect(entry("document.pdf")?.[1]).toBe(DEFLATED);
    // DOS time has 2-second resolution and no time zone: the date is written as given.
    expect(entry("photo.jpg")?.[2].slice(0, 3)).toEqual([2024, 5, 17]);
    const text = entries[2]!.data.length;
    expect(zip.length).toBeLessThan(entries[0]!.data.length + entries[1]!.data.length + text);
    expect(Object.keys(unzipSync(zip))).toHaveLength(7);
    // Level 0 stores everything.
    expect(createArchive(entries, { format: "zip", level: 0 }).length).toBeGreaterThan(zip.length);
  });

  it("zip: non-ASCII names carry the UTF-8 flag (bit 11) in the local header and the central directory", () => {
    const { local, central } = zipFlags(createArchive(entries, { format: "zip", level: 6 }));
    expect(Object.keys(central).sort()).toEqual(Object.keys(expected).sort());
    expect(Object.keys(local).sort()).toEqual(Object.keys(expected).sort());
    const UTF8 = 0x0800;
    expect(local["notas año 2024 — 中文.txt"]! & UTF8).toBe(UTF8);
    expect(central["notas año 2024 — 中文.txt"]! & UTF8).toBe(UTF8);
    // Python's reader agrees on the flag.
    const dir = mkdtempSync(join(tmpdir(), "archive-"));
    dirs.push(dir);
    writeFileSync(join(dir, "out.zip"), createArchive(entries, { format: "zip", level: 6 }));
    const listing = JSON.parse(python(PY_LIST, join(dir, "out.zip"))) as [string, number, number[], number][];
    expect(listing.find(([n]) => n === "notas año 2024 — 中文.txt")![3] & UTF8).toBe(UTF8);
  });

  it("tgz is a gzip of the TAR", () => {
    const tgz = createArchive(entries, { format: "tgz", level: 6 });
    expect([tgz[0], tgz[1]]).toEqual([0x1f, 0x8b]);
    expect(Buffer.from(gunzipSync(tgz)).equals(Buffer.from(createArchive(entries, { format: "tar", level: 6 })))).toBe(true);
  });

  it("refuses empty input, too much data and too many files", () => {
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (error) {
        return (error as ConversionError).code;
      }
    };
    expect(code(() => createArchive([], { format: "zip", level: 6 }))).toBe("invalidRequest");
    const big = { name: "a", data: { length: MAX_ARCHIVE_INPUT_BYTES + 1 } as Uint8Array, mtime };
    expect(code(() => createArchive([big], { format: "tar", level: 6 }))).toBe("fileTooLarge");
    const tiny = { name: "a", data: new Uint8Array(0), mtime };
    expect(code(() => createArchive(Array(65_536).fill(tiny), { format: "zip", level: 6 }))).toBe("tooManyFiles");
  });

  it("entry names are one safe path segment", () => {
    expect(entryName("a/b\\c.txt")).toBe("a_b_c.txt");
    expect(entryName("..")).toBe("file");
    expect(entryName("\u0000\n")).toBe("file");
    expect(entryName(" ok.txt ")).toBe("ok.txt");
  });
});
