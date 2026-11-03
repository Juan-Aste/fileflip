import { describe, expect, it } from "vitest";
import { createPrefetchQueue } from "./prefetch";

/** A generator whose requests finish when the test says so. */
function controlled() {
  const pending = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void; signal: AbortSignal }>();
  const calls: number[] = [];
  const generate = (index: number, signal: AbortSignal) =>
    new Promise<string>((resolve, reject) => {
      calls.push(index);
      pending.set(index, { resolve, reject, signal });
    });
  const finish = (index: number) => pending.get(index)!.resolve(`audio ${index}`);
  return { generate, calls, pending, finish };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("createPrefetchQueue", () => {
  it("prepares the next sentences while one is playing, one at a time for a serial engine", async () => {
    const g = controlled();
    const q = createPrefetchQueue({ generate: g.generate, ahead: 3, concurrency: 1, count: () => 10 });
    const first = q.get(0);
    expect(g.calls).toEqual([0]);
    g.finish(0);
    expect(await first).toBe("audio 0");
    await tick();
    expect(g.calls).toEqual([0, 1]);
    g.finish(1);
    await tick();
    g.finish(2);
    await tick();
    g.finish(3);
    await tick();
    // Three ahead and no more until playback moves on.
    expect(g.calls).toEqual([0, 1, 2, 3]);
    expect(await q.get(1)).toBe("audio 1");
    await tick();
    expect(g.calls).toEqual([0, 1, 2, 3, 4]);
  });

  it("never generates the same sentence twice for the same settings", async () => {
    const g = controlled();
    const q = createPrefetchQueue({ generate: g.generate, ahead: 2, concurrency: 3, count: () => 5 });
    const a = q.get(0);
    const b = q.get(0);
    expect(a).toBe(b);
    for (const i of [0, 1, 2]) g.finish(i);
    await q.get(1);
    await q.get(2);
    await tick();
    expect(g.calls.sort()).toEqual([0, 1, 2, 3, 4]);
    expect(q.started).toBe(5);
  });

  it("runs at most `concurrency` requests in parallel (cloud voice)", async () => {
    const g = controlled();
    const q = createPrefetchQueue({ generate: g.generate, ahead: 3, concurrency: 2, count: () => 10 });
    void q.get(0);
    expect(g.calls).toEqual([0, 1]);
    g.finish(1);
    await tick();
    expect(g.calls).toEqual([0, 1, 2]);
    g.finish(0);
    await tick();
    expect(g.calls).toEqual([0, 1, 2, 3]);
  });

  it("does not ask past the last sentence", () => {
    const g = controlled();
    const q = createPrefetchQueue({ generate: g.generate, ahead: 3, concurrency: 5, count: () => 2 });
    void q.get(0);
    expect(g.calls).toEqual([0, 1]);
  });

  it("seeking drops the queued sentences outside the new window, aborting the running one", async () => {
    const g = controlled();
    const q = createPrefetchQueue({ generate: g.generate, ahead: 2, concurrency: 1, count: () => 20 });
    void q.get(0);
    const signal0 = g.pending.get(0)!.signal;
    const jump = q.get(10);
    // Sentence 0 is out of the window: aborted, and its slot goes to 10 at once.
    expect(signal0.aborted).toBe(true);
    expect(g.calls).toEqual([0, 10]);
    g.finish(10);
    expect(await jump).toBe("audio 10");
    await tick();
    // 1 and 2 were never generated.
    expect(g.calls).toEqual([0, 10, 11]);
  });

  it("reset (new voice or speed) aborts everything and starts over", async () => {
    const g = controlled();
    const q = createPrefetchQueue({ generate: g.generate, ahead: 2, concurrency: 1, count: () => 5 });
    const old = q.get(0);
    q.reset();
    await expect(old).rejects.toThrow(/Abort/);
    expect(g.pending.get(0)!.signal.aborted).toBe(true);
    void q.get(0);
    expect(g.calls).toEqual([0, 0]);
  });

  it("a failed sentence is asked again", async () => {
    const g = controlled();
    const q = createPrefetchQueue({ generate: g.generate, ahead: 0, concurrency: 1, count: () => 3 });
    const first = q.get(0);
    g.pending.get(0)!.reject(new Error("offline"));
    await expect(first).rejects.toThrow("offline");
    void q.get(0);
    expect(g.calls).toEqual([0, 0]);
  });
});
