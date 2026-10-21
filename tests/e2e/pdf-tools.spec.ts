// The PDF page tools, run like a user would on /es, with their output checked
// by pdf-lib and pdf.js. The fixtures' pages say "page N of M", which shows
// the final order. Corrupt inputs must end in a visible error.
import { readFileSync, statSync, writeFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import sharp from "sharp";
import {
  expect,
  fileOf,
  fixturePath,
  inspectImage,
  inspectPdf,
  openWithFiles,
  runTool,
  test,
  toolAlert,
  unzipEntries,
  waitForResult,
} from "./support";

const choose = (page: Page, label: string) => page.locator("label").filter({ hasText: label }).first().click();
const pagesBox = (page: Page) => page.getByRole("textbox", { name: "Páginas" });
const pdfOf = async (page: Page, action: string) => inspectPdf(fileOf(await runTool(page, action)).buf);
const zipOf = async (page: Page, action: string) =>
  Promise.all(unzipEntries(fileOf(await runTool(page, action)).buf).map((e) => inspectPdf(e.data)));

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "PDF tools must not call the server").toEqual([]);
});

test.describe("tool: merge-pdf", () => {
  test("merges in list order", async ({ page }) => {
    await openWithFiles(page, "/es/unir-pdf", ["document.pdf", "document-1page.pdf"]);
    const pdf = await pdfOf(page, "Unir PDF");
    expect(pdf.pages).toBe(4);
    expect(pdf.labels).toEqual(["1 of 3", "2 of 3", "3 of 3", "1 of 1"]);
  });

  test("follows a changed order", async ({ page }) => {
    await openWithFiles(page, "/es/unir-pdf", ["document.pdf", "document-1page.pdf"]);
    await page.getByRole("button", { name: "Bajar document.pdf" }).click();
    expect((await pdfOf(page, "Unir PDF")).labels).toEqual(["1 of 1", "1 of 3", "2 of 3", "3 of 3"]);
  });
});

test.describe("tool: split-pdf", () => {
  test("each page into its own PDF (ZIP)", async ({ page }) => {
    await openWithFiles(page, "/es/dividir-pdf", ["document.pdf"]);
    const parts = await zipOf(page, "Dividir PDF");
    expect(parts.map((p) => [p.pages, p.labels[0]])).toEqual([
      [1, "1 of 3"],
      [1, "2 of 3"],
      [1, "3 of 3"],
    ]);
  });

  test("extracts pages 1 and 3 into one PDF", async ({ page }) => {
    await openWithFiles(page, "/es/dividir-pdf", ["document.pdf"]);
    await choose(page, "Extraer páginas en un solo PDF");
    await pagesBox(page).fill("1, 3");
    expect((await pdfOf(page, "Dividir PDF")).labels).toEqual(["1 of 3", "3 of 3"]);
  });

  test("one PDF per range (ZIP)", async ({ page }) => {
    await openWithFiles(page, "/es/dividir-pdf", ["document.pdf"]);
    await choose(page, "Un PDF por cada rango");
    await pagesBox(page).fill("1-2, 3");
    const parts = await zipOf(page, "Dividir PDF");
    expect(parts.map((p) => p.labels)).toEqual([["1 of 3", "2 of 3"], ["3 of 3"]]);
  });
});

test.describe("tool: rotate-pdf", () => {
  test("rotates every page 90° clockwise", async ({ page }) => {
    await openWithFiles(page, "/es/rotar-pdf", ["document.pdf"]);
    expect((await pdfOf(page, "Rotar PDF")).rotations).toEqual([90, 90, 90]);
  });

  test("rotates only page 2 by 180°", async ({ page }) => {
    await openWithFiles(page, "/es/rotar-pdf", ["document.pdf"]);
    await choose(page, "180°");
    await choose(page, "Solo algunas");
    await pagesBox(page).fill("2");
    expect((await pdfOf(page, "Rotar PDF")).rotations).toEqual([0, 180, 0]);
  });
});

test.describe("tool: organize-pdf", () => {
  test("moves, rotates and deletes pages", async ({ page }) => {
    await openWithFiles(page, "/es/ordenar-pdf", ["document.pdf"]);
    const moveFirst = page.getByRole("button", { name: "Mover página 1 después" });
    await moveFirst.waitFor({ timeout: 20_000 });
    await moveFirst.click();
    await page.getByRole("button", { name: "Girar página 3" }).click();
    // After the move the original page 2 is first: delete it.
    await page.getByRole("button", { name: "Eliminar página 2" }).click();
    const pdf = await pdfOf(page, "Guardar PDF");
    expect(pdf.labels).toEqual(["1 of 3", "3 of 3"]);
    expect(pdf.rotations).toEqual([0, 90]);
  });
});

const thumb = (page: Page, n: number) => page.getByRole("button", { name: `Página ${n}`, exact: true });

test.describe("tool: delete-pdf-pages", () => {
  test("deletes the page picked on its thumbnail", async ({ page }) => {
    await openWithFiles(page, "/es/eliminar-paginas-pdf", ["document.pdf"]);
    await thumb(page, 2).click();
    await expect(thumb(page, 2)).toHaveAttribute("aria-pressed", "true");
    await expect(pagesBox(page)).toHaveValue("2");
    await expect(page.getByText("Se eliminará 1 página de 3.")).toBeVisible();
    const out = fileOf(await runTool(page, "Eliminar páginas"));
    expect(out.name).toBe("document-edited.pdf");
    const pdf = await inspectPdf(out.buf);
    expect(pdf.labels).toEqual(["1 of 3", "3 of 3"]);
  });

  test("typed ranges mark the thumbnails, and deleting every page is refused", async ({ page }) => {
    await openWithFiles(page, "/es/eliminar-paginas-pdf", ["document.pdf"]);
    await pagesBox(page).fill("1-");
    for (const n of [1, 2, 3]) await expect(thumb(page, n)).toHaveAttribute("aria-pressed", "true");
    await expect(toolAlert(page)).toContainText("No se pueden eliminar todas las páginas");
    await expect(page.getByRole("button", { name: "Eliminar páginas", exact: true })).toBeDisabled();
    await thumb(page, 1).click();
    await expect(pagesBox(page)).toHaveValue("2-3");
    expect((await pdfOf(page, "Eliminar páginas")).labels).toEqual(["1 of 3"]);
  });
});

test.describe("tool: extract-pdf-pages", () => {
  test("extracts typed pages into one PDF in the original order", async ({ page }) => {
    await openWithFiles(page, "/es/extraer-paginas-pdf", ["document.pdf"]);
    const action = page.getByRole("button", { name: "Extraer páginas", exact: true });
    await expect(thumb(page, 1)).toBeVisible();
    await expect(action).toBeDisabled();
    await pagesBox(page).fill("3, 1");
    await expect(thumb(page, 1)).toHaveAttribute("aria-pressed", "true");
    await expect(thumb(page, 2)).toHaveAttribute("aria-pressed", "false");
    const out = fileOf(await runTool(page, "Extraer páginas"));
    expect(out.name).toBe("document-1_3.pdf");
    expect((await inspectPdf(out.buf)).labels).toEqual(["1 of 3", "3 of 3"]);
  });

  test("one PDF per picked page (ZIP)", async ({ page }) => {
    await openWithFiles(page, "/en/extract-pdf-pages", ["document.pdf"]);
    await page.getByRole("button", { name: "Page 3", exact: true }).click();
    await page.getByRole("button", { name: "Page 2", exact: true }).click();
    await choose(page, "One PDF per page (ZIP)");
    const out = fileOf(await runTool(page, "Extract pages"));
    expect(out.name).toBe("document-pages.zip");
    const entries = unzipEntries(out.buf);
    expect(entries.map((e) => e.name)).toEqual(["document-2.pdf", "document-3.pdf"]);
    const parts = await Promise.all(entries.map((e) => inspectPdf(e.data)));
    expect(parts.map((p) => p.labels)).toEqual([["2 of 3"], ["3 of 3"]]);
  });
});

/** Text of each page, read with pdf.js. */
async function pageTexts(buf: Buffer): Promise<string[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  const texts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const items = (await (await doc.getPage(i)).getTextContent()).items as { str?: string }[];
    texts.push(items.map((t) => t.str ?? "").join(" "));
  }
  return texts;
}

test.describe("tool: pdf-page-numbers", () => {
  test("'Página N de M' at the top right of every page", async ({ page }) => {
    await openWithFiles(page, "/es/numerar-paginas-pdf", ["document.pdf"]);
    await choose(page, "Página 1 de 10");
    await choose(page, "Arriba a la derecha");
    const out = fileOf(await runTool(page, "Numerar páginas"));
    expect(out.name).toBe("document-numbered.pdf");
    const texts = await pageTexts(out.buf);
    texts.forEach((text, i) => expect(text).toContain(`Página ${i + 1} de 3`));
    expect((await inspectPdf(out.buf)).labels).toEqual(["1 of 3", "2 of 3", "3 of 3"]);
  });

  test("cover without a number, a batch of two PDFs", async ({ page }) => {
    await openWithFiles(page, "/en/add-page-numbers-to-pdf", ["document.pdf", "document-1page.pdf"]);
    await choose(page, "No number on the first page (cover)");
    await page.getByRole("button", { name: "Add page numbers", exact: true }).click();
    const links = page.locator("main a[download]");
    await expect(links).toHaveCount(2);
    const three = fileOf(await waitForResult(page, links.nth(0), toolAlert(page)));
    const texts = await pageTexts(three.buf);
    expect(texts.map((t) => t.match(/(?:^|\s)(\d)$/)?.[1] ?? null)).toEqual([null, "1", "2"]);
    const one = fileOf(await waitForResult(page, links.nth(1), toolAlert(page)));
    expect((await inspectPdf(one.buf)).pages).toBe(1);
  });

  test("Chinese numbering is drawn as images with the device's fonts", async ({ page }) => {
    await openWithFiles(page, "/zh/add-page-numbers-to-pdf", ["document.pdf"]);
    await choose(page, "第 1 页，共 10 页");
    const pdf = await pdfOf(page, "添加页码");
    expect(pdf.pages).toBe(3);
    // One PNG per page, each with its transparency mask (also an image).
    expect(pdf.images).toBe(6);
  });
});

test.describe("tool: pdf-watermark", () => {
  test("diagonal CONFIDENCIAL on every page", async ({ page }) => {
    await openWithFiles(page, "/es/marca-de-agua-pdf", ["document.pdf"]);
    await expect(page.getByRole("textbox", { name: "Texto de la marca de agua" })).toHaveValue("CONFIDENCIAL");
    const out = fileOf(await runTool(page, "Agregar marca de agua"));
    expect(out.name).toBe("document-watermark.pdf");
    for (const text of await pageTexts(out.buf)) expect(text).toContain("CONFIDENCIAL");
  });

  test("only page 2, tiled; pages beyond the end fail clearly", async ({ page }) => {
    await openWithFiles(page, "/es/marca-de-agua-pdf", ["document.pdf"]);
    await page.getByRole("textbox", { name: "Texto de la marca de agua" }).fill("BORRADOR");
    await choose(page, "Mosaico (repetida)");
    await choose(page, "Solo algunas");
    await pagesBox(page).fill("2");
    const texts = await pageTexts(fileOf(await runTool(page, "Agregar marca de agua")).buf);
    const counts = texts.map((t) => (t.match(/BORRADOR/g) ?? []).length);
    expect(counts[0]).toBe(0);
    expect(counts[1]).toBeGreaterThan(10);
    expect(counts[2]).toBe(0);

    await openWithFiles(page, "/es/marca-de-agua-pdf", ["document.pdf"]);
    await choose(page, "Solo algunas");
    await pagesBox(page).fill("9");
    const result = await runTool(page, "Agregar marca de agua");
    expect(result.error).toContain("Las páginas elegidas no existen");
  });

  test("a Chinese watermark is embedded as an image", async ({ page }) => {
    await openWithFiles(page, "/zh/watermark-pdf", ["document-1page.pdf"]);
    await expect(page.getByRole("textbox", { name: "水印文字" })).toHaveValue("机密");
    const pdf = await pdfOf(page, "添加水印");
    // One PNG and its transparency mask.
    expect(pdf.images).toBe(2);
  });
});

test.describe("tool: pdf-to-text", () => {
  test("every page's text in a UTF-8 TXT, with page headings", async ({ page }) => {
    await openWithFiles(page, "/es/pdf-a-texto", ["document.pdf"]);
    await choose(page, "Marcar el comienzo de cada página");
    const out = fileOf(await runTool(page, "Extraer texto"));
    expect(out.name).toBe("document.txt");
    const text = out.buf.toString("utf8");
    for (const n of [1, 2, 3]) expect(text).toContain(`--- Página ${n} ---\n\nFileflect sample page ${n} of 3\nSynthetic text for automated tests.`);
    await expect(page.getByRole("textbox", { name: "Vista previa" })).toHaveValue(/^--- Página 1 ---/);
  });

  test("a scan says it needs OCR; a damaged PDF fails", async ({ page }) => {
    await openWithFiles(page, "/es/pdf-a-texto", ["scan.pdf", "corrupt/garbage.pdf"]);
    await page.getByRole("button", { name: "Extraer texto", exact: true }).click();
    await expect(page.getByText(/parece una imagen escaneada/)).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("main a[download]")).toHaveCount(0);
  });
});

test.describe("tool: crop-pdf", () => {
  const cropBoxes = async (buf: Buffer) => {
    const { PDFDocument } = await import("pdf-lib");
    return (await PDFDocument.load(buf)).getPages().map((p) => p.getCropBox());
  };

  test("automatic: crops each page around its text with a small margin", async ({ page }) => {
    await openWithFiles(page, "/es/recortar-pdf", ["document.pdf"]);
    const out = fileOf(await runTool(page, "Recortar PDF"));
    expect(out.name).toBe("document-cropped.pdf");
    const boxes = await cropBoxes(out.buf);
    expect(boxes).toHaveLength(3);
    for (const b of boxes) {
      // The text runs from x=56 and between y≈738 and y≈790 (points).
      expect(b.x).toBeGreaterThan(40);
      expect(b.x).toBeLessThan(56);
      expect(b.y).toBeGreaterThan(715);
      expect(b.y).toBeLessThan(740);
      expect(b.y + b.height).toBeGreaterThan(785);
      expect(b.y + b.height).toBeLessThan(810);
      expect(b.width).toBeLessThan(400);
    }
    // Content is untouched: the text is still there.
    expect((await inspectPdf(out.buf)).labels).toEqual(["1 of 3", "2 of 3", "3 of 3"]);
  });

  test("manual: 10 mm from every side", async ({ page }) => {
    await openWithFiles(page, "/en/crop-pdf", ["document-1page.pdf"]);
    await choose(page, "Fixed margins in millimeters");
    const top = page.getByRole("textbox", { name: "Top" });
    await top.fill("x");
    await expect(page.getByText("Type numbers from 0 to 999")).toBeVisible();
    await expect(page.getByRole("button", { name: "Crop PDF", exact: true })).toBeDisabled();
    await top.fill("10");
    const [b] = await cropBoxes(fileOf(await runTool(page, "Crop PDF")).buf);
    const mm10 = (10 * 72) / 25.4;
    expect([b!.x, b!.y, b!.width, b!.height].map((v) => Math.round(v))).toEqual([mm10, mm10, 595 - 2 * mm10, 842 - 2 * mm10].map((v) => Math.round(v)));
  });
});

test.describe("tool: images-to-pdf", () => {
  test("JPG + PNG + HEIC on landscape A4 (default)", async ({ page }) => {
    await openWithFiles(page, "/es/imagenes-a-pdf", ["image.jpg", "image.png", "photo.heic"]);
    const pdf = await pdfOf(page, "Crear PDF");
    expect(pdf.pages).toBe(3);
    expect(pdf.images).toBeGreaterThanOrEqual(3);
    expect(pdf.sizes).toEqual(["842×595"]);
  });

  test("WEBP + GIF at image size without margin", async ({ page }) => {
    await openWithFiles(page, "/es/imagenes-a-pdf", ["image.webp", "image.gif"]);
    await choose(page, "Igual a la imagen");
    await choose(page, "Sin margen");
    const pdf = await pdfOf(page, "Crear PDF");
    expect(pdf.pages).toBe(2);
    expect(pdf.sizes).toEqual(["160×120"]);
  });
});

test.describe("tool: compress-pdf", () => {
  const original = () => statSync(fixturePath("document-images.pdf")).size;

  for (const level of ["Recomendada", "Fuerte"]) {
    test(`makes a PDF with photos smaller (${level})`, async ({ page }) => {
      await openWithFiles(page, "/es/comprimir-pdf", ["document-images.pdf"]);
      await choose(page, level);
      const { buf } = fileOf(await runTool(page, "Comprimir PDF"));
      const pdf = await inspectPdf(buf);
      expect(pdf.pages).toBe(2);
      expect(pdf.images).toBeGreaterThanOrEqual(1);
      expect(buf.length).toBeLessThan(original());
    });
  }
});

test.describe("corrupt inputs end in a visible error", () => {
  const cases: [string, string[], string][] = [
    ["/es/unir-pdf", ["document.pdf", "corrupt/garbage.pdf"], "Unir PDF"],
    ["/es/unir-pdf", ["document.pdf", "corrupt/truncated.pdf"], "Unir PDF"],
    ["/es/dividir-pdf", ["corrupt/garbage.pdf"], "Dividir PDF"],
    ["/es/rotar-pdf", ["corrupt/truncated.pdf"], "Rotar PDF"],
    ["/es/ordenar-pdf", ["corrupt/garbage.pdf"], "Guardar PDF"],
    ["/es/eliminar-paginas-pdf", ["corrupt/garbage.pdf"], "Eliminar páginas"],
    ["/es/extraer-paginas-pdf", ["corrupt/truncated.pdf"], "Extraer páginas"],
    ["/es/numerar-paginas-pdf", ["corrupt/garbage.pdf"], "Numerar páginas"],
    ["/es/marca-de-agua-pdf", ["corrupt/truncated.pdf"], "Agregar marca de agua"],
    ["/es/recortar-pdf", ["corrupt/garbage.pdf"], "Recortar PDF"],
    ["/es/comprimir-pdf", ["corrupt/truncated.pdf"], "Comprimir PDF"],
    ["/es/imagenes-a-pdf", ["image.png", "corrupt/truncated.png"], "Crear PDF"],
  ];
  for (const [path, files, action] of cases) {
    test(`${path}: ${files.join(" + ")}`, async ({ page }) => {
      await openWithFiles(page, path, files);
      // A broken file may be flagged on load, before any action.
      await page.waitForTimeout(1500);
      if (await toolAlert(page).count()) return;
      const button = page.getByRole("button", { name: action, exact: true });
      if (await button.isDisabled()) return;
      const result = await runTool(page, action);
      expect(result.error, "must not produce a file").toBeTruthy();
    });
  }

  test("names the damaged image", async ({ page }) => {
    await openWithFiles(page, "/es/imagenes-a-pdf", ["image.png", "corrupt/truncated.png"]);
    const result = await runTool(page, "Crear PDF");
    expect(result.error).toContain("truncated.png");
  });
});

test.describe("tool: extract-pdf-images", () => {
  /** Page 1: a JPEG photo and a transparent PNG; page 2: the same photo again and a 10×10 red dot. */
  async function samplePdf() {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const jpg = await doc.embedJpg(readFileSync(fixturePath("photo.jpg")));
    const png = await doc.embedPng(readFileSync(fixturePath("photo-alpha.png")));
    const dot = await doc.embedPng(await sharp({ create: { width: 10, height: 10, channels: 3, background: "#f00" } }).png().toBuffer());
    const p1 = doc.addPage([600, 800]);
    p1.drawImage(jpg, { x: 20, y: 400, width: 300, height: 200 });
    p1.drawImage(png, { x: 20, y: 100, width: 200, height: 150 });
    const p2 = doc.addPage([600, 800]);
    p2.drawImage(jpg, { x: 50, y: 50, width: 100, height: 70 });
    p2.drawImage(dot, { x: 300, y: 300, width: 10, height: 10 });
    const path = test.info().outputPath("album.pdf");
    writeFileSync(path, await doc.save());
    return path;
  }

  test("original JPEG byte for byte and a transparent PNG; small images optional", async ({ page }) => {
    const pdf = await samplePdf();
    await page.goto("/es/extraer-imagenes-pdf", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles(pdf);
    await page.getByRole("button", { name: "Extraer imágenes", exact: true }).click();
    const links = page.locator("main li a[download]");
    await expect(links).toHaveCount(2, { timeout: 45_000 });
    const jpg = fileOf(await waitForResult(page, links.nth(0), toolAlert(page)));
    expect(jpg.name).toBe("album-p1-1.jpg");
    expect(jpg.buf.equals(readFileSync(fixturePath("photo.jpg")))).toBe(true);
    const png = fileOf(await waitForResult(page, links.nth(1), toolAlert(page)));
    expect(png.name).toBe("album-p1-2.png");
    expect(await inspectImage(png.buf)).toMatchObject({ format: "png", width: 360, height: 270 });
    const [a, b] = await Promise.all([
      sharp(png.buf).ensureAlpha().raw().toBuffer(),
      sharp(readFileSync(fixturePath("photo-alpha.png"))).ensureAlpha().raw().toBuffer(),
    ]);
    // Same alpha; the canvas stores premultiplied colors, so semi-transparent pixels round a little.
    let alphaDiff = 0;
    let colorDiff = 0;
    let counted = 0;
    for (let i = 0; i < a.length; i += 4) {
      alphaDiff = Math.max(alphaDiff, Math.abs(a[i + 3]! - b[i + 3]!));
      if (b[i + 3]! < 32) continue;
      for (let c = 0; c < 3; c++) colorDiff += Math.abs(a[i + c]! - b[i + c]!);
      counted += 3;
    }
    expect(alphaDiff).toBe(0);
    expect(colorDiff / counted).toBeLessThan(1.5);
    // The ZIP has both.
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Descargar todo/ }).click()]);
    expect(download.suggestedFilename()).toBe("fileflect-images.zip");
    expect(unzipEntries(readFileSync((await download.path())!)).map((e) => e.name)).toEqual(["album-p1-1.jpg", "album-p1-2.png"]);

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(pdf);
    await page.getByLabel(/Ignorar imágenes pequeñas/).uncheck();
    await page.getByRole("button", { name: "Extraer imágenes", exact: true }).click();
    await expect(links).toHaveCount(3, { timeout: 45_000 });
    const dot = fileOf(await waitForResult(page, links.nth(2), toolAlert(page)));
    expect(dot.name).toBe("album-p2-1.png");
    expect(await inspectImage(dot.buf)).toMatchObject({ width: 10, height: 10 });
  });

  test("a scan gives its page image; no images and damaged files fail", async ({ page }) => {
    await openWithFiles(page, "/en/extract-images-from-pdf", ["scan.pdf", "document.pdf", "corrupt/garbage.pdf"]);
    await page.getByRole("button", { name: "Extract images", exact: true }).click();
    const links = page.locator("main li a[download]");
    await expect(links).toHaveCount(1, { timeout: 45_000 });
    expect(await inspectImage(fileOf(await waitForResult(page, links.nth(0), toolAlert(page))).buf)).toMatchObject({ width: 320, height: 240 });
    await expect(page.getByText(/has no images to extract/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/damaged/i).first()).toBeVisible({ timeout: 30_000 });
  });
});
