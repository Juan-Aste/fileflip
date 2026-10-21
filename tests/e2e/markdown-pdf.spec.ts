// Markdown → PDF runs on our server (Gotenberg's Chromium). The upload goes to
// the real API route; with GOTENBERG_URL set (docker compose up gotenberg,
// and the same variable for `next start`) the PDF is printed for real and
// checked with pdf-lib and pdf.js. Without it, the UI is checked against a
// simulated outage.
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
