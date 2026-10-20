import { describe, expect, it } from "vitest";
import { MAX_PREVIEW_BYTES, previewSource } from "./preview";

describe("previewSource", () => {
  it("prefers the converted image", () => {
    expect(previewSource("png", 1000, { type: "image/webp" })).toBe("result");
    expect(previewSource("heic", 1000, { type: "image/jpeg" })).toBe("result");
  });

  it("falls back to the original when the result can't be drawn", () => {
    expect(previewSource("png", 1000, { type: "image/tiff" })).toBe("original");
    expect(previewSource("jpg", 1000, { type: "application/pdf" })).toBe("original");
    expect(previewSource("jpg", 1000)).toBe("original");
  });

  it("shows no thumbnail for formats browsers can't draw or huge files", () => {
    expect(previewSource("heic", 1000)).toBeNull();
    expect(previewSource("pdf", 1000)).toBeNull();
    expect(previewSource("docx", 1000, { type: "application/pdf" })).toBeNull();
    expect(previewSource("png", MAX_PREVIEW_BYTES + 1)).toBeNull();
    expect(previewSource(undefined, 10)).toBeNull();
    expect(previewSource(null, 10)).toBeNull();
  });
});
