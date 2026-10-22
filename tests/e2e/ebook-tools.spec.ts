// EPUB → HTML / TXT: outputs are parsed with jsdom (independent of the app);
// nothing from the book may run or be fetched, and DRM or damaged books fail clearly.
import { JSDOM } from "jsdom";
import { expect, fileOf, openWithFiles, readText, runTool, test, toolAlert, waitForResult } from "./support";

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
