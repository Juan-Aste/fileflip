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

describe("errorCode of an unexpected failure", () => {
  it("says the connection dropped when the tool's code or data couldn't load", () => {
    const chunk = Object.assign(new Error("Loading chunk 9171 failed."), { name: "ChunkLoadError" });
    expect(errorCode(chunk)).toBe("connectionLost");
    expect(errorCode(new TypeError("Failed to fetch dynamically imported module: /_next/static/chunks/x.js"))).toBe("connectionLost");
    expect(errorCode(new TypeError("Load failed"))).toBe("connectionLost");
    expect(errorCode(new Error("boom"))).toBe("conversionFailed");
  });
});
