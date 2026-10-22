import { describe, expect, it, vi } from "vitest";
import { ConversionError } from "@/lib/convert-error";
import { runBatch } from "./batch";
import { createUrlRegistry } from "./urls";

describe("runBatch", () => {
  it("returns a result per item, in input order, without failing the batch", async () => {
    const results = await runBatch(
      [1, 2, 3],
      async (n) => {
        if (n === 2) throw new ConversionError("fileDamaged");
        return n * 10;
      },
      { concurrency: 2 },
    );
    expect(results).toEqual([
      { status: "done", value: 10 },
      { status: "error", code: "fileDamaged", error: expect.any(ConversionError) },
      { status: "done", value: 30 },
    ]);
  });

  it("maps unknown errors to conversionFailed", async () => {
    const [result] = await runBatch([0], async () => {
      throw new Error("weird");
    });
    expect(result).toMatchObject({ status: "error", code: "conversionFailed" });
  });

  it("reports overall progress as the average of the items", async () => {
    const seen: number[] = [];
    await runBatch(
      ["a", "b"],
      async (_item, { onProgress }) => {
        onProgress(0.5);
        return null;
      },
      { concurrency: 1, onProgress: (p) => seen.push(p) },
    );
    expect(seen).toEqual([0.25, 0.5, 0.75, 1]);
  });

  it("skips the items not started after the signal aborts", async () => {
    const controller = new AbortController();
    const task = vi.fn(async (n: number) => {
      if (n === 1) controller.abort();
      return n;
    });
    const settled: number[] = [];
    const results = await runBatch([1, 2, 3], task, {
      signal: controller.signal,
      onItem: (index) => settled.push(index),
    });
    expect(task).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.status)).toEqual(["done", "error", "error"]);
    expect(results[2]).toMatchObject({ code: "jobCancelled" });
    expect(settled).toEqual([0, 1, 2]);
  });

  it("handles an empty batch", async () => {
    const onProgress = vi.fn();
    expect(await runBatch([], async () => 1, { onProgress })).toEqual([]);
  });
});

describe("createUrlRegistry", () => {
  it("revokes only the URLs it created, once", () => {
    let n = 0;
    const api = { createObjectURL: vi.fn(() => `blob:${++n}`), revokeObjectURL: vi.fn() };
    const urls = createUrlRegistry(api);
    const a = urls.create(new Blob(["a"]));
    urls.create(new Blob(["b"]));
    urls.revoke(a);
    urls.revoke(a);
    urls.revoke("blob:other");
    expect(api.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(urls.size()).toBe(1);
    urls.revokeAll();
    expect(api.revokeObjectURL).toHaveBeenCalledWith("blob:2");
    expect(urls.size()).toBe(0);
  });
});
