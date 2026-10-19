import { describe, expect, it } from "vitest";
import { DEFAULT_QUALITY } from "./options";
import { parseImageOptions } from "./parse-options";

describe("parseImageOptions", () => {
  it("keeps valid options", () => {
    expect(parseImageOptions({ quality: 60, resize: { mode: "fit", width: 800 } })).toEqual({
      quality: 60,
      resize: { mode: "fit", width: 800, height: undefined },
    });
    expect(parseImageOptions({ resize: { mode: "percent", percent: 50 } }).resize).toEqual({
      mode: "percent",
      percent: 50,
    });
  });

  it("accepts exact-size crops only with both sides", () => {
    expect(parseImageOptions({ resize: { mode: "cover", width: 472, height: 472 } }).resize).toEqual({
      mode: "cover",
      width: 472,
      height: 472,
    });
    expect(parseImageOptions({ resize: { mode: "cover", width: 472 } }).resize).toEqual({ mode: "none" });
  });

  it("falls back to defaults for junk", () => {
    for (const junk of [null, "x", 42, { quality: "high" }, { quality: -1 }, { resize: { mode: "evil" } }]) {
      expect(parseImageOptions(junk)).toEqual({ quality: DEFAULT_QUALITY, resize: { mode: "none" } });
    }
  });

  it("clamps out-of-range values", () => {
    expect(parseImageOptions({ quality: 500 }).quality).toBe(100);
    expect(parseImageOptions({ resize: { mode: "percent", percent: 9999 } }).resize).toEqual({
      mode: "percent",
      percent: 400,
    });
    expect(parseImageOptions({ resize: { mode: "fit", width: 0 } }).resize).toEqual({ mode: "none" });
  });
});
