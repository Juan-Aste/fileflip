import { describe, expect, it } from "vitest";
import { batchConcurrency, runLimited } from "./concurrency";

describe("batchConcurrency", () => {
  it("leaves a core free and caps at 4", () => {
    expect(batchConcurrency({ hardwareConcurrency: 8 })).toBe(4);
    expect(batchConcurrency({ hardwareConcurrency: 4 })).toBe(3);
    expect(batchConcurrency({ hardwareConcurrency: 2 })).toBe(1);
    expect(batchConcurrency({ hardwareConcurrency: 1 })).toBe(1);
  });

  it("is conservative on low-memory devices", () => {
    expect(batchConcurrency({ hardwareConcurrency: 8, deviceMemory: 2 })).toBe(1);
    expect(batchConcurrency({ hardwareConcurrency: 8, deviceMemory: 4 })).toBe(2);
    expect(batchConcurrency({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe(4);
  });

  it("falls back when the hints are missing", () => {
    expect(batchConcurrency()).toBe(1);
    expect(batchConcurrency({ hardwareConcurrency: 0 })).toBe(1);
  });
});

describe("runLimited", () => {
  const tick = () => new Promise((r) => setTimeout(r, 1));

  it("never runs more than the limit at once and processes everything", async () => {
    let running = 0;
    let peak = 0;
    const seen: number[] = [];
    await runLimited([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await tick();
      seen.push(n);
      running--;
    });
    expect(peak).toBe(3);
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("starts items in order and handles empty input", async () => {
    const started: number[] = [];
    await runLimited(["a", "b", "c"], 1, async (_, i) => {
      started.push(i);
    });
    expect(started).toEqual([0, 1, 2]);
    await expect(runLimited([], 4, async () => {})).resolves.toBeUndefined();
  });
});
