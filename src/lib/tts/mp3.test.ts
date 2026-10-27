import { describe, expect, it } from "vitest";
import { mp3FileName } from "./mp3";

describe("MP3 file name", () => {
  it("uses the document title, else the first six words", () => {
    expect(mp3FileName("whatever", "Informe anual 2026")).toBe("Informe anual 2026.mp3");
    expect(mp3FileName("Buenos días. Hoy vamos a leer un texto corto.")).toBe("Buenos días. Hoy vamos a leer.mp3");
    expect(mp3FileName("今天天气很好。")).toBe("今天天气很好。.mp3");
  });

  it("drops characters file systems reject, trailing dots and overlong names", () => {
    expect(mp3FileName("", 'a/b\\c:d*e?f"g<h>i|j')).toBe("a b c d e f g h i j.mp3");
    expect(mp3FileName("Fin...")).toBe("Fin.mp3");
    expect(mp3FileName("x".repeat(200)).length).toBe(64);
    expect(mp3FileName("   ")).toBe("audio.mp3");
  });
});
