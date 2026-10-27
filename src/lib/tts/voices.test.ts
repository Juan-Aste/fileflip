import { describe, expect, it } from "vitest";
import { clampRate, defaultVoice, SPEECH_RATES, voiceLanguage, voicesFor } from "./voices";

const v = (name: string, lang: string, localService = true, isDefault = false) => ({ name, lang, voiceURI: name, localService, default: isDefault });

describe("voices", () => {
  it("maps browser language tags to the site's languages", () => {
    expect(voiceLanguage(v("a", "es-MX"))).toBe("es");
    expect(voiceLanguage(v("a", "pt_BR"))).toBe("pt");
    expect(voiceLanguage(v("a", "cmn-Hans-CN"))).toBe("zh");
    expect(voiceLanguage(v("a", "yue-HK"))).toBe("zh");
    expect(voiceLanguage(v("a", "de-DE"))).toBeNull();
  });

  it("lists device voices first, then the default, then by name", () => {
    const list = [v("Zeta online", "es-ES", false), v("Beta", "es-AR"), v("Alpha", "es-ES"), v("Default", "es-US", true, true), v("Ann", "en-US")];
    expect(voicesFor(list, "es").map((x) => x.name)).toEqual(["Default", "Alpha", "Beta", "Zeta online"]);
    expect(voicesFor(list, "fr")).toEqual([]);
  });

  it("keeps a remembered voice only if it is still there", () => {
    const list = [v("A", "es-ES"), v("B", "es-ES")];
    expect(defaultVoice(list, "B")?.name).toBe("B");
    expect(defaultVoice(list, "gone")?.name).toBe("A");
    expect(defaultVoice([], "A")).toBeUndefined();
  });

  it("rounds stored speeds to an offered one", () => {
    expect(SPEECH_RATES).toEqual([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
    expect(clampRate("1.5")).toBe(1.5);
    expect(clampRate(1.3)).toBe(1.25);
    expect(clampRate(9)).toBe(2);
    expect(clampRate("x")).toBe(1);
    expect(clampRate(null)).toBe(0.5);
  });
});
