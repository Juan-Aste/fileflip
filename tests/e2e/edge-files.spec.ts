// Hard real-world files in the image and PDF tools (6E.2 in PLAN.md): big
// phone photos with EXIF orientation, a 500-page PDF, a scan, a password,
// awkward file names, empty files, lying extensions and the size limit.
// Each must give a correct result or a clear message, never hang, and keep
// a sensible download name. Fixtures come from scripts/fixtures/edge.mjs.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, fileOf, fixturePath, inspectImage, inspectPdf, runTool, test, unzipEntries, waitForResult } from "./support";

const edge = (name: string) => fixturePath(join("edge", name));

// One worker for the whole file: the fixtures are generated once.
test.describe.configure({ mode: "serial" });
test.beforeAll(() => {
  test.setTimeout(120_000);
  if (!existsSync(edge("server-limit-plus-1kb.md"))) {
    execFileSync(process.execPath, [join(__dirname, "..", "..", "scripts", "fixtures", "edge.mjs")], { stdio: "ignore" });
  }
});
test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "browser tools must not call the server").toEqual([]);
});

async function open(page: Page, path: string, files: string[]) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(files);
  await page.waitForFunction(() => !document.body.innerText.includes("Detectando"), null, { timeout: 30_000 });
}

/** Home converter: one file to `to`. */
async function convert(page: Page, file: string, to: string) {
  await open(page, "/es", [file]);
  const row = page.locator("section li").first();
  await page.locator(`input[name="target"][value="${to}"]`).check({ force: true });
  await page.getByRole("button", { name: "Convertir", exact: true }).click();
  return waitForResult(page, row.locator("a[download]"), row.locator(".text-danger"), 120_000);
}

test.describe("images", () => {
  test.describe.configure({ timeout: 180_000 });

  test("48 MP phone photo with EXIF orientation 6 → compressed, upright", async ({ page }) => {
    await open(page, "/es/comprimir-imagen", [edge("phone-48mp-orientation6.jpg")]);
    const out = fileOf(await runTool(page, "Comprimir imágenes"));
    expect(out.name).toBe("phone-48mp-orientation6.jpg");
    const info = await inspectImage(out.buf);
    expect([info.width, info.height]).toEqual([6000, 8000]);
  });

  test("24 MP phone photo → PNG, upright", async ({ page }) => {
    const out = fileOf(await convert(page, edge("phone-24mp-orientation6.jpg"), "png"));
    expect(out.name).toBe("phone-24mp-orientation6.png");
    const info = await inspectImage(out.buf);
    expect([info.format, info.width, info.height]).toEqual(["png", 4000, 6000]);
  });

  test("12 MP PNG (33 MB) → WebP", async ({ page }) => {
    const out = fileOf(await convert(page, edge("phone-12mp.png"), "webp"));
    expect(out.name).toBe("phone-12mp.webp");
    expect(await inspectImage(out.buf)).toMatchObject({ format: "webp", width: 4000, height: 3000 });
  });

  for (const [file, expected] of [
    ["Fotografía de año nuevo — ñandú.jpg", "Fotografía de año nuevo — ñandú.png"],
    ["🎉 fiesta 😀.png", "🎉 fiesta 😀.jpg"],
    ["archivo.con.muchos.puntos.v2.final.jpg", "archivo.con.muchos.puntos.v2.final.png"],
    ["SIN EXTENSION", "SIN EXTENSION.jpg"],
    ["png-named.jpg", "png-named.png"],
  ] as const) {
    test(`file name kept: ${file}`, async ({ page }) => {
      const to = expected.split(".").pop()!;
      const out = fileOf(await convert(page, edge(file), to));
      expect(out.name.normalize("NFC")).toBe(expected.normalize("NFC"));
      expect((await inspectImage(out.buf)).format).toBe(to);
    });
  }

  test("empty image → clear message", async ({ page }) => {
    await open(page, "/es/comprimir-imagen", [edge("empty.jpg")]);
    await expect(page.locator("main")).toContainText(/vacío|empty|no se reconoce|no es/i);
  });

  test("over the browser size limit → clear message, nothing read", async ({ page }) => {
    await page.goto("/es/comprimir-imagen", { waitUntil: "networkidle" });
    // This tool takes up to 50 MB per file: 50 MB + 1 byte, created in the
    // page (never written to disk).
    await page.locator('input[type="file"]').first().evaluate((input: HTMLInputElement) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(50 * 1024 * 1024 + 1)], "enorme.jpg", { type: "image/jpeg" }));
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.locator("main")).toContainText("enorme.jpg: El archivo es demasiado grande.");
    await expect(page.getByRole("button", { name: "Comprimir imágenes", exact: true })).toHaveCount(0);
  });
});

test.describe("PDF", () => {
  test.describe.configure({ timeout: 180_000 });

  test("500-page PDF + 1 page → merged 501 pages", async ({ page }) => {
    await open(page, "/es/unir-pdf", [edge("many-pages-500.pdf"), fixturePath("document-1page.pdf")]);
    const out = fileOf(await runTool(page, "Unir PDF"));
    expect((await inspectPdf(out.buf)).pages).toBe(501);
  });

  test("500-page PDF split into single pages → ZIP of 500", async ({ page }) => {
    await open(page, "/es/dividir-pdf", [edge("many-pages-500.pdf")]);
    const out = fileOf(await runTool(page, "Dividir PDF"));
    expect(unzipEntries(out.buf)).toHaveLength(500);
  });

  test("scanned PDF → compressed, same pages", async ({ page }) => {
    await open(page, "/es/comprimir-pdf", [edge("scanned-5-pages.pdf")]);
    const out = fileOf(await runTool(page, "Comprimir PDF"));
    expect((await inspectPdf(out.buf)).pages).toBe(5);
  });

  test("password PDF in merge → says to remove the password first (B-18)", async ({ page }) => {
    await open(page, "/es/unir-pdf", [edge("password-abre123.pdf"), fixturePath("document-1page.pdf")]);
    const result = await runTool(page, "Unir PDF");
    expect(result.error).toBe(
      "Este PDF tiene contraseña de apertura. Quítala primero con «Quitar contraseña de PDF» y vuelve a intentarlo.",
    );
  });

  test("permissions-only PDF (no open password) → merged pages keep their content (B-18)", async ({ page }) => {
    await open(page, "/es/unir-pdf", [edge("permissions-only.pdf"), fixturePath("document-1page.pdf")]);
    const pdf = await inspectPdf(fileOf(await runTool(page, "Unir PDF")).buf);
    expect(pdf.labels).toEqual(["1 of 3", "2 of 3", "3 of 3", "1 of 1"]);
  });

  test("password PDF in a pdf.js tool (PDF to text) → same message", async ({ page }) => {
    await open(page, "/es/pdf-a-texto", [edge("password-abre123.pdf")]);
    await page.getByRole("button", { name: "Extraer texto", exact: true }).click();
    await expect(page.locator("main")).toContainText("Este PDF tiene contraseña de apertura");
  });

  test("long and Chinese names → split download keeps a sensible name", async ({ page }) => {
    const long = `${"informe-trimestral-".repeat(12)}fin.pdf`;
    await open(page, "/es/dividir-pdf", [edge(long)]);
    const out = fileOf(await runTool(page, "Dividir PDF"));
    expect(out.name.length).toBeLessThanOrEqual(255);
    expect(out.name).toMatch(/^informe-trimestral-/);
    await open(page, "/es/dividir-pdf", [edge("资料 文档.pdf")]);
    expect(fileOf(await runTool(page, "Dividir PDF")).name).toMatch(/^资料 文档/);
  });

  test("empty PDF → says the file is empty", async ({ page }) => {
    await open(page, "/es/unir-pdf", [edge("empty.pdf"), fixturePath("document-1page.pdf")]);
    await expect(page.locator("main li").filter({ hasText: "empty.pdf" })).toContainText("El archivo está vacío");
    await expect(page.getByRole("button", { name: "Unir PDF", exact: true })).toBeDisabled();
  });

  test("Word file named .pdf → only PDF, not merged", async ({ page }) => {
    await open(page, "/es/unir-pdf", [edge("docx-named.pdf"), fixturePath("document-1page.pdf")]);
    await expect(page.locator("main li").filter({ hasText: "docx-named.pdf" })).toContainText("Solo PDF");
    await expect(page.getByRole("button", { name: "Unir PDF", exact: true })).toBeDisabled();
  });
});
