import { describe, expect, it } from "vitest";
import { clampRate, defaultVoice, SPEECH_RATES, voiceLanguage, voiceQuality, voicesFor } from "./voices";

const v = (name: string, lang: string, localService = true, isDefault = false) => ({ name, lang, voiceURI: name, localService, default: isDefault });

describe("voices", () => {
  it("maps browser language tags to the site's languages", () => {
    expect(voiceLanguage(v("a", "es-MX"))).toBe("es");
    expect(voiceLanguage(v("a", "pt_BR"))).toBe("pt");
    expect(voiceLanguage(v("a", "cmn-Hans-CN"))).toBe("zh");
    expect(voiceLanguage(v("a", "yue-HK"))).toBe("zh");
    expect(voiceLanguage(v("a", "de-DE"))).toBeNull();
  });

  it("among plain voices: Argentina, then Latin America and the US, then Spain; then the default, then device before online", () => {
    const list = [v("Zeta", "es-ES", false), v("Beta", "es-AR"), v("Alpha", "es-ES"), v("Default", "es-US", true, true), v("Paco", "es_MX"), v("Ann", "en-US")];
    expect(voicesFor(list, "es").map((x) => x.name)).toEqual(["Beta", "Default", "Paco", "Alpha", "Zeta"]);
    expect(voicesFor(list, "fr")).toEqual([]);
  });

  it("rates voices by how natural their name says they are", () => {
    expect(voiceQuality(v("Microsoft Elena Online (Natural) - Spanish (Argentina)", "es-AR"))).toBe(3);
    expect(voiceQuality(v("Microsoft Ava Multilingual Neural", "en-US"))).toBe(3);
    expect(voiceQuality(v("Mónica (Premium)", "es-ES"))).toBe(2);
    expect(voiceQuality(v("Paulina (Mejorada)", "es-MX"))).toBe(2);
    expect(voiceQuality(v("Samantha (Enhanced)", "en-US"))).toBe(2);
    expect(voiceQuality(v("Google español de Estados Unidos", "es-US"))).toBe(1);
    expect(voiceQuality(v("Microsoft Sabina - Spanish (Mexico)", "es-MX"))).toBe(0);
    expect(voiceQuality(v("Zarvox", "en-US"))).toBe(-1);
  });

  it("Edge on Windows: the Argentine Natural voices come first for Spanish", () => {
    const edge = [
      v("Microsoft Helena - Spanish (Spain)", "es-ES", true, true),
      v("Microsoft Sabina - Spanish (Mexico)", "es-MX"),
      v("Microsoft Alvaro Online (Natural) - Spanish (Spain)", "es-ES", false),
      v("Microsoft Dalia Online (Natural) - Spanish (Mexico)", "es-MX", false),
      v("Microsoft Tomas Online (Natural) - Spanish (Argentina)", "es-AR", false),
      v("Microsoft Elena Online (Natural) - Spanish (Argentina)", "es-AR", false),
    ];
    expect(voicesFor(edge, "es").map((x) => x.name)).toEqual([
      "Microsoft Elena Online (Natural) - Spanish (Argentina)",
      "Microsoft Tomas Online (Natural) - Spanish (Argentina)",
      "Microsoft Dalia Online (Natural) - Spanish (Mexico)",
      "Microsoft Alvaro Online (Natural) - Spanish (Spain)",
      "Microsoft Sabina - Spanish (Mexico)",
      "Microsoft Helena - Spanish (Spain)",
    ]);
  });

  it("Chrome: Google's US Spanish voice before Google's Spain one and the local voices", () => {
    const chrome = [v("Microsoft Sabina - Spanish (Mexico)", "es-MX", true, true), v("Google español", "es-ES", false), v("Google español de Estados Unidos", "es-US", false)];
    expect(voicesFor(chrome, "es").map((x) => x.name)).toEqual(["Google español de Estados Unidos", "Google español", "Microsoft Sabina - Spanish (Mexico)"]);
  });

  it("other languages: their main region first, novelty voices last", () => {
    const list = [v("Bells", "en-US"), v("Daniel", "en-GB"), v("Samantha", "en-US"), v("Luciana", "pt-BR"), v("Joana", "pt-PT"), v("Tingting", "zh-CN"), v("Meijia", "zh-TW"), v("Amélie", "fr-CA"), v("Thomas", "fr-FR")];
    expect(voicesFor(list, "en").map((x) => x.name)).toEqual(["Samantha", "Daniel", "Bells"]);
    expect(voicesFor(list, "pt").map((x) => x.name)).toEqual(["Luciana", "Joana"]);
    expect(voicesFor(list, "zh").map((x) => x.name)).toEqual(["Tingting", "Meijia"]);
    expect(voicesFor(list, "fr").map((x) => x.name)).toEqual(["Thomas", "Amélie"]);
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
