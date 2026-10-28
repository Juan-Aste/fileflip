import { describe, expect, it } from "vitest";
import { headingId, renderGuide, resolveGuideHref } from "./render";

describe("headingId", () => {
  it("makes ASCII ids from headings with accents", () => {
    expect(headingId("Paso 1: elegir el archivo")).toBe("paso-1-elegir-el-archivo");
    expect(headingId("¿Qué es PDF/A?")).toBe("que-es-pdf-a");
    expect(headingId("怎么做")).toBe("");
  });
});

describe("resolveGuideHref", () => {
  it("turns tool and conversion links into pages of the guide's language", () => {
    expect(resolveGuideHref("tool:compress-pdf", "es")).toBe("/es/comprimir-pdf");
    expect(resolveGuideHref("tool:compress-pdf", "en")).toBe("/en/compress-pdf");
    expect(resolveGuideHref("conv:heic-jpg", "fr")).toBe("/fr/heic-en-jpg");
    expect(resolveGuideHref("https://example.com/a", "es")).toBe("https://example.com/a");
  });

  it("rejects tools, conversions and guides that do not exist", () => {
    expect(resolveGuideHref("tool:nope", "es")).toBeUndefined();
    expect(resolveGuideHref("conv:jpg-jpg", "es")).toBeUndefined();
    expect(resolveGuideHref("guide:nope", "es")).toBeUndefined();
  });
});

describe("renderGuide", () => {
  const md = [
    "Intro con [una herramienta](tool:merge-pdf).",
    "",
    "## Cómo hacerlo",
    "",
    "1. Abre **el archivo**.",
    "2. Pulsa *Convertir*.",
    "",
    "### Detalle",
    "",
    "## Cómo hacerlo",
    "",
    "- uno",
    "- dos",
    "",
    "<script>alert(1)</script>",
  ].join("\n");

  it("builds the table of contents with unique ids", () => {
    const r = renderGuide(md, "es");
    expect(r.toc).toEqual([
      { id: "como-hacerlo", text: "Cómo hacerlo" },
      { id: "como-hacerlo-2", text: "Cómo hacerlo" },
    ]);
    expect(r.html).toContain('<h2 id="como-hacerlo">');
    expect(r.html).toContain('<h3 id="detalle">');
  });

  it("takes the HowTo steps from the first numbered list", () => {
    expect(renderGuide(md, "es").steps).toEqual(["Abre el archivo.", "Pulsa Convertir."]);
  });

  it("links tools in the guide's language and escapes raw HTML", () => {
    const { html } = renderGuide(md, "es");
    expect(html).toContain('<a href="/es/unir-pdf">una herramienta</a>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("never renders an h1", () => {
    expect(renderGuide("# Título\n\ntexto", "es").html).toContain('<h2 id="titulo">');
  });

  it("counts words, and Chinese characters", () => {
    expect(renderGuide("Uno dos tres.\n\n- cuatro cinco", "es").words).toBe(5);
    expect(renderGuide("这是一个测试。", "zh").words).toBe(6);
  });

  it("leaves links to planned guides as text until they are published", () => {
    expect(renderGuide("[la guía](guide:pdf-a)", "zh").html).toBe("<p>la guía</p>\n");
  });

  it("fails on broken links and unknown screenshots", () => {
    expect(() => renderGuide("[x](guide:nope)", "es")).toThrow(/guide:nope/);
    expect(() => renderGuide("[x](tool:nope)", "es")).toThrow(/tool:nope/);
    expect(() => renderGuide("![x](shot:nope)", "es")).toThrow(/shot:nope/);
    expect(() => renderGuide("![x](/a.png)", "es")).toThrow();
  });
});
