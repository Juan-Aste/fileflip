import { describe, expect, it } from "vitest";
import { aiVoiceLanguages, supertonicDownloadBytes, supertonicFiles, supertonicUrl, SUPERTONIC_REVISION } from "./model";

describe("Supertonic model manifest", () => {
  it("pins every file to one commit, with a SHA-256 for each ONNX model", () => {
    expect(SUPERTONIC_REVISION).toMatch(/^[0-9a-f]{40}$/);
    for (const file of supertonicFiles) {
      expect(supertonicUrl(file.path)).toBe(`https://huggingface.co/Supertone/supertonic-3/resolve/${SUPERTONIC_REVISION}/${file.path}`);
      if (file.path.endsWith(".onnx")) expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("documents the download size (~398 MB) and the languages with an AI voice", () => {
    expect(supertonicDownloadBytes).toBe(398_361_202);
    expect(aiVoiceLanguages).toEqual(["es", "en", "pt", "fr"]);
  });
});
