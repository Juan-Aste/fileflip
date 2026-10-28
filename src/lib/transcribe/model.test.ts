import { describe, expect, it } from "vitest";
import { whisperDownloadBytes, whisperLanguageCodes, whisperModels, whisperUrl } from "./model";

describe("whisper models", () => {
  it("pin every file to a commit, with its size and SHA-256", () => {
    for (const model of Object.values(whisperModels)) {
      expect(model.revision).toMatch(/^[0-9a-f]{40}$/);
      for (const file of model.files) {
        expect(file.sha256, file.path).toMatch(/^[0-9a-f]{64}$/);
        expect(file.bytes).toBeGreaterThan(0);
        expect(whisperUrl(model, file.path)).toBe(`https://huggingface.co/${model.repo}/resolve/${model.revision}/${file.path}`);
      }
    }
  });

  it("the fast model is about 43 MB and the precise one about 80 MB", () => {
    expect(Math.round(whisperDownloadBytes(whisperModels.tiny) / 1e6)).toBe(43);
    expect(Math.round(whisperDownloadBytes(whisperModels.base) / 1e6)).toBe(79);
  });

  it("knows Whisper's 99 languages, the site's five among them", () => {
    expect(whisperLanguageCodes).toHaveLength(99);
    for (const code of ["es", "en", "pt", "fr", "zh"]) expect(whisperLanguageCodes).toContain(code);
  });
});
