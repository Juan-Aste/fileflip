import { describe, expect, it } from "vitest";
import {
  commonOutputs,
  findConversion,
  formatFromExtension,
  formats,
  outputFilename,
  outputsFor,
} from "./formats";

describe("format registry", () => {
  it("only offers valid outputs for images", () => {
    const outs = outputsFor("png").map((c) => c.to);
    expect(outs).toEqual(expect.arrayContaining(["jpg", "webp", "avif", "ico", "pdf"]));
    expect(outs).not.toContain("docx");
  });

  it("processes images and PDF→image in the browser", () => {
    expect(outputsFor("heic").every((c) => c.engine === "browser")).toBe(true);
    expect(findConversion("pdf", "jpg")?.engine).toBe("browser");
    expect(findConversion("pdf", "png")?.engine).toBe("browser");
  });

  it("sends only office documents and PDF→Word to the server", () => {
    expect(findConversion("docx", "pdf")?.engine).toBe("server");
    expect(findConversion("xlsx", "pdf")?.engine).toBe("server");
    expect(findConversion("csv", "pdf")?.engine).toBe("server");
    expect(findConversion("pdf", "docx")?.engine).toBe("server");
    expect(findConversion("docx", "jpg")).toBeUndefined();
  });

  it("never lists HEIC or SVG as outputs", () => {
    for (const from of Object.keys(formats) as (keyof typeof formats)[]) {
      const outs = outputsFor(from).map((c) => c.to);
      expect(outs).not.toContain("heic");
      expect(outs).not.toContain("svg");
    }
  });

  it("maps extensions case-insensitively", () => {
    expect(formatFromExtension("IMG_0001.HEIC")).toBe("heic");
    expect(formatFromExtension("photo.jpeg")).toBe("jpg");
    expect(formatFromExtension("noextension")).toBeNull();
  });

  it("builds output file names", () => {
    expect(outputFilename("IMG_0001.HEIC", "jpg")).toBe("IMG_0001.jpg");
    expect(outputFilename("my.report.docx", "pdf")).toBe("my.report.pdf");
    expect(outputFilename(".hidden", "png")).toBe(".hidden.png");
    expect(outputFilename("", "png")).toBe("file.png");
  });
});

describe("same-format re-encoding", () => {
  it("lets JPG/PNG/WEBP/AVIF be compressed or resized into themselves", () => {
    expect(findConversion("jpg", "jpg")).toBeDefined();
    expect(findConversion("webp", "webp")).toBeDefined();
    expect(findConversion("gif", "gif")).toBeUndefined();
    expect(findConversion("tiff", "tiff")).toBeUndefined();
  });
});

describe("commonOutputs", () => {
  it("intersects the outputs of a mixed batch", () => {
    const outs = commonOutputs(["png", "heic", "png"]).map((c) => c.to);
    expect(outs).toContain("jpg");
    expect(outs).toContain("pdf");
    expect(outs).toContain("png");
    expect(commonOutputs(["gif"]).map((c) => c.to)).not.toContain("gif");
  });

  it("is empty when nothing is shared or there are no files", () => {
    expect(commonOutputs(["docx", "png"]).map((c) => c.to)).toEqual(["pdf"]);
    expect(commonOutputs(["docx", "pdf"])).toEqual([]);
    expect(commonOutputs([])).toEqual([]);
  });
});
