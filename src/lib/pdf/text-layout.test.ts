import { describe, expect, it } from "vitest";
import { paragraphsFromRuns, type TextRun } from "./text-layout";

const run = (str: string, x: number, y: number, size = 10): TextRun => ({ str, x, y, size, width: str.length * size * 0.5 });

describe("paragraphsFromRuns", () => {
  it("joins wrapped lines and splits on larger gaps", () => {
    const paragraphs = paragraphsFromRuns([
      run("First line of the", 50, 700),
      run("first paragraph.", 50, 688),
      run("Second paragraph.", 50, 660),
    ]);
    expect(paragraphs.map((p) => p.text)).toEqual(["First line of the first paragraph.", "Second paragraph."]);
  });

  it("ends a paragraph after a short line", () => {
    const paragraphs = paragraphsFromRuns([
      run("Saludos,", 50, 700),
      run("Ana María Pérez, directora general de la empresa", 50, 688),
    ]);
    expect(paragraphs.map((p) => p.text)).toEqual(["Saludos,", "Ana María Pérez, directora general de la empresa"]);
  });

  it("detects headings by font size", () => {
    const paragraphs = paragraphsFromRuns([
      run("Informe anual", 50, 750, 20),
      run("Texto del cuerpo que ocupa todo el ancho de la línea", 50, 720),
      run("y sigue acá.", 50, 708),
    ]);
    expect(paragraphs[0]).toMatchObject({ text: "Informe anual", heading: true, size: 20 });
    expect(paragraphs[1]).toMatchObject({
      text: "Texto del cuerpo que ocupa todo el ancho de la línea y sigue acá.",
      heading: false,
    });
  });

  it("orders runs on the same baseline left to right and adds missing spaces", () => {
    const paragraphs = paragraphsFromRuns([run("mundo", 100, 700), run("Hola", 50, 700.5)]);
    expect(paragraphs[0].text).toBe("Hola mundo");
  });

  it("re-joins words hyphenated across lines", () => {
    const paragraphs = paragraphsFromRuns([run("conver-", 50, 700), run("sión rápida", 50, 688)]);
    expect(paragraphs[0].text).toBe("conversión rápida");
  });

  it("returns nothing for pages without text", () => {
    expect(paragraphsFromRuns([])).toEqual([]);
    expect(paragraphsFromRuns([run("   ", 0, 0)])).toEqual([]);
  });
});
