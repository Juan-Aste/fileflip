import { describe, expect, it, vi } from "vitest";
import { browserLacksToolFeatures, browserSupportsImaging, deviceFileBudget } from "./capabilities";
import { ConversionError, errorCode } from "./convert-error";

describe("deviceFileBudget", () => {
  it("shrinks the local budget on low-memory devices", () => {
    expect(deviceFileBudget(0.5)).toBeLessThan(deviceFileBudget(2));
    expect(deviceFileBudget(2)).toBeLessThan(deviceFileBudget(4));
    expect(deviceFileBudget(4)).toBeLessThan(deviceFileBudget(8));
  });

  it("uses a middle budget when memory is unknown (Safari, Firefox)", () => {
    expect(deviceFileBudget(undefined)).toBe(100 * 1024 * 1024);
  });
});

describe("browserSupportsImaging", () => {
  it("is false without workers or canvas (e.g. Node)", () => {
    expect(browserSupportsImaging()).toBe(false);
  });
});

describe("browserLacksToolFeatures", () => {
  it("is false outside a browser", () => {
    expect(browserLacksToolFeatures()).toBe(false);
  });

  it("is true in a browser without workers", () => {
    vi.stubGlobal("window", {});
    try {
      expect(browserLacksToolFeatures()).toBe(true);
      expect(errorCode(new Error("Worker is not defined"))).toBe("browserUnsupported");
      expect(errorCode(new ConversionError("fileDamaged"))).toBe("fileDamaged");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
