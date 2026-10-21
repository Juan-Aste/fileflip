import { describe, expect, it } from "vitest";
import { contrast, formatColor, parseColor, rgbToOklch, wcagLevels } from "./color";

const fmt = (input: string) => {
  const c = parseColor(input);
  if (!c) throw new Error(`not parsed: ${input}`);
  return formatColor(c);
};

describe("color", () => {
  it("parses every notation to the same color", () => {
    for (const input of [
      "#0f766e",
      "0F766E",
      "rgb(15 118 110)",
      "rgb(15, 118, 110)",
      "rgba(15,118,110,1)",
      "hsl(175.3 77.4% 26.1%)",
      "hsl(175.3, 77.4%, 26.1%)",
      "oklch(51.09% 0.0861 186.39)",
      "oklch(0.5109 0.0861 186.39deg)",
    ]) {
      expect(fmt(input).hex, input).toBe("#0f766e");
    }
    expect(fmt("rebeccapurple").hex).toBe("#663399");
    expect(fmt("#abc").hex).toBe("#aabbcc");
    expect(fmt("rgb(100% 0% 50%)").rgb).toBe("rgb(255 0 128)");
    expect(fmt("hsl(0.5turn 100% 50%)").hex).toBe("#00ffff");
  });

  it("keeps alpha", () => {
    expect(fmt("#ff000080")).toEqual({
      hex: "#ff000080",
      rgb: "rgb(255 0 0 / 0.502)",
      hsl: "hsl(0 100% 50% / 0.502)",
      oklch: expect.stringMatching(/ \/ 0\.502\)$/),
    });
    expect(fmt("rgb(0 0 255 / 25%)").rgb).toBe("rgb(0 0 255 / 0.25)");
    expect(fmt("hsla(120, 100%, 25%, .5)").hex).toBe("#00800080");
  });

  it("converts to OKLCH like the CSS Color 4 reference values", () => {
    const red = rgbToOklch({ r: 255, g: 0, b: 0, a: 1 });
    expect(red.l).toBeCloseTo(0.628, 3);
    expect(red.c).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
    expect(fmt("white").oklch).toBe("oklch(100% 0 0)");
    expect(fmt("black").oklch).toBe("oklch(0% 0 0)");
    // Out of the sRGB gamut: clipped, not rejected.
    expect(fmt("oklch(70% 0.4 150)").hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("rejects what is not a color", () => {
    for (const input of ["", "#12", "#ggg", "rgb(1 2)", "rgb(a b c)", "hsl(10 20)", "notacolor", "rgb(1 2 3 4 5)"]) {
      expect(parseColor(input), input).toBeNull();
    }
  });

  it("computes WCAG contrast", () => {
    const white = parseColor("#fff")!;
    const black = parseColor("#000")!;
    expect(contrast(black, white)).toBeCloseTo(21, 5);
    expect(contrast(parseColor("#767676")!, white)).toBeCloseTo(4.54, 2);
    expect(wcagLevels(4.54)).toEqual({ normalAA: true, normalAAA: false, largeAA: true, largeAAA: true });
    // Half-transparent black over white is a mid gray.
    expect(contrast(parseColor("rgb(0 0 0 / 0.5)")!, white)).toBeCloseTo(contrast(parseColor("#808080")!, white), 1);
  });
});
