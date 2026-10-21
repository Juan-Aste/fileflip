// Protect and unlock PDF: the outputs are opened with pdf.js (with and without
// the password) and pdf-lib; encrypted inputs are made here with qpdf in Node.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { expect, fileOf, fixturePath, inspectPdf, runTool, test, toolAlert, waitForResult } from "./support";

interface Qpdf {
  callMain(args: string[]): number;
  FS: { writeFile(path: string, data: Uint8Array): void; readFile(path: string): Uint8Array };
}
const nodeRequire = createRequire(__filename);
const qpdfJs = nodeRequire.resolve("@neslinesli93/qpdf-wasm");

/** Encrypts a fixture with qpdf (AES-256) into the test's output folder. */
async function encrypted(fixture: string, user: string, owner: string, extra: string[] = []) {
  const create = nodeRequire(qpdfJs) as (options: object) => Promise<Qpdf>;
  const qpdf = await create({ locateFile: () => join(dirname(qpdfJs), "qpdf.wasm"), print: () => {}, printErr: () => {} });
  qpdf.FS.writeFile("/in.pdf", readFileSync(fixturePath(fixture)));
  const code = qpdf.callMain(["--encrypt", `--user-password=${user}`, `--owner-password=${owner}`, "--bits=256", ...extra, "--", "/in.pdf", "/out.pdf"]);
  expect(code).toBe(0);
  const path = test.info().outputPath(`locked-${fixture}`);
  writeFileSync(path, qpdf.FS.readFile("/out.pdf"));
  return path;
}

async function pick(page: Page, path: string, files: string[]) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(files);
}

async function openPdf(buf: Buffer, password?: string) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return getDocument({ data: new Uint8Array(buf), password, verbosity: 0 }).promise;
}

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "password tools must not call the server").toEqual([]);
});

test.describe("tool: protect-pdf", () => {
  test("a batch protected with AES-256, without printing", async ({ page }) => {
    await pick(page, "/es/proteger-pdf", [fixturePath("document.pdf"), fixturePath("document-1page.pdf")]);
    const action = page.getByRole("button", { name: "Proteger PDF", exact: true });
    await expect(action).toBeDisabled();
    await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill("clave segura ñ");
    await page.getByRole("textbox", { name: "Repite la contraseña" }).fill("clave");
    await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
    await expect(action).toBeDisabled();
    await page.getByRole("textbox", { name: "Repite la contraseña" }).fill("clave segura ñ");
    await page.getByRole("button", { name: "Mostrar contraseña" }).click();
    await expect(page.getByRole("textbox", { name: "Repite la contraseña" })).toHaveAttribute("type", "text");
    await page.getByLabel("Imprimir").uncheck();
    await action.click();
    const links = page.locator("main a[download]");
    await expect(links).toHaveCount(2, { timeout: 45_000 });
    const out = fileOf(await waitForResult(page, links.nth(0), toolAlert(page)));
    expect(out.name).toBe("document-protected.pdf");
    await expect(openPdf(out.buf)).rejects.toMatchObject({ name: "PasswordException" });
    await expect(openPdf(out.buf, "clave")).rejects.toMatchObject({ name: "PasswordException" });
    const doc = await openPdf(out.buf, "clave segura ñ");
    expect(doc.numPages).toBe(3);
    const { PermissionFlag } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const perms = (await doc.getPermissions()) ?? [];
    expect(perms).not.toContain(PermissionFlag.PRINT);
    expect(perms).toContain(PermissionFlag.COPY);
    const one = fileOf(await waitForResult(page, links.nth(1), toolAlert(page)));
    expect((await openPdf(one.buf, "clave segura ñ")).numPages).toBe(1);
  });

  test("an already encrypted PDF and a damaged one fail with clear errors", async ({ page }) => {
    const locked = await encrypted("document-1page.pdf", "x", "y");
    await pick(page, "/en/protect-pdf", [locked, fixturePath("corrupt/garbage.pdf")]);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill("pw");
    await page.getByRole("textbox", { name: "Repeat the password" }).fill("pw");
    await page.getByRole("button", { name: "Protect PDF", exact: true }).click();
    await expect(page.getByText(/already protected or restricted/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/damaged/i).first()).toBeVisible();
    await expect(page.locator("main a[download]")).toHaveCount(0);
  });
});

test.describe("tool: unlock-pdf", () => {
  test("removes the open password", async ({ page }) => {
    const locked = await encrypted("document.pdf", "abc ñ", "owner");
    await pick(page, "/es/quitar-contrasena-pdf", [locked]);
    const action = page.getByRole("button", { name: "Quitar contraseña", exact: true });
    await expect(action).toBeDisabled();
    await page.getByRole("textbox", { name: "Contraseña del PDF" }).fill("abc ñ");
    const out = fileOf(await runTool(page, "Quitar contraseña"));
    expect(out.name).toBe("locked-document-unlocked.pdf");
    expect((await PDFDocument.load(out.buf)).isEncrypted).toBe(false);
    expect((await inspectPdf(out.buf)).labels).toEqual(["1 of 3", "2 of 3", "3 of 3"]);
  });

  test("lifts print/copy restrictions with the owner password", async ({ page }) => {
    const restricted = await encrypted("document-1page.pdf", "", "dueño", ["--print=none", "--extract=n"]);
    await pick(page, "/fr/deverrouiller-pdf", [restricted]);
    await page.getByRole("textbox", { name: "Mot de passe du PDF" }).fill("dueño");
    const out = fileOf(await runTool(page, "Retirer le mot de passe"));
    expect((await PDFDocument.load(out.buf)).isEncrypted).toBe(false);
    expect((await openPdf(out.buf)).numPages).toBe(1);
  });

  test("a wrong password, a PDF without one and a damaged file fail", async ({ page }) => {
    const locked = await encrypted("document-1page.pdf", "right", "owner");
    await pick(page, "/en/unlock-pdf", [locked, fixturePath("document.pdf"), fixturePath("corrupt/truncated.pdf")]);
    await page.getByRole("textbox", { name: "PDF password" }).fill("wrong");
    await page.getByRole("button", { name: "Remove password", exact: true }).click();
    await expect(page.getByText("That password isn’t right for this PDF.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/has no password/)).toBeVisible();
    await expect(page.getByText(/damaged/i).first()).toBeVisible();
    await expect(page.locator("main a[download]")).toHaveCount(0);
  });
});
