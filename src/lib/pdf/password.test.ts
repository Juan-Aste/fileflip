import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { protectPdf, unlockPdf, type Qpdf, type QpdfFactory } from "./password";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const nodeRequire = createRequire(import.meta.url);
const qpdfJs = nodeRequire.resolve("@neslinesli93/qpdf-wasm");
const load: QpdfFactory = async () => {
  const create = nodeRequire(qpdfJs) as (options: object) => Promise<Qpdf>;
  return create({ locateFile: () => join(dirname(qpdfJs), "qpdf.wasm"), print: () => {}, printErr: () => {} });
};
const all = { print: true, copy: true, modify: true };

/** Opens with pdf.js (an independent reader); rejects with its PasswordException without the right password. */
async function open(bytes: Uint8Array, password?: string) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return getDocument({ data: bytes.slice(), password, verbosity: 0 }).promise;
}

async function text(bytes: Uint8Array, password?: string) {
  const doc = await open(bytes, password);
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  return content.items.map((item) => ("str" in item ? item.str : "")).join("");
}

describe("protectPdf", () => {
  it("encrypts with AES-256: pdf.js needs the password, then reads the same pages", async () => {
    const input = fixture("document.pdf");
    const out = await protectPdf(input, "contraseña ñ 1", all, load);
    await expect(open(out)).rejects.toMatchObject({ name: "PasswordException" });
    await expect(open(out, "wrong")).rejects.toMatchObject({ name: "PasswordException" });
    const doc = await open(out, "contraseña ñ 1");
    expect(doc.numPages).toBe(3);
    expect(await text(out, "contraseña ñ 1")).toBe(await text(input));
    expect((await PDFDocument.load(out, { ignoreEncryption: true })).isEncrypted).toBe(true);
    // AES-256 is security handler revision 6 with AESV3.
    const raw = Buffer.from(out).toString("latin1");
    expect(raw).toMatch(/\/V 5/);
    expect(raw).toMatch(/\/R 6/);
  });

  it("sets the permissions (print, copy, modify)", async () => {
    const out = await protectPdf(fixture("document.pdf"), "pw", { print: false, copy: false, modify: true }, load);
    const doc = await open(out, "pw");
    const perms = (await doc.getPermissions()) ?? [];
    const { PermissionFlag } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    expect(perms).not.toContain(PermissionFlag.PRINT);
    expect(perms).not.toContain(PermissionFlag.COPY);
    expect(perms).toContain(PermissionFlag.MODIFY_CONTENTS);
  });

  it("takes passwords that look like qpdf options", async () => {
    for (const password of ["@/etc/passwd", "--decrypt"]) {
      const out = await protectPdf(fixture("document-1page.pdf"), password, all, load);
      expect((await open(out, password)).numPages).toBe(1);
    }
  });

  it("refuses an encrypted PDF, an empty password and damaged files", async () => {
    const encrypted = await protectPdf(fixture("document-1page.pdf"), "pw", all, load);
    await expect(protectPdf(encrypted, "other", all, load)).rejects.toMatchObject({ code: "pdfAlreadyProtected" });
    await expect(protectPdf(fixture("document.pdf"), "", all, load)).rejects.toMatchObject({ code: "invalidRequest" });
    await expect(protectPdf(fixture("document.pdf"), "x".repeat(129), all, load)).rejects.toMatchObject({ code: "invalidRequest" });
    await expect(protectPdf(fixture("corrupt/garbage.pdf"), "pw", all, load)).rejects.toMatchObject({ code: "fileDamaged" });
    await expect(protectPdf(fixture("corrupt/truncated.pdf"), "pw", all, load)).rejects.toMatchObject({ code: "fileDamaged" });
  });
});

describe("unlockPdf", () => {
  it("removes the password: the output opens without one and keeps the text", async () => {
    const input = fixture("document.pdf");
    const encrypted = await protectPdf(input, "contraseña ñ 1", all, load);
    const out = await unlockPdf(encrypted, "contraseña ñ 1", load);
    expect((await PDFDocument.load(out)).isEncrypted).toBe(false);
    expect((await open(out)).numPages).toBe(3);
    expect(await text(out)).toBe(await text(input));
  });

  it("fails with the wrong password and on PDFs without one", async () => {
    const encrypted = await protectPdf(fixture("document-1page.pdf"), "right", all, load);
    await expect(unlockPdf(encrypted, "wrong", load)).rejects.toMatchObject({ code: "pdfWrongPassword" });
    await expect(unlockPdf(fixture("document.pdf"), "pw", load)).rejects.toMatchObject({ code: "pdfNotProtected" });
    await expect(unlockPdf(fixture("corrupt/garbage.pdf"), "pw", load)).rejects.toMatchObject({ code: "fileDamaged" });
  });
});
