import { join } from "node:path";
import { createWorker, OEM } from "tesseract.js";
import { describe, expect, it } from "vitest";
import { TESSDATA_VARIANT } from "./assets";
import { cleanOcrText, OCR_PARAMETERS, tesseractLanguage, type OcrLanguage } from "./text";

// The real engine and the very language models we serve (node_modules/@tesseract.js-data),
// on fixtures whose text is known (scripts/fixtures/ocr.mjs).
const root = join(__dirname, "../../..");
async function ocr(fixture: string, language: OcrLanguage) {
  const lang = tesseractLanguage[language];
  const worker = await createWorker(lang, OEM.LSTM_ONLY, {
    langPath: join(root, "node_modules/@tesseract.js-data", lang, TESSDATA_VARIANT),
    cacheMethod: "none",
  });
  try {
    await worker.setParameters(OCR_PARAMETERS);
    const { data } = await worker.recognize(join(root, "tests/fixtures", fixture));
    return { text: cleanOcrText(data.text, language), confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}

/** Share of the expected words found in the text (case-insensitive). */
const recall = (text: string, expected: string[]) => {
  const words = expected.join(" ").toLowerCase().split(/\s+/);
  const found = new Set(text.toLowerCase().split(/[\s.,¿?]+/));
  return words.filter((w) => found.has(w.replace(/[.,¿?]/g, ""))).length / words.length;
};

describe("OCR with tesseract.js", { timeout: 60_000 }, () => {
  it("Spanish: accents, ñ and numbers", async () => {
    const { text, confidence } = await ocr("ocr-es.png", "es");
    expect(text).toContain("kiwi y papaya en enero.");
    expect(text).toContain("¿Cuánto cuesta? 1.250 pesos.");
    expect(text).toContain("Ñandú comió");
    expect(confidence).toBeGreaterThan(80);
  });

  it("English photo (tilted, noisy JPEG)", async () => {
    const { text } = await ocr("ocr-en.jpg", "en");
    expect(recall(text, ["The quick brown fox", "jumps over the lazy dog", "Invoice 4821 due in May"])).toBeGreaterThanOrEqual(0.9);
    expect(text).toContain("4821");
  });

  it("Chinese without the spaces tesseract adds", async () => {
    const { text } = await ocr("ocr-zh.png", "zh");
    expect(text).toBe("今天天气很好\n我们去公园散步\n");
  });

  it("an image without text gives an empty result", async () => {
    expect((await ocr("ocr-blank.png", "en")).text).toBe("");
  });
});
