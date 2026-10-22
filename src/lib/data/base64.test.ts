import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { asReadableText, decodeBase64, encodeBase64, urlDecode, urlEncode } from "./base64";

const invalidData = expect.objectContaining({ code: "invalidData" });
const utf8 = (s: string) => new TextEncoder().encode(s);

describe("base64", () => {
  it("matches Node's encoder for text and binary, across chunk boundaries", () => {
    for (const size of [0, 1, 2, 3, 98_303, 98_304, 98_305, 300_001]) {
      const bytes = new Uint8Array(randomBytes(size));
      const encoded = encodeBase64(bytes, { wrap: false });
      expect(encoded).toBe(Buffer.from(bytes).toString("base64"));
      expect(Buffer.from(decodeBase64(encoded).bytes).equals(Buffer.from(bytes))).toBe(true);
    }
    expect(encodeBase64(utf8("Olá, 中文 ✓"), { wrap: false })).toBe(Buffer.from("Olá, 中文 ✓").toString("base64"));
  });

  it("wraps at 76 characters and writes data URLs", () => {
    const wrapped = encodeBase64(new Uint8Array(120), { wrap: true });
    expect(wrapped.split("\n").map((l) => l.length)).toEqual([76, 76, 8]); // 120 bytes → 160 characters
    expect(encodeBase64(utf8("hi"), { wrap: false, dataUrlMime: "text/plain" })).toBe("data:text/plain;base64,aGk=");
  });

  it("decodes data URLs, line breaks, URL-safe alphabet and missing padding", () => {
    expect(decodeBase64("data:image/PNG;base64,iVBO\r\nRw==")).toEqual({ bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), mime: "image/png" });
    expect(decodeBase64("data:text/plain;charset=utf-8;base64,aGk=").mime).toBe("text/plain");
    expect([...decodeBase64("-_8").bytes]).toEqual([0xfb, 0xff]);
    expect([...decodeBase64("aGk").bytes]).toEqual([0x68, 0x69]);
  });

  it("rejects text that isn't base64", () => {
    expect(() => decodeBase64("not base64!")).toThrow(invalidData);
    expect(() => decodeBase64("abcde")).toThrow(invalidData);
    expect(() => decodeBase64("ab=c")).toThrow(invalidData);
  });

  it("asReadableText only accepts clean UTF-8 text", () => {
    expect(asReadableText(utf8("línea 1\nlínea 2\t✓"))).toBe("línea 1\nlínea 2\t✓");
    expect(asReadableText(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(asReadableText(new Uint8Array([0x61, 0x00, 0x62]))).toBeNull();
  });
});

describe("url encoding", () => {
  it("encodes values and whole URLs", () => {
    expect(urlEncode("a b&c=ñ/?", "component")).toBe("a%20b%26c%3D%C3%B1%2F%3F");
    expect(urlEncode("https://x.com/a b?q=ñ&r=1#f", "url")).toBe("https://x.com/a%20b?q=%C3%B1&r=1#f");
    expect(() => urlEncode("\ud800", "component")).toThrow(invalidData);
  });

  it("decodes, optionally reading + as space", () => {
    expect(urlDecode("a%20b%2Bc+d", false)).toBe("a b+c+d");
    expect(urlDecode("a%20b%2Bc+d", true)).toBe("a b+c d");
    expect(() => urlDecode("%E0%A4%A", false)).toThrow(invalidData);
  });
});
