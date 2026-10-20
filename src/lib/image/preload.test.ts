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

describe("image worker pool", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("spreads a batch over one worker per free core and reuses idle ones", async () => {
    const workers: { posted: { id?: number }[]; onmessage?: (e: { data: unknown }) => void }[] = [];
    vi.stubGlobal("navigator", { hardwareConcurrency: 4 });
    vi.stubGlobal(
      "Worker",
      class {
        posted: { id?: number }[] = [];
        onmessage?: (e: { data: unknown }) => void;
        constructor() {
          workers.push(this);
        }
        postMessage(message: { id?: number }) {
          this.posted.push(message);
        }
      },
    );
    const { convertImage } = await import("./client");
    const file = () => new Blob([new Uint8Array(8)]);
    const jobs = [1, 2, 3, 4].map(() => convertImage(file(), "png", "webp"));
    await vi.waitFor(() => expect(workers.flatMap((w) => w.posted)).toHaveLength(4));
    // 4 cores → 3 workers; the 4th job queues on one of them.
    expect(workers).toHaveLength(3);
    expect(workers.map((w) => w.posted.length).sort()).toEqual([1, 1, 2]);

    const first = workers[0];
    const id = first.posted[0].id;
    first.onmessage?.({ data: { id, type: "done", buffer: new ArrayBuffer(2), width: 1, height: 1 } });
    await expect(jobs[0]).resolves.toMatchObject({ width: 1, height: 1 });

    // Later files reuse the existing workers.
    void convertImage(file(), "png", "webp");
    await vi.waitFor(() => expect(workers.flatMap((w) => w.posted)).toHaveLength(5));
    expect(workers).toHaveLength(3);
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
