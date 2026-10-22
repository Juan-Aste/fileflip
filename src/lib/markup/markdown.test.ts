// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "./markdown";

const sample = `# Informe ñandú

Texto con **negrita**, *cursiva*, ~~tachado~~ y \`código\`.

- uno
- [x] hecho

| Col A | Col B |
| --- | --- |
| 1 | 2 |

\`\`\`js
const a = 1;
\`\`\`

[enlace](https://example.com) <script>alert(1)</script> <img src="x.png" onerror="alert(2)"> [mal](javascript:alert(3))
`;

/** The document as a DOM (jsdom), to check structure rather than strings. */
const dom = (html: string) => new DOMParser().parseFromString(html, "text/html");

describe("markdownToHtml", () => {
  it("renders GFM and strips scripts, handlers and javascript: links", () => {
    const doc = dom(markdownToHtml(sample, { fullDocument: false }));
    expect(doc.querySelector("h1")?.textContent).toBe("Informe ñandú");
    expect(doc.querySelector("strong")?.textContent).toBe("negrita");
    expect(doc.querySelector("del")?.textContent).toBe("tachado");
    expect([...doc.querySelectorAll("td")].map((td) => td.textContent)).toEqual(["1", "2"]);
    expect(doc.querySelector("pre code")?.textContent).toBe("const a = 1;\n");
    // Task lists keep their (disabled) checkbox.
    expect(doc.querySelector('li input[type="checkbox"]')?.hasAttribute("checked")).toBe(true);
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelector("img")?.getAttribute("onerror")).toBeNull();
    const links = [...doc.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(links).toContain("https://example.com");
    expect(links.some((href) => href?.startsWith("javascript:"))).toBe(false);
  });

  it("wraps a full page with charset and the first heading as title", () => {
    const html = markdownToHtml("# A <b>&</b> B\n\ntext", { fullDocument: true });
    expect(html.startsWith("<!doctype html>")).toBe(true);
    const doc = dom(html);
    expect(doc.title).toBe("A & B");
    expect(doc.querySelector('meta[charset="utf-8"]')).not.toBeNull();
    expect(doc.body.querySelector("h1")).not.toBeNull();
  });
});

describe("htmlToMarkdown", () => {
  it("converts headings, emphasis, lists, tables, code and links; drops scripts and styles", () => {
    const md = htmlToMarkdown(
      `<html><head><title>t</title><style>p{}</style></head><body><h2>Título</h2><p>Hola <strong>mundo</strong> <em>ya</em> <del>no</del></p>
      <ul><li>uno</li><li>dos</li></ul><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>
      <pre><code class="language-js">const a = 1;</code></pre><p><a href="https://example.com">enlace</a></p><script>alert(1)</script></body></html>`,
    );
    expect(md).toContain("## Título");
    expect(md).toContain("Hola **mundo** *ya* ~no~");
    expect(md).toMatch(/^- {1,3}uno$/m);
    expect(md).toContain("| A | B |");
    expect(md).toContain("```js\nconst a = 1;\n```");
    expect(md).toContain("[enlace](https://example.com)");
    expect(md).not.toMatch(/alert|p\{\}|^t$/m);
  });

  it("round-trips Markdown → HTML → Markdown keeping the structure", () => {
    const back = htmlToMarkdown(markdownToHtml(sample, { fullDocument: true }));
    const again = dom(markdownToHtml(back, { fullDocument: false }));
    expect(again.querySelector("h1")?.textContent).toBe("Informe ñandú");
    expect(again.querySelectorAll("td")).toHaveLength(2);
    expect(again.querySelector("pre code")?.textContent).toBe("const a = 1;\n");
  });

  it("fails on HTML without content", () => {
    expect(() => htmlToMarkdown("<script>x</script><style>y</style>")).toThrow(expect.objectContaining({ code: "invalidData" }));
  });
});
