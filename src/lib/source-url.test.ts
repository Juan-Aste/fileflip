import { describe, expect, it } from "vitest";
import { sourceUrl } from "./source-url";

describe("sourceUrl", () => {
  it("is empty without the variable", () => {
    expect(sourceUrl(undefined)).toBe("");
    expect(sourceUrl("")).toBe("");
    expect(sourceUrl("   ")).toBe("");
  });

  it("accepts an https URL", () => {
    expect(sourceUrl("https://github.com/Juan-Aste/fileflip")).toBe("https://github.com/Juan-Aste/fileflip");
    expect(sourceUrl(" https://github.com/Juan-Aste/fileflip/tree/main ")).toBe("https://github.com/Juan-Aste/fileflip/tree/main");
  });

  it("rejects anything else", () => {
    expect(sourceUrl("http://github.com/Juan-Aste/fileflip")).toBe("");
    expect(sourceUrl("javascript:alert(1)")).toBe("");
    expect(sourceUrl("github.com/Juan-Aste/fileflip")).toBe("");
    expect(sourceUrl("https://user:pass@example.com/repo")).toBe("");
  });
});
