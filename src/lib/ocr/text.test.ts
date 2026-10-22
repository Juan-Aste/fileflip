import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cleanOcrText, ocrSize } from "./text";
import { TESSDATA_VARIANT, TESSERACT_CORE_VERSION, TESSERACT_VERSION } from "./assets";

const version = (pkg: string) => JSON.parse(readFileSync(join(__dirname, "../../../node_modules", pkg, "package.json"), "utf8")).version;

describe("ocr helpers", () => {
  it("never enlarges images and reduces huge ones", () => {
    expect(ocrSize(900, 300)).toEqual({ width: 900, height: 300 });
    expect(ocrSize(200, 100)).toEqual({ width: 200, height: 100 });
    expect(ocrSize(2000, 1500)).toEqual({ width: 2000, height: 1500 });
    expect(ocrSize(8000, 6000)).toEqual({ width: 4000, height: 3000 });
  });

  it("cleans tesseract's output", () => {
    expect(cleanOcrText("今天 天 气 很 好\n我 们 去 公园 散步\n", "zh")).toBe("今天天气很好\n我们去公园散步\n");
    expect(cleanOcrText("Hola  mundo   \n\n\n\nfin  \r\n", "es")).toBe("Hola  mundo\n\nfin\n");
    expect(cleanOcrText("  \n \n", "en")).toBe("");
    // Latin text keeps its spaces, also next to Chinese.
    expect(cleanOcrText("PDF 文件 abc", "zh")).toBe("PDF 文件 abc\n");
  });

  it("the served asset versions match the installed packages", () => {
    expect(version("tesseract.js")).toBe(TESSERACT_VERSION);
    expect(version("tesseract.js-core")).toBe(TESSERACT_CORE_VERSION);
    expect(TESSDATA_VARIANT).toBe("4.0.0_best_int");
  });
});
