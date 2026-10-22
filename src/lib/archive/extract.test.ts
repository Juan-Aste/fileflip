import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { ConversionError } from "@/lib/convert-error";
import { createArchive } from "./create";
import { crc32, detectArchive, extractArchive, safePath, type ExtractResult } from "./extract";

const dir = join(__dirname, "../../../tests/fixtures");
const fixture = (name: string) => new Uint8Array(readFileSync(join(dir, name)));
const text = (data: Uint8Array) => new TextDecoder().decode(data);
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as ConversionError).code;
  }
  return "no error";
};
const byPath = (r: ExtractResult) => Object.fromEntries(r.files.map((f) => [f.path, f.data]));

// The tree written by scripts/fixtures/archives.py with Python's zipfile and tarfile.
const tree = {
  "docs/readme.txt": "Léeme: archivo de prueba de Fileflect. ñandú 中文\n".repeat(20),
  "docs/año 2024/notas — 中文.txt": "Notas con acentos: canción, pingüino.\n",
  "empty.txt": "",
};
const longPath = `deep/${"carpeta-con-nombre-largo/".repeat(12)}final.txt`;

describe("extractArchive", () => {
  for (const [name, kind] of [["archive.zip", "zip"], ["archive.tar", "tar"], ["archive.tar.gz", "tgz"]] as const) {
    it(`${name}: every file with its folders, byte for byte; empty folders are not files`, () => {
      const result = extractArchive(fixture(name), name);
      expect(result.kind).toBe(kind);
      expect(result.skipped).toBe(0);
      const files = byPath(result);
      for (const [path, content] of Object.entries(tree)) expect(text(files[path]!)).toBe(content);
      expect(Buffer.from(files["images/image.png"]!).equals(Buffer.from(fixture("image.png")))).toBe(true);
      expect(Buffer.from(files["document-1page.pdf"]!).equals(Buffer.from(fixture("document-1page.pdf")))).toBe(true);
      const expected = ["docs/readme.txt", "docs/año 2024/notas — 中文.txt", "images/image.png", "document-1page.pdf", "empty.txt"];
      if (kind !== "zip") expected.push(longPath);
      expect(Object.keys(files).sort()).toEqual(expected.sort());
    });
  }

  it("a plain .gz gives back the file with the name stored in its header", () => {
    const result = extractArchive(fixture("text.txt.gz"), "text.txt.gz");
    expect(result).toMatchObject({ kind: "gz", skipped: 0 });
    expect(result.files.map((f) => f.path)).toEqual(["texto.txt"]);
    expect(Buffer.from(result.files[0]!.data).equals(Buffer.from(fixture("text.txt")))).toBe(true);
    // Without a stored name: the archive's name without ".gz".
    expect(extractArchive(gzipSync(new Uint8Array([1, 2, 3])), "datos.bin.gz").files[0]!.path).toBe("datos.bin");
  });

  it("names of old Windows ZIPs (code page 437) are decoded", () => {
    expect(extractArchive(fixture("legacy-cp437.zip"), "x.zip").files.map((f) => f.path)).toEqual(["año.txt"]);
  });

  it("round trip with our own writer, including duplicate names", () => {
    const entries = [
      { name: "a.txt", data: new TextEncoder().encode("uno"), mtime: 0 },
      { name: "a.txt", data: new TextEncoder().encode("dos"), mtime: 0 },
    ];
    for (const format of ["zip", "tar", "tgz"] as const) {
      const files = byPath(extractArchive(createArchive(entries, { format, level: 6 }), "x"));
      expect(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, text(v)]))).toEqual({ "a.txt": "uno", "a (1).txt": "dos" });
    }
  });
});

describe("hostile archives", () => {
  it("zip slip: no path leaves the extraction folder", () => {
    const result = extractArchive(fixture("corrupt/zip-slip.zip"), "x.zip");
    expect(result.files.map((f) => f.path)).toEqual(["evil.txt", "etc/evil-abs.txt", "Windows/evil-win.txt", "ok/evil-mid.txt", "evil-back.txt", "safe.txt"]);
    for (const { path } of result.files) {
      expect(path.split("/")).not.toContain("..");
      expect(path).not.toMatch(/^[/\\]|^[a-z]:/i);
      expect(path).not.toContain("\\");
    }
  });

  it("links, FIFOs and devices are skipped, never followed", () => {
    const zip = extractArchive(fixture("corrupt/symlink.zip"), "x.zip");
    expect(zip.files.map((f) => f.path)).toEqual(["safe.txt"]);
    expect(zip.skipped).toBe(1);
    const tar = extractArchive(fixture("corrupt/links.tar"), "x.tar");
    expect(tar.files.map((f) => f.path).sort()).toEqual(["escape.txt", "safe.txt"]);
    expect(tar.skipped).toBe(4);
  });

  it("zip bombs: a declared 4 GB is refused before inflating; a lying size stops at the declared size", () => {
    expect(codeOf(() => extractArchive(fixture("corrupt/bomb-declared.zip"), "x.zip"))).toBe("archiveTooLarge");
    expect(codeOf(() => extractArchive(fixture("corrupt/lying-size.zip"), "x.zip"))).toBe("fileDamaged");
  });

  it("bombs stop at the limits while inflating (ZIP, TAR.GZ and GZ), and on the number of files", () => {
    const limits = { maxBytes: 1024 * 1024, maxEntries: 3 };
    const zeros = new Uint8Array(2 * 1024 * 1024);
    expect(codeOf(() => extractArchive(zipSync({ "z.bin": zeros }), "x.zip", limits))).toBe("archiveTooLarge");
    const tgz = createArchive([{ name: "z.bin", data: zeros, mtime: 0 }], { format: "tgz", level: 9 });
    expect(tgz.length).toBeLessThan(10_000);
    expect(codeOf(() => extractArchive(tgz, "x.tgz", limits))).toBe("archiveTooLarge");
    expect(codeOf(() => extractArchive(gzipSync(zeros), "x.gz", limits))).toBe("archiveTooLarge");
    const many = Array.from({ length: 4 }, (_, i) => ({ name: `${i}.txt`, data: new Uint8Array(1), mtime: 0 }));
    for (const format of ["zip", "tar"] as const) {
      expect(codeOf(() => extractArchive(createArchive(many, { format, level: 6 }), "x", limits))).toBe("archiveTooLarge");
    }
    expect(extractArchive(createArchive(many.slice(0, 3), { format: "zip", level: 6 }), "x", limits).files).toHaveLength(3);
  });

  it("password-protected, truncated, damaged and unknown files fail with a clear code", () => {
    expect(codeOf(() => extractArchive(fixture("corrupt/encrypted.zip"), "x.zip"))).toBe("archiveEncrypted");
    expect(codeOf(() => extractArchive(fixture("corrupt/truncated.zip"), "x.zip"))).toBe("fileDamaged");
    expect(codeOf(() => extractArchive(fixture("corrupt/truncated.tar.gz"), "x.tgz"))).toBe("fileDamaged");
    expect(codeOf(() => extractArchive(fixture("archive.tar").slice(0, 3000), "x.tar"))).toBe("fileDamaged");
    expect(codeOf(() => extractArchive(fixture("image.png"), "x.zip"))).toBe("unsupportedFormat");
    expect(codeOf(() => extractArchive(new Uint8Array(0), "x.zip"))).toBe("unsupportedFormat");
    // One flipped byte inside a deflated file: the CRC no longer matches.
    const zip = fixture("archive.zip");
    const at = Buffer.from(zip).indexOf("docs/readme.txt") + 40;
    const flipped = zip.slice();
    flipped[at] = flipped[at]! ^ 0xff;
    expect(codeOf(() => extractArchive(flipped, "x.zip"))).toBe("fileDamaged");
    // Methods other than store and deflate (here bzip2 = 12).
    const bzip = zipSync({ "a.txt": new Uint8Array([1]) }, { level: 0 });
    const central = Buffer.from(bzip).lastIndexOf("PK\x01\x02");
    bzip[central + 10] = 12;
    expect(codeOf(() => extractArchive(bzip, "x.zip"))).toBe("archiveUnsupported");
  });
});

describe("helpers", () => {
  it("safePath keeps only normal segments", () => {
    expect(safePath("../../a/./b/../c.txt")).toBe("a/b/c.txt");
    expect(safePath("C:\\Users\\x.txt")).toBe("Users/x.txt");
    expect(safePath("/etc/passwd")).toBe("etc/passwd");
    expect(safePath("a/<b>?.txt")).toBe("a/_b__.txt");
    expect(safePath("../..")).toBeNull();
    expect(safePath("....//...")).toBeNull();
  });

  it("detects archives by content and computes CRC-32", () => {
    expect(detectArchive(fixture("archive.zip"))).toBe("zip");
    expect(detectArchive(fixture("archive.tar"))).toBe("tar");
    expect(detectArchive(fixture("archive.tar.gz"))).toBe("gz");
    expect(detectArchive(fixture("document.docx"))).toBe("zip");
    expect(detectArchive(fixture("text.txt"))).toBeNull();
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
});
