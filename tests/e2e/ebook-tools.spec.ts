// EPUB → HTML / TXT: outputs are parsed with jsdom (independent of the app);
// nothing from the book may run or be fetched, and DRM or damaged books fail clearly.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { expect, fileOf, openWithFiles, readText, runTool, test, toolAlert, unzipEntries, waitForResult } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "ebook tools must not call the server").toEqual([]);
});

test.describe("tool: epub-converter", () => {
  test("EPUB 3 → one safe HTML page: contents, chapter links that land, embedded images, no requests", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      if (!r.url().startsWith("http://localhost")) external.push(r.url());
    });
    await openWithFiles(page, "/es/convertir-epub", ["book.epub"]);
    const out = fileOf(await runTool(page, "Convertir libro"));
    expect(out.name).toBe("book.html");
    const html = readText(out.buf);
    const doc = new JSDOM(html).window.document;
    expect(doc.title).toBe("El viaje de prueba");
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute("content")).toContain("default-src 'none'");
    expect([...doc.querySelectorAll("nav.toc a")].map((a) => a.textContent)).toEqual(["Capítulo 1: La partida", "Capítulo 2"]);
    expect(doc.querySelector("nav.toc h2")?.textContent).toBe("Contenido");
    const link = doc.querySelector('a[href^="#c2-"]')!;
    expect(link.textContent).toBe("capítulo dos");
    expect(doc.getElementById(link.getAttribute("href")!.slice(1))?.textContent).toBe("La llegada");
    const images = [...doc.querySelectorAll("img")].map((img) => img.getAttribute("src")!);
    expect(images).toHaveLength(2);
    for (const src of images) expect(src.startsWith("data:image/png;base64,")).toBe(true);
    expect(doc.querySelector("script")).toBeNull();
    expect(html).not.toMatch(/onclick|javascript:|pwned|tracker\.png/);
    expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBeUndefined();
    expect(external).toEqual([]);
  });

  test("EPUB 2 → plain text with the preview; UTF-16 chapter and character references", async ({ page }) => {
    await openWithFiles(page, "/en/epub-converter", ["book-epub2.epub"]);
    await page.getByText("Plain text (.txt)", { exact: true }).click();
    const out = fileOf(await runTool(page, "Convert book"));
    expect(out.name).toBe("book-epub2.txt");
    const text = readText(out.buf);
    expect(text.startsWith("A Test Journey\nSam Sample\n\n\nPart one\n\nThe quick brown fox")).toBe(true);
    expect(text).toContain("Café and naïve.");
    expect(text).toContain("Written in UTF-16: 東京 and Zürich.");
    await expect(page.getByRole("textbox", { name: "Preview" })).toHaveValue(/Part two/);
  });

  test("a batch with DRM, damaged and cut books: clear errors, the good book still converts", async ({ page }) => {
    await openWithFiles(page, "/es/convertir-epub", ["book.epub", "corrupt/ebook-drm.epub", "corrupt/ebook-truncated.epub", "corrupt/ebook-entities.epub"]);
    await page.getByText("Texto plano (.txt)", { exact: true }).click();
    await page.getByRole("button", { name: "Convertir libro", exact: true }).click();
    const links = page.locator("main li a[download]");
    await expect(links).toHaveCount(1, { timeout: 45_000 });
    const main = page.locator("main");
    await expect(main).toContainText("DRM");
    await expect(main).toContainText("dañado");
    // One good book: its own download, no "download all" ZIP.
    const out = fileOf(await waitForResult(page, links.first(), toolAlert(page)));
    expect(out.name).toBe("book.txt");
    expect(readText(out.buf)).toContain("Al final del camino había una casa con 3 ventanas.");
  });
});

/** An XML document parsed by jsdom in XML mode: throws on anything not well-formed. */
const xml = (text: string) => new JSDOM(text, { contentType: "application/xhtml+xml" }).window.document;

test.describe("tool: create-epub", () => {
  test("Markdown + HTML files → one EPUB 3: stored mimetype first, metadata, chapters as well-formed XHTML, nothing unsafe", async ({ page }) => {
    await openWithFiles(page, "/es/crear-epub", ["document.md", "page.html"]);
    await page.getByLabel("Título del libro").fill("Libro de prueba");
    await page.getByLabel("Autor (opcional)").fill("Ana Ejemplo");
    await page.getByLabel("Idioma del libro").selectOption("pt");
    const out = fileOf(await runTool(page, "Crear EPUB"));
    expect(out.name).toBe("Libro de prueba.epub");
    // OCF: the first local header is "mimetype", stored (method 0), with the exact media type.
    expect(out.buf.readUInt32LE(0)).toBe(0x04034b50);
    expect(out.buf.readUInt16LE(8)).toBe(0);
    expect(out.buf.subarray(30, 38).toString()).toBe("mimetype");
    expect(out.buf.subarray(38, 58).toString()).toBe("application/epub+zip");
    const files = Object.fromEntries(unzipEntries(out.buf).map((e) => [e.name, e.data.toString("utf8")]));
    const container = xml(files["META-INF/container.xml"]!);
    expect(container.querySelector("rootfile")?.getAttribute("full-path")).toBe("OEBPS/content.opf");
    const opf = xml(files["OEBPS/content.opf"]!);
    expect(opf.getElementsByTagName("dc:title")[0]?.textContent).toBe("Libro de prueba");
    expect(opf.getElementsByTagName("dc:creator")[0]?.textContent).toBe("Ana Ejemplo");
    expect(opf.getElementsByTagName("dc:language")[0]?.textContent).toBe("pt");
    const spine = [...opf.querySelectorAll("spine itemref")].map((i) => opf.getElementById(i.getAttribute("idref")!)?.getAttribute("href"));
    expect(spine).toEqual(["chapter-1.xhtml", "chapter-2.xhtml"]);
    const nav = xml(files["OEBPS/nav.xhtml"]!);
    expect([...nav.querySelectorAll("nav li a")].map((a) => a.textContent)).toEqual(["Informe ñandú", "Guía 中文"]);
    expect(nav.querySelector("nav h1")?.textContent).toBe("Sumário");
    const first = xml(files["OEBPS/chapter-1.xhtml"]!);
    expect(first.querySelector("h1")?.textContent).toBe("Informe ñandú");
    expect([...first.querySelectorAll("tbody td")].map((td) => td.textContent)).toEqual(["Té", "2,50", "Café", "3,10"]);
    for (const name of ["OEBPS/chapter-1.xhtml", "OEBPS/chapter-2.xhtml"]) {
      expect(files[name]).not.toMatch(/<script|onerror|onclick|javascript:|pwned|<form/);
      xml(files[name]!);
    }
    expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBeUndefined();
    if (process.env.EPUBCHECK_JAR) {
      const file = join(mkdtempSync(join(tmpdir(), "epub-")), "book.epub");
      writeFileSync(file, out.buf);
      expect(execFileSync("java", ["-jar", process.env.EPUBCHECK_JAR, file], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })).toContain("No errors or warnings detected");
    }
  });

  test("pasted Markdown with two chapters reads back in the EPUB converter; empty text fails", async ({ page }) => {
    await page.goto("/en/create-epub", { waitUntil: "networkidle" });
    await page.getByRole("textbox", { name: /paste/i }).fill("# One\n\nFirst chapter.\n\n# Two\n\nSecond [back](#one).");
    const out = fileOf(await runTool(page, "Create EPUB"));
    expect(out.name).toBe("ebook.epub");
    const files = Object.fromEntries(unzipEntries(out.buf).map((e) => [e.name, e.data.toString("utf8")]));
    expect(xml(files["OEBPS/content.opf"]!).getElementsByTagName("dc:title")[0]?.textContent).toBe("One");
    expect(xml(files["OEBPS/chapter-2.xhtml"]!).querySelector("a")?.getAttribute("href")).toBe("chapter-1.xhtml#one");

    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("textbox", { name: /paste/i }).fill("<script>1</script>");
    await page.getByRole("button", { name: "Create EPUB", exact: true }).click();
    await expect(toolAlert(page)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main a[download]")).toHaveCount(0);
  });
});
