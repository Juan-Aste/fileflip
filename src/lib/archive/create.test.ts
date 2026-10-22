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

/** Writes the archive and extracts it with the system's tools (not our code). */
function extractWithSystem(archive: Uint8Array, format: ArchiveFormat): Record<string, Uint8Array> {
  const dir = mkdtempSync(join(tmpdir(), "archive-"));
  dirs.push(dir);
  const file = join(dir, `out.${format === "tgz" ? "tar.gz" : format}`);
  writeFileSync(file, archive);
  const target = join(dir, "x");
  execFileSync("mkdir", [target]);
  if (format === "zip") execFileSync("unzip", ["-q", file, "-d", target]);
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
    const listing = execFileSync("unzip", ["-v", join(dir, "out.zip")], { env: { ...process.env, TZ: "UTC" } }).toString();
    const line = (name: string) => listing.split("\n").find((l) => l.trimEnd().endsWith(name)) ?? "";
    expect(line("photo.jpg")).toContain("Stored");
    expect(line("notas año 2024 — 中文.txt")).toContain("Defl:");
    expect(line("document.pdf")).toContain("Defl:");
    expect(line("photo.jpg")).toContain("2024");
    const text = entries[2]!.data.length;
    expect(zip.length).toBeLessThan(entries[0]!.data.length + entries[1]!.data.length + text);
    expect(Object.keys(unzipSync(zip))).toHaveLength(7);
    // Level 0 stores everything.
    expect(createArchive(entries, { format: "zip", level: 0 }).length).toBeGreaterThan(zip.length);
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
