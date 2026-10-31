// Fill PDF form: fields filled in the page, saved and read back with
// independent readers (pdf.js for the field values, poppler for flattened text).
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, fileOf, openWithFiles, runTool, test, toolAlert } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "filling a form must not call the server").toEqual([]);
});

const dir = mkdtempSync(join(tmpdir(), "fill-pdf-e2e-"));
let n = 0;
function save(buf: Buffer) {
  const path = join(dir, `out${n++}.pdf`);
  writeFileSync(path, buf);
  return path;
}
const pdftotext = (buf: Buffer, page: number) => execFileSync("pdftotext", ["-f", String(page), "-l", String(page), "-layout", save(buf), "-"], { encoding: "utf8" });
const formType = (buf: Buffer) => /^Form:\s+(.+)$/m.exec(execFileSync("pdfinfo", [save(buf)], { encoding: "utf8" }))?.[1];

/** Field name → value, as pdf.js reads the widgets. */
async function fieldValues(buf: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  const values: Record<string, unknown> = {};
  for (let i = 1; i <= doc.numPages; i++) {
    for (const a of await (await doc.getPage(i)).getAnnotations()) if (a.fieldName) values[a.fieldName] ??= a.fieldValue;
  }
  await doc.loadingTask.destroy();
  return values;
}

test.describe("tool: fill-pdf-form", () => {
  test("fills every kind of field and keeps the form editable @xb", async ({ page }) => {
    await openWithFiles(page, "/es/rellenar-formulario-pdf", ["form-sample.pdf"]);
    await expect(page.getByText("Encontramos 8 campos.")).toBeVisible();
    await page.getByLabel("Nombre completo").fill("Ana Pérez");
    await expect(page.getByTestId("form-preview").locator("img")).toHaveAttribute("alt", "Página 1");
    await page.getByLabel("cp", { exact: true }).fill("12345");
    await page.getByLabel("direccion", { exact: true }).fill("Calle Falsa 123\nSpringfield");
    await expect(page.getByLabel("folio (solo lectura)")).toBeDisabled();
    await page.getByLabel("acepto", { exact: true }).check();
    await page.getByRole("radio", { name: "Anual" }).check();
    // The preview follows the field being filled.
    await expect(page.getByTestId("form-preview").locator("img")).toHaveAttribute("alt", "Página 2");
    await page.getByLabel("Pais de residencia").selectOption("Chile");
    const interests = page.getByRole("group", { name: "intereses" });
    await interests.getByLabel("PDF").check();
    await interests.getByLabel("Audio").check();

    const out = fileOf(await runTool(page, "Guardar PDF"));
    expect(out.name).toBe("form-sample-filled.pdf");
    expect(formType(out.buf)).toBe("AcroForm");
    expect(await fieldValues(out.buf)).toMatchObject({
      "persona.nombre": "Ana Pérez",
      "persona.cp": "12345",
      "persona.direccion": "Calle Falsa 123\nSpringfield",
      folio: "A-001",
      acepto: "Yes",
      plan: "Anual",
      pais: ["Chile"],
      intereses: ["PDF", "Audio"],
    });
  });

  test("flattens the values into the page", async ({ page }) => {
    await openWithFiles(page, "/en/fill-pdf-form", ["form-sample.pdf"]);
    await page.getByLabel("Nombre completo").fill("Jane Doe");
    await page.getByLabel("Pais de residencia").selectOption("Uruguay");
    await page.getByLabel(/Flatten the form/).check();
    const out = fileOf(await runTool(page, "Save PDF"));
    expect(out.name).toBe("form-sample-flattened.pdf");
    expect(formType(out.buf)).toBe("none");
    expect(pdftotext(out.buf, 1)).toContain("Jane Doe");
    expect(pdftotext(out.buf, 2)).toContain("Uruguay");
    expect(await fieldValues(out.buf)).toEqual({});
  });

  test("explains XFA-only forms and PDFs without fields, with a link to Edit PDF", async ({ page }) => {
    await openWithFiles(page, "/en/fill-pdf-form", ["form-xfa.pdf"]);
    await expect(toolAlert(page)).toContainText("XFA form");
    await expect(toolAlert(page).getByRole("link", { name: "Open Edit PDF" })).toHaveAttribute("href", "/en/edit-pdf");
    await expect(page.getByRole("button", { name: "Save PDF" })).toHaveCount(0);

    await openWithFiles(page, "/en/fill-pdf-form", ["document-1page.pdf"]);
    await expect(toolAlert(page)).toContainText("no form fields");
  });
});
