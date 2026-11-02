import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { CLOUD_MAX_BYTES, CLOUD_MAX_CHARS, cloudSamplePath, cloudVoice, cloudVoices, cloudVoicesFor } from "./cloud-voices";

describe("cloud voices", () => {
  it("offers 2–3 WaveNet voices per site language, with both genders", () => {
    for (const locale of routing.locales) {
      const voices = cloudVoices[locale];
      expect(voices.length).toBeGreaterThanOrEqual(2);
      expect(voices.length).toBeLessThanOrEqual(3);
      expect(new Set(voices.map((v) => v.gender))).toEqual(new Set(["female", "male"]));
      for (const v of voices) {
        expect(v.id).toMatch(/^[a-z]{2,3}-[A-Z]{2}-Wavenet-[A-Z]$/);
        expect(v.id.startsWith(`${v.languageCode}-`)).toBe(true);
        expect(cloudVoice(v.id)).toBe(v);
      }
      expect(cloudVoicesFor(locale).map((v) => v.id).sort()).toEqual(voices.map((v) => v.id).sort());
    }
    expect(cloudVoices.zh[0]!.languageCode).toBe("cmn-CN");
    expect(cloudVoice("es-US-Studio-B")).toBeUndefined();
    expect(cloudVoice(42)).toBeUndefined();
  });

  it("keeps any request under the API's 5000-byte limit", () => {
    expect(CLOUD_MAX_CHARS * 3).toBeLessThanOrEqual(CLOUD_MAX_BYTES);
  });

  it("shows no sample until the owner records them", () => {
    expect(cloudSamplePath("es-US-Wavenet-A")).toBeNull();
  });
});
