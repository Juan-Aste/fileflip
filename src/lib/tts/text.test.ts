import { describe, expect, it } from "vitest";
import { detectLanguage, MAX_PIECE, normalizeText, sentenceAt, splitSentences, stripBullets, TTS_MAX_CHARS } from "./text";

const texts = (text: string, max?: number) => splitSentences(text, max).map((s) => s.text);

describe("splitSentences", () => {
  it("splits on final punctuation and keeps offsets into the source", () => {
    const text = "Hola mundo. ¿Cómo estás? ¡Muy bien!  Fin…";
    const sentences = splitSentences(text);
    expect(sentences.map((s) => s.text)).toEqual(["Hola mundo.", "¿Cómo estás?", "¡Muy bien!", "Fin…"]);
    for (const s of sentences) expect(text.slice(s.start, s.end)).toBe(s.text);
  });

  it("does not split after abbreviations, initials or list numbers", () => {
    expect(texts("El Dr. Pérez llegó con la Sra. Gómez. Luego se fue.")).toEqual(["El Dr. Pérez llegó con la Sra. Gómez.", "Luego se fue."]);
    expect(texts("Mr. Smith met J. R. R. Tolkien. They talked, e.g. about books.")).toEqual(["Mr. Smith met J. R. R. Tolkien.", "They talked, e.g. about books."]);
    expect(texts("M. Dupont et Mme Martin sont là. Bonjour.")).toEqual(["M. Dupont et Mme Martin sont là.", "Bonjour."]);
    expect(texts("1. Primero\n2. Segundo")).toEqual(["1. Primero", "2. Segundo"]);
  });

  it("does not split numbers, decimals, times or a period followed by lowercase", () => {
    expect(texts("Cuesta 3.50 dólares o 1.000.000 pesos. Son las 10.30 h.")).toEqual(["Cuesta 3.50 dólares o 1.000.000 pesos.", "Son las 10.30 h."]);
    expect(texts("Version 2.0 is out. Visit example.com today.")).toEqual(["Version 2.0 is out.", "Visit example.com today."]);
    expect(texts("Dijo etc. y siguió.")).toEqual(["Dijo etc. y siguió."]);
  });

  it("keeps closing quotes and brackets with their sentence", () => {
    expect(texts('Ella dijo: "Ya voy." Y se fue. (Fin.) Listo.')).toEqual(['Ella dijo: "Ya voy."', "Y se fue.", "(Fin.)", "Listo."]);
  });

  it("splits Chinese without spaces", () => {
    const text = "今天天气很好。我们去公园吧！你想去吗？“好的。”然后呢";
    expect(texts(text)).toEqual(["今天天气很好。", "我们去公园吧！", "你想去吗？", "“好的。”", "然后呢"]);
  });

  it("treats blank lines, headings and list items as breaks, but joins lines wrapped in a PDF", () => {
    expect(texts("Introducción\nEl texto empieza aquí y sigue en la\nlínea siguiente sin cortar.\n\nOtro párrafo sin punto")).toEqual([
      "Introducción",
      "El texto empieza aquí y sigue en la\nlínea siguiente sin cortar.",
      "Otro párrafo sin punto",
    ]);
    expect(texts("Lista:\nuno\ndos")).toEqual(["Lista:\nuno\ndos"]);
  });

  it("cuts long sentences at a comma, then at a space, then anywhere", () => {
    const long = `${"palabra ".repeat(10)}coma, ${"otra ".repeat(40)}fin.`;
    const pieces = splitSentences(long, 120);
    expect(pieces.length).toBeGreaterThan(1);
    for (const p of pieces) expect(p.text.length).toBeLessThanOrEqual(120);
    expect(pieces[0]!.text.endsWith("coma,")).toBe(true);
    expect(pieces.map((p) => p.text).join(" ").replace(/\s+/g, " ")).toBe(long.trim().replace(/\s+/g, " "));
    const han = "汉".repeat(500);
    const hanPieces = splitSentences(han);
    expect(hanPieces.every((p) => p.text.length <= MAX_PIECE)).toBe(true);
    expect(hanPieces.map((p) => p.text).join("")).toBe(han);
  });

  it("skips pieces with nothing to read", () => {
    expect(texts("---\n\n...\n\nHola.")).toEqual(["Hola."]);
    expect(splitSentences("")).toEqual([]);
    expect(splitSentences("   \n\n ")).toEqual([]);
  });
});

describe("sentenceAt", () => {
  it("finds the sentence that holds an offset", () => {
    const sentences = splitSentences("Uno. Dos. Tres.");
    expect(sentenceAt(sentences, 0)).toBe(0);
    expect(sentenceAt(sentences, 6)).toBe(1);
    expect(sentenceAt(sentences, 999)).toBe(2);
  });
});

describe("normalizeText", () => {
  it("unifies breaks and spaces, joins hyphenated words and drops the BOM", () => {
    expect(normalizeText("﻿  Hola  mundo \r\n\r\n\r\n\r\nUna pala-\nbra\tcon  tab ")).toBe("Hola mundo\n\nUna palabra con tab");
  });
  it("strips bullets", () => {
    expect(stripBullets("- uno\n* dos\n• tres\n-4 grados")).toBe("uno\ndos\ntres\n-4 grados");
  });
});

describe("detectLanguage", () => {
  it("recognizes each language", () => {
    expect(detectLanguage("El perro y los gatos están en la casa con su dueño, pero no hay comida.", "en")).toBe("es");
    expect(detectLanguage("The dog and the cats are in the house with their owner, but there is no food.", "es")).toBe("en");
    expect(detectLanguage("O cão e os gatos estão na casa com o seu dono, mas não há comida.", "es")).toBe("pt");
    expect(detectLanguage("Le chien et les chats sont dans la maison avec leur maître, mais il n'y a pas de nourriture.", "es")).toBe("fr");
    expect(detectLanguage("我们今天去公园散步，天气很好。Fileflect 是一个工具。", "es")).toBe("zh");
  });
  it("does not take Spanish with many «un» and «o» for French or Portuguese", () => {
    const text = "Leer un texto en voz alta ayuda a revisar lo que escribiste, a descansar la vista o a escuchar un documento mientras haces otra cosa. Pega aquí cualquier texto, o abre un PDF, un Word o la foto de una página, y pulsa Reproducir.";
    for (const fallback of ["es", "en", "fr", "pt"] as const) expect(detectLanguage(text, fallback)).toBe("es");
  });
  it("keeps the fallback for short or unclear text", () => {
    expect(detectLanguage("OK", "pt")).toBe("pt");
    expect(detectLanguage("123 456", "fr")).toBe("fr");
  });
});

it("documents the character limit", () => {
  expect(TTS_MAX_CHARS).toBe(50_000);
});
