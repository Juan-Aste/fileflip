import { afterEach, describe, expect, it, vi } from "vitest";
import { browserImageOutputs } from "./options";
import { encoderWarmers } from "./codecs";

describe("preloadImageCodecs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("asks the shared worker to preload each pair once", async () => {
    const posted: unknown[] = [];
    const created = vi.fn();
    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          created();
        }
        postMessage(message: unknown) {
          posted.push(message);
        }
      },
    );
    const { preloadImageCodecs } = await import("./client");
    preloadImageCodecs("heic", "webp");
    preloadImageCodecs("heic", "webp");
    preloadImageCodecs(undefined, "avif");
    preloadImageCodecs(undefined, undefined);
    expect(created).toHaveBeenCalledTimes(1);
    expect(posted).toEqual([
      { type: "preload", from: "heic", to: "webp" },
      { type: "preload", from: undefined, to: "avif" },
    ]);
  });

  it("does nothing without Web Worker support", async () => {
    const { preloadImageCodecs } = await import("./client");
    expect(() => preloadImageCodecs("png", "webp")).not.toThrow();
  });
});

describe("encoderWarmers", () => {
  it("covers every WASM encoder the browser converter uses", () => {
    for (const to of ["jpg", "png", "webp", "avif"] as const) {
      expect(browserImageOutputs).toContain(to);
      expect(encoderWarmers[to]).toBeTypeOf("function");
    }
  });
});
