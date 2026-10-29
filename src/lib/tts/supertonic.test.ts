import { describe, expect, it } from "vitest";
import { gaussianNoise, latentFrames, parseConfig, parseIndexer, parseVoiceStyle, preprocessText, textToIds } from "./supertonic";

const cfg = { sampleRate: 44100, baseChunkSize: 512, chunkCompressFactor: 6, latentDim: 24 };

describe("Supertonic text preprocessing", () => {
  it("normalizes like the reference SDK and adds the language tags", () => {
    expect(preprocessText("Hello  world", "en")).toBe("<en>Hello world.</en>");
    expect(preprocessText("“Quoted” — text ,  done !", "en")).toBe('<en>"Quoted" - text, done!</en>');
    expect(preprocessText("a/b_c [x] #1 😀 ♥", "es")).toBe("<es>a b c x uno.</es>");
    expect(preprocessText("Ends with a question?", "fr")).toBe("<fr>Ends with a question?</fr>");
  });

  it("decomposes accents (NFKD) so the model reads the base letter and the combining mark", () => {
    const out = preprocessText("Olá, café", "pt");
    expect(out).toBe("<pt>Olá, café.</pt>");
  });

  it("reads @ in the text's language and expands e.g. only in English", () => {
    expect(preprocessText("ana@mail.com", "es")).toBe("<es>ana arroba mail.com.</es>");
    expect(preprocessText("x e.g., y", "en")).toBe("<en>x for example, y.</en>");
    expect(preprocessText("x e.g., y", "fr")).toBe("<fr>x e.g., y.</fr>");
  });

  it("maps characters to model ids and skips unsupported ones", () => {
    const indexer = new Int32Array(0x10000).fill(-1);
    for (const ch of "<>/enHi.") indexer[ch.codePointAt(0)!] = ch.codePointAt(0)!;
    // "𝄞" (outside the BMP) and "€" are unknown to this indexer: left out.
    const ids = textToIds("Hi € 𝄞", "en", indexer);
    expect(String.fromCodePoint(...ids)).toBe("<en>Hi.</en>");
  });
});

describe("Supertonic model inputs", () => {
  it("parses the config, the indexer and a voice style", () => {
    expect(parseConfig({ ae: { sample_rate: 44100, base_chunk_size: 512 }, ttl: { chunk_compress_factor: 6, latent_dim: 24 } })).toEqual(cfg);
    expect(() => parseConfig({ ae: {} })).toThrow();
    expect(parseIndexer(new Array(0x10000).fill(-1)).length).toBe(0x10000);
    expect(() => parseIndexer([1, 2, 3])).toThrow();
    const style = parseVoiceStyle({ style_ttl: { dims: [1, 2, 2], data: [[[1, 2], [3, 4]]] }, style_dp: { dims: [1, 1, 2], data: [[[5, 6]]] } });
    expect(Array.from(style.ttl.data)).toEqual([1, 2, 3, 4]);
    expect(style.dp.dims).toEqual([1, 1, 2]);
    expect(() => parseVoiceStyle({ style_ttl: { dims: [1, 3], data: [1, 2] }, style_dp: { dims: [1], data: [1] } })).toThrow();
    expect(() => parseVoiceStyle({})).toThrow();
  });

  it("rounds the latent length up to whole chunks of 3072 samples", () => {
    expect(latentFrames(1, cfg)).toBe(Math.ceil(44100 / 3072));
    expect(latentFrames(3072 / 44100, cfg)).toBe(1);
    expect(latentFrames(0.0001, cfg)).toBe(1);
  });

  it("draws reproducible standard normal noise", () => {
    const a = gaussianNoise(20_001, 7);
    expect(Array.from(a.slice(0, 5))).toEqual(Array.from(gaussianNoise(5, 7)));
    expect(Array.from(a.slice(0, 5))).not.toEqual(Array.from(gaussianNoise(5, 8)));
    const mean = a.reduce((s, v) => s + v, 0) / a.length;
    const variance = a.reduce((s, v) => s + (v - mean) ** 2, 0) / a.length;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(variance - 1)).toBeLessThan(0.05);
    expect(a.every(Number.isFinite)).toBe(true);
  });
});
