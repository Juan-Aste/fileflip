// Tools that run on our server with Gotenberg (Markdown/HTML → PDF with
// Chromium, PDF → PDF/A with LibreOffice). Uploads go to the real API routes;
// with GOTENBERG_URL set (docker compose up gotenberg, and the same variable
// for `next start`) the output is made for real and checked with pdf-lib and
// pdf.js. Without it, errors the route answers by itself and a simulated
// outage are still checked.
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { expect, fileOf, openWithFiles, runTool, test, toolAlert } from "./support";

async function pdfText(buf: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  let text = "";
  for (let n = 1; n <= doc.numPages; n++) {
    text += ((await (await doc.getPage(n)).getTextContent()).items as { str?: string }[]).map((t) => t.str ?? "").join("");
  }
  return text.normalize("NFKC");
}

test.describe("tool: markdown-to-pdf", () => {
  test("Markdown files and pasted text become PDFs printed by Gotenberg", async ({ page }) => {
    test.skip(!process.env.GOTENBERG_URL, "needs Gotenberg (GOTENBERG_URL)");
    const uploads: string[] = [];
    // Only this tool's endpoint goes through; other conversion calls stay blocked.
    await page.route("**/api/convert/markdown", (route) => {
      uploads.push(route.request().postData() ?? "");
      return route.continue();
    });
    await openWithFiles(page, "/es/markdown-a-pdf", ["document.md"]);
    await page.getByLabel("Tamaño de página").selectOption("letter");
    const out = fileOf(await runTool(page, "Convertir a PDF"));
    expect(out.name).toBe("document.pdf");
    const doc = await PDFDocument.load(out.buf);
    expect(doc.getTitle()).toBe("Informe ñandú");
    const { width, height } = doc.getPage(0).getSize();
    expect([Math.round(width), Math.round(height)]).toEqual([612, 792]);
    const text = await pdfText(out.buf);
    for (const expected of ["Informe ñandú", "Producto", "Café", "3,10", "const total = 5.6;"]) expect(text).toContain(expected);
    expect(uploads[0]).toContain('{"pageSize":"letter"}');

    // Two inputs → two PDFs (A4 by default in English too), each downloadable, plus the ZIP option.
    await page.goto("/en/markdown-to-pdf", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles([
      { name: "a.md", mimeType: "text/markdown", buffer: Buffer.from("# Alpha\n\n中文 text") },
      { name: "b.markdown", mimeType: "text/markdown", buffer: Buffer.from("# Beta\n\n- one\n- two") },
    ]);
    await page.getByRole("button", { name: "Convert to PDF", exact: true }).click();
    await expect(page.getByRole("button", { name: /ZIP/ })).toBeVisible({ timeout: 45_000 });
    const links = page.locator("main a[download]");
    expect(await links.evaluateAll((all) => all.map((a) => a.getAttribute("download")))).toEqual(["a.pdf", "b.pdf"]);
    const entries: { name: string; data: Buffer }[] = [];
    for (const link of await links.all()) {
      const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
      entries.push({ name: download.suggestedFilename(), data: readFileSync((await download.path())!) });
    }
    for (const entry of entries) {
      const pdf = await PDFDocument.load(entry.data);
      expect(Math.round(pdf.getPage(0).getSize().width)).toBe(595);
    }
    expect(await pdfText(entries[1].data)).toContain("one");
    expect(await pdfText(entries.find((e) => e.name === "a.pdf")!.data)).toContain("中文 text");
  });

  test("binary content is refused and a service outage is explained", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/convert/markdown", (route) => {
      calls++;
      // The first upload reaches the real route (it refuses binary content before printing).
      if (calls === 1) return route.continue();
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "serviceUnavailable" }) });
    });
    await page.goto("/es/markdown-a-pdf", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles({ name: "fake.md", mimeType: "text/markdown", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]) });
    expect(await runTool(page, "Convertir a PDF")).toEqual({ error: expect.stringContaining("formato") });

    await page.getByRole("button", { name: "Quitar fake.md" }).click();
    await page.getByRole("textbox", { name: /pega/i }).fill("# Hola");
    const result = await runTool(page, "Convertir a PDF");
    expect(result.error).toContain("El servicio no está disponible");
    await expect(toolAlert(page).first()).toBeVisible();
    expect(calls).toBe(2);
  });
});

test.describe("tool: html-to-pdf", () => {
  test("an HTML page is printed without its scripts or remote resources", async ({ page }) => {
    test.skip(!process.env.GOTENBERG_URL, "needs Gotenberg (GOTENBERG_URL)");
    await page.route("**/api/convert/html", (route) => route.continue());
    await openWithFiles(page, "/es/html-a-pdf", ["page.html"]);
    const out = fileOf(await runTool(page, "Convertir a PDF"));
    expect(out.name).toBe("page.pdf");
    const doc = await PDFDocument.load(out.buf);
    expect(doc.getTitle()).toBe("Página");
    expect(Math.round(doc.getPage(0).getSize().width)).toBe(595);
    const text = await pdfText(out.buf);
    for (const expected of ["Guía 中文", "Hola", "mundo", "uno", "dos", 'print("hola")', "Documentación"]) expect(text).toContain(expected);
    expect(text).not.toContain("pwned");
  });

  test("crafted nesting is refused with a clear error", async ({ page }) => {
    await page.route("**/api/convert/html", (route) => route.continue());
    await page.goto("/en/html-to-pdf", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles({ name: "deep.html", mimeType: "text/html", buffer: Buffer.from("<div>".repeat(3000)) });
    expect(await runTool(page, "Convert to PDF")).toEqual({ error: expect.stringContaining("damaged") });
  });
});

test.describe("tool: pdf-to-pdfa", () => {
  test("a PDF becomes a PDF/A-1b copy with the same pages", async ({ page }) => {
    test.skip(!process.env.GOTENBERG_URL, "needs Gotenberg (GOTENBERG_URL)");
    await page.route("**/api/convert/pdfa", (route) => route.continue());
    await openWithFiles(page, "/es/pdf-a-pdfa", ["document.pdf"]);
    await page.getByText("PDF/A-1b", { exact: true }).click();
    await expect(page.getByText("La primera versión: para sistemas")).toBeVisible();
    const out = fileOf(await runTool(page, "Convertir a PDF/A"));
    expect(out.name).toBe("document-pdfa.pdf");
    const doc = await PDFDocument.load(out.buf);
    expect(doc.getPageCount()).toBe(3);
    const xmp = out.buf.toString("latin1");
    expect(xmp).toMatch(/pdfaid:part(>|=")1/);
    expect(xmp).toMatch(/pdfaid:conformance(>|=")B/);
    expect(await pdfText(out.buf)).toContain("page 2 of 3");
  });

  test("a damaged PDF is explained by the route", async ({ page }) => {
    await page.route("**/api/convert/pdfa", (route) => route.continue());
    await openWithFiles(page, "/en/pdf-to-pdfa", ["corrupt/truncated.pdf"]);
    expect(await runTool(page, "Convert to PDF/A")).toEqual({ error: expect.stringContaining("damaged") });
  });
});

test.describe("tool: epub-to-pdf", () => {
  test("an EPUB is read in the browser and printed: contents, one chapter per page, images", async ({ page }) => {
    test.skip(!process.env.GOTENBERG_URL, "needs Gotenberg (GOTENBERG_URL)");
    const uploads: string[] = [];
    await page.route("**/api/convert/epub", (route) => {
      uploads.push(route.request().postData() ?? "");
      return route.continue();
    });
    await openWithFiles(page, "/es/epub-a-pdf", ["book.epub"]);
    await page.getByLabel("Tamaño de página").selectOption("letter");
    const out = fileOf(await runTool(page, "Convertir a PDF"));
    expect(out.name).toBe("book.pdf");
    // Only the assembled page travels: no EPUB, no scripts.
    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toContain('filename="book.html"');
    expect(uploads[0]).not.toMatch(/<script|PK\u0003\u0004/);
    const doc = await PDFDocument.load(out.buf);
    expect(doc.getTitle()).toBe("El viaje de prueba");
    expect(Math.round(doc.getPage(0).getSize().width)).toBe(612);
    // Contents page + cover + 2 chapters, each starting on its own page.
    expect(doc.getPageCount()).toBe(4);
    const text = await pdfText(out.buf);
    for (const expected of ["Contenido", "Capítulo 1: La partida", "Era una mañana de otoño", "La llegada", "Kilómetros"]) expect(text).toContain(expected);
    expect(text).not.toContain("pwned");
    // The two PNGs of the book are in the PDF.
    expect(out.buf.toString("latin1").match(/\/Subtype\s*\/Image/g)?.length).toBeGreaterThanOrEqual(2);
  });

  test("DRM and damaged books fail in the browser, before anything is uploaded", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/convert/epub", (route) => {
      calls++;
      return route.continue();
    });
    await openWithFiles(page, "/en/epub-to-pdf", ["corrupt/ebook-drm.epub", "corrupt/ebook-truncated.epub"]);
    await page.getByRole("button", { name: "Convert to PDF", exact: true }).click();
    const main = page.locator("main");
    await expect(main).toContainText("DRM", { timeout: 30_000 });
    await expect(main).toContainText("damaged");
    await expect(page.locator("main a[download]")).toHaveCount(0);
    expect(calls).toBe(0);
  });
});
