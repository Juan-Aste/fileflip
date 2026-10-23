// Image → text: tesseract.js in Chromium with the engine and models served by
// our own server (public/ocr). The text output is compared with the fixture's
// known sentences (scripts/fixtures/ocr.mjs).
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { expect, fileOf, fixturePath, inspectPdf, openWithFiles, readText, runTool, test, toolAlert, waitForResult } from "./support";

/** Text of each page, read with pdf.js (what a viewer's search finds). */
async function pdfTexts(buf: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  const texts: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const items = (await (await doc.getPage(n)).getTextContent()).items as { str?: string }[];
    texts.push(items.map((i) => i.str ?? "").join(" ").replace(/\s+/g, " ").trim());
  }
  return texts;
}

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "OCR runs in the browser").toEqual([]);
});

/** Every request the page makes, to check nothing leaves our origin (no CDN). */
function recordRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (r) => urls.push(r.url()));
  page.on("worker", (w) => urls.push(w.url()));
  return urls;
}
const external = (urls: string[]) => urls.filter((u) => !/^(https?:\/\/localhost[:/]|blob:|data:)/.test(u));

test.describe("tool: image-to-text", () => {
  test("Spanish scan as PNG and 1-bit TIFF → text files, all from our own server", async ({ page }) => {
    test.setTimeout(120_000);
    const urls = recordRequests(page);
    await openWithFiles(page, "/es/imagen-a-texto", ["ocr-es.png", "ocr-es.tiff"]);
    await page.getByRole("button", { name: "Extraer texto", exact: true }).click();
    const links = page.locator("main li a[download]");
    await expect(links).toHaveCount(2, { timeout: 90_000 });
    for (let i = 0; i < 2; i++) {
      const out = fileOf(await waitForResult(page, links.nth(i), toolAlert(page)));
      expect(out.name).toBe(["ocr-es.txt", "ocr-es-2.txt"][i]);
      const text = readText(out.buf);
      expect(text).toContain("kiwi y papaya en enero.");
      expect(text).toContain("¿Cuánto cuesta? 1.250 pesos.");
    }
    // Only the Spanish model was downloaded, from /ocr.
    expect(urls.filter((u) => u.includes(".traineddata"))).toEqual([expect.stringMatching(/\/ocr\/tessdata-4\.0\.0_best_int\/spa\.traineddata\.gz$/)]);
    expect(urls.some((u) => /\/ocr\/tesseract\.js-core-[\d.]+\/tesseract-core-.*lstm\.wasm\.js$/.test(u))).toBe(true);
    expect(external(urls)).toEqual([]);
  });

  test("English phone photo (tilted, noisy JPEG)", { tag: "@xb" }, async ({ page }) => {
    test.setTimeout(120_000);
    await openWithFiles(page, "/en/image-to-text", ["ocr-en.jpg"]);
    await page.getByRole("button", { name: "Extract text", exact: true }).click();
    const out = fileOf(await waitForResult(page, page.locator('main a[download="ocr-en.txt"]'), toolAlert(page), 90_000));
    expect(readText(out.buf)).toBe("The quick brown fox\njumps over the lazy dog\nInvoice 4821 due in May\n");
    // A single result is also shown in the page, ready to copy.
    await expect(page.locator("main")).toContainText("jumps over the lazy dog");
  });

  test("Chinese, a picture without text and a damaged file in one batch", async ({ page }) => {
    test.setTimeout(120_000);
    const urls = recordRequests(page);
    await openWithFiles(page, "/zh/image-to-text", ["ocr-zh.png", "ocr-blank.png", "corrupt/truncated.png"]);
    await page.locator("label").filter({ hasText: "中文（简体）" }).click();
    await page.getByRole("button", { name: "提取文字", exact: true }).click();
    const link = page.locator('main a[download="ocr-zh.txt"]');
    const out = fileOf(await waitForResult(page, link, toolAlert(page), 90_000));
    expect(readText(out.buf)).toBe("今天天气很好\n我们去公园散步\n");
    await expect(page.locator("main li").filter({ hasText: "ocr-blank.png" })).toContainText("未找到文字");
    await expect(page.locator("main li").filter({ hasText: "truncated.png" })).toContainText("损坏");
    expect(urls.filter((u) => u.includes(".traineddata"))).toEqual([expect.stringMatching(/chi_sim\.traineddata\.gz$/)]);
    expect(external(urls)).toEqual([]);
  });

  test("cancelling stops the engine and the tool can run again", async ({ page }) => {
    test.setTimeout(120_000);
    await openWithFiles(page, "/en/image-to-text", ["ocr-en.jpg"]);
    await page.getByRole("button", { name: "Extract text", exact: true }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.locator("main a[download]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Extract text", exact: true })).toBeEnabled();
    const out = fileOf(await runTool(page, "Extract text"));
    expect(readText(out.buf)).toContain("Invoice 4821");
  });
});

test.describe("tool: ocr-pdf", () => {
  test("scanned PDF → searchable PDF: same pages and images, text found on the scans, the digital page untouched", async ({ page }) => {
    test.setTimeout(150_000);
    const urls = recordRequests(page);
    await openWithFiles(page, "/es/ocr-pdf", ["scan-text.pdf"]);
    await page.locator("label").filter({ hasText: /^English$/ }).click();
    await page.getByRole("button", { name: "Reconocer texto", exact: true }).click();
    const out = fileOf(await waitForResult(page, page.locator("main a[download]").first(), toolAlert(page), 120_000));
    expect(out.name).toBe("scan-text-ocr.pdf");
    const original = readFileSync(fixturePath("scan-text.pdf"));
    const [before, after] = [await inspectPdf(original), await inspectPdf(out.buf)];
    expect(after).toMatchObject({ pages: 3, rotations: [0, 90, 0], sizes: before.sizes, images: before.images });
    const texts = await pdfTexts(out.buf);
    expect(texts[0]).toContain("papaya");
    expect(texts[1]).toContain("Invoice 4821");
    expect(texts[2]).toBe((await pdfTexts(original))[2]);
    expect(external(urls)).toEqual([]);
  });

  test("text output, and a PDF that is already searchable or damaged", async ({ page }) => {
    test.setTimeout(150_000);
    await openWithFiles(page, "/en/ocr-pdf", ["scan-text.pdf", "document.pdf", "corrupt/truncated.pdf"]);
    await page.locator("label").filter({ hasText: "Text only (.txt)" }).click();
    await page.getByRole("button", { name: "Recognize text", exact: true }).click();
    const link = page.locator('main a[download="scan-text.txt"]');
    const out = fileOf(await waitForResult(page, link, toolAlert(page), 120_000));
    const text = readText(out.buf);
    expect(text).toContain("The quick brown fox");
    expect(text).toContain("Texto digital existente en la tercera pagina.");
    // document.pdf has digital text: as .txt it is just its text; truncated.pdf fails.
    await expect(page.locator("main li").filter({ hasText: "truncated.pdf" })).toContainText("damaged");
    await expect(page.locator('main a[download="document.txt"]')).toHaveCount(1);

    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixturePath("document.pdf"));
    await page.locator("label").filter({ hasText: "Searchable PDF" }).click();
    const searchable = await runTool(page, "Recognize text");
    expect(searchable.error).toContain("already has text");
  });

  test("more than 100 pages is refused before any OCR", async ({ page }) => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 101; i++) doc.addPage([200, 200]);
    await page.goto("/en/ocr-pdf", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles({ name: "long.pdf", mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) });
    const result = await runTool(page, "Recognize text");
    expect(result.error).toContain("too many pages");
  });
});
