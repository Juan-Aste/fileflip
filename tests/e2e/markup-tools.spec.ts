// Markdown ↔ HTML: outputs are parsed with jsdom (independent of the app) and
// checked for structure; nothing from the inputs may run or be fetched.
import { JSDOM } from "jsdom";
import { expect, fileOf, openWithFiles, readText, runTool, test } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "markup tools must not call the server").toEqual([]);
});

test.describe("tool: markdown-to-html", () => {
  test("a GFM document becomes a safe full page", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      if (!r.url().startsWith("http://localhost")) external.push(r.url());
    });
    await openWithFiles(page, "/es/markdown-a-html", ["document.md"]);
    const out = fileOf(await runTool(page, "Convertir a HTML"));
    expect(out.name).toBe("document.html");
    const html = readText(out.buf);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    const doc = new JSDOM(html).window.document;
    expect(doc.title).toBe("Informe ñandú");
    expect(doc.querySelector("del")?.textContent).toBe("tachado");
    expect([...doc.querySelectorAll("tbody td")].map((td) => td.textContent)).toEqual(["Té", "2,50", "Café", "3,10"]);
    expect(doc.querySelector("pre code.language-js")?.textContent).toBe("const total = 5.6;\n");
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelector('li input[type="checkbox"]')?.hasAttribute("checked")).toBe(true);
    expect(html).not.toMatch(/onerror|javascript:|pwned/);
    expect(doc.querySelector('a[href="https://example.com"]')?.textContent).toBe("Fileflect");
    await expect(page.getByRole("textbox", { name: "Vista previa" })).toHaveValue(/<h1>Informe ñandú<\/h1>/);
    expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBeUndefined();
    expect(external).toEqual([]);
  });

  test("pasted Markdown as a fragment", async ({ page }) => {
    await page.goto("/en/markdown-to-html", { waitUntil: "networkidle" });
    await page.getByRole("textbox", { name: /paste/i }).fill("## Hi\n\n1. one\n2. two");
    await page.getByLabel(/Complete HTML page/).uncheck();
    const out = fileOf(await runTool(page, "Convert to HTML"));
    const doc = new JSDOM(readText(out.buf)).window.document;
    expect(readText(out.buf)).not.toMatch(/<html|<!doctype/i);
    expect(doc.querySelector("h2")?.textContent).toBe("Hi");
    expect(doc.querySelectorAll("ol li")).toHaveLength(2);
  });
});

test.describe("tool: html-to-markdown", () => {
  test("a page becomes GitHub Markdown; scripts, styles and forms are dropped, nothing runs", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      if (!r.url().startsWith("http://localhost")) external.push(r.url());
    });
    await openWithFiles(page, "/es/html-a-markdown", ["page.html"]);
    const out = fileOf(await runTool(page, "Convertir a Markdown"));
    expect(out.name).toBe("page.md");
    const md = readText(out.buf);
    expect(md).toContain("# Guía 中文");
    expect(md).toContain("Hola **mundo** y *bienvenidos*.");
    expect(md).toMatch(/^- {1,3}uno$/m);
    expect(md).toContain("| A | B |");
    expect(md).toContain('```py\nprint("hola")\n```');
    expect(md).toContain("[Documentación](https://example.com/docs)");
    expect(md).toContain("![logo](https://example.com/remote.png)");
    expect(md).not.toMatch(/pwned|color:red|Página|<input/);
    expect(md.split("\n").filter((l) => l.startsWith("|"))).toHaveLength(3);
    expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBeUndefined();
    expect(external).toEqual([]);
  });

  test("HTML without content fails", async ({ page }) => {
    await page.goto("/en/html-to-markdown", { waitUntil: "networkidle" });
    await page.getByRole("textbox", { name: /paste/i }).fill("<script>1</script><style>p{}</style>");
    await page.getByRole("button", { name: "Convert to Markdown", exact: true }).click();
    await expect(page.locator("main [role=alert]")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main a[download]")).toHaveCount(0);
  });
});
