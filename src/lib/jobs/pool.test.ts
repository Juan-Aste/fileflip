import { afterEach, describe, expect, it, vi } from "vitest";
import { ConversionError } from "@/lib/convert-error";
import { createJobPool, type WorkerLike } from "./pool";

interface Call {
  id: number;
  method: string;
  args: unknown;
}

/** A fake worker whose replies the test drives by hand. */
class FakeWorker implements WorkerLike {
  static all: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  calls: Call[] = [];
  terminated = false;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(message: unknown) {
    this.calls.push(message as Call);
  }
  terminate() {
    this.terminated = true;
  }
  last() {
    return this.calls[this.calls.length - 1];
  }
  send(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
  done(result: unknown) {
    this.send({ id: this.last().id, type: "done", result });
  }
  fail(message: string) {
    this.send({ id: this.last().id, type: "error", message });
  }
  crash(message: string) {
    this.onerror?.({ message, preventDefault() {} } as ErrorEvent);
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  FakeWorker.all = [];
  vi.useRealTimers();
});

describe("createJobPool", () => {
  it("starts workers lazily and reuses an idle one", async () => {
    const pool = createJobPool(() => new FakeWorker(), { concurrency: 2 });
    expect(pool.size()).toBe(0);
    const first = pool.run<string>("echo", 1);
    const [worker] = FakeWorker.all;
    expect(worker.last()).toMatchObject({ method: "echo", args: 1 });
    worker.done("a");
    await expect(first).resolves.toBe("a");
    const second = pool.run<string>("echo", 2);
    expect(FakeWorker.all).toHaveLength(1);
    worker.done("b");
    await expect(second).resolves.toBe("b");
  });

  it("caps the workers at the concurrency and queues the rest in order", async () => {
    const pool = createJobPool(() => new FakeWorker(), { concurrency: 2 });
    const jobs = [1, 2, 3].map((n) => pool.run<number>("job", n));
    expect(FakeWorker.all).toHaveLength(2);
    const [a, b] = FakeWorker.all;
    expect(a.calls.map((c) => c.args)).toEqual([1]);
    expect(b.calls.map((c) => c.args)).toEqual([2]);
    b.done(20);
    expect(b.calls.map((c) => c.args)).toEqual([2, 3]);
    b.done(30);
    a.done(10);
    await expect(Promise.all(jobs)).resolves.toEqual([10, 20, 30]);
  });

  it("forwards progress and ends at 1", async () => {
    const pool = createJobPool(() => new FakeWorker());
    const seen: number[] = [];
    const job = pool.run("p", null, { onProgress: (p) => seen.push(p) });
    const [w] = FakeWorker.all;
    w.send({ id: w.last().id, type: "progress", progress: 0.5 });
    w.done(null);
    await job;
    expect(seen).toEqual([0.5, 1]);
  });

  it("rejects with the worker's error message and keeps the worker", async () => {
    const pool = createJobPool(() => new FakeWorker());
    const job = pool.run("bad", null);
    FakeWorker.all[0].fail("broken input");
    await expect(job).rejects.toThrow("broken input");
    expect(pool.size()).toBe(1);
  });

  it("passes transferables to postMessage", () => {
    const spy = vi.fn();
    const pool = createJobPool(() => {
      const w = new FakeWorker();
      w.postMessage = spy;
      return w;
    });
    const buffer = new ArrayBuffer(8);
    void pool.run("t", { buffer }, { transfer: [buffer] });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ method: "t" }), [buffer]);
  });

  it("cancelling a running job terminates its worker and the next job gets a new one", async () => {
    const pool = createJobPool(() => new FakeWorker());
    const controller = new AbortController();
    const job = pool.run("slow", null, { signal: controller.signal });
    const next = pool.run<string>("next", null);
    controller.abort();
    await expect(job).rejects.toMatchObject({ code: "jobCancelled" });
    expect(FakeWorker.all[0].terminated).toBe(true);
    expect(FakeWorker.all).toHaveLength(2);
    expect(FakeWorker.all[1].last().method).toBe("next");
    FakeWorker.all[1].done("ok");
    await expect(next).resolves.toBe("ok");
  });

  it("cancelling a queued job removes it without touching the running one", async () => {
    const pool = createJobPool(() => new FakeWorker());
    const running = pool.run<string>("a", null);
    const controller = new AbortController();
    const queued = pool.run("b", null, { signal: controller.signal });
    controller.abort();
    await expect(queued).rejects.toBeInstanceOf(ConversionError);
    const [w] = FakeWorker.all;
    expect(w.terminated).toBe(false);
    w.done("a");
    await expect(running).resolves.toBe("a");
    expect(w.calls.map((c) => c.method)).toEqual(["a"]);
  });

  it("rejects at once when the signal is already aborted", async () => {
    const pool = createJobPool(() => new FakeWorker());
    await expect(pool.run("x", null, { signal: AbortSignal.abort() })).rejects.toMatchObject({
      code: "jobCancelled",
    });
    expect(FakeWorker.all).toHaveLength(0);
  });

  it("terminates a worker that exceeds the time limit", async () => {
    vi.useFakeTimers();
    const pool = createJobPool(() => new FakeWorker());
    const job = pool.run("hang", null, { timeoutMs: 1000 });
    const caught = job.catch((e) => e);
    vi.advanceTimersByTime(999);
    expect(FakeWorker.all[0].terminated).toBe(false);
    vi.advanceTimersByTime(1);
    expect(await caught).toMatchObject({ code: "jobTimedOut" });
    expect(FakeWorker.all[0].terminated).toBe(true);
    expect(pool.size()).toBe(0);
  });

  it("does not time out a job that finished in time", async () => {
    vi.useFakeTimers();
    const pool = createJobPool(() => new FakeWorker());
    const job = pool.run("fast", null, { timeoutMs: 1000 });
    FakeWorker.all[0].done("ok");
    await expect(job).resolves.toBe("ok");
    vi.advanceTimersByTime(5000);
    expect(FakeWorker.all[0].terminated).toBe(false);
  });

  it("a crashed worker fails its job and is replaced", async () => {
    const pool = createJobPool(() => new FakeWorker());
    const job = pool.run("boom", null);
    const next = pool.run<number>("after", null);
    FakeWorker.all[0].crash("out of memory");
    await expect(job).rejects.toThrow("out of memory");
    expect(FakeWorker.all).toHaveLength(2);
    FakeWorker.all[1].done(1);
    await expect(next).resolves.toBe(1);
  });

  it("ignores replies with an unknown id", async () => {
    const pool = createJobPool(() => new FakeWorker());
    const job = pool.run<string>("a", null);
    const [w] = FakeWorker.all;
    w.send({ id: 999, type: "done", result: "stale" });
    w.done("real");
    await expect(job).resolves.toBe("real");
  });

  it("dispose terminates everything and fails pending jobs", async () => {
    const pool = createJobPool(() => new FakeWorker(), { concurrency: 1 });
    const running = pool.run<never>("a", null).catch((e: ConversionError) => e);
    const queued = pool.run<never>("b", null).catch((e: ConversionError) => e);
    pool.dispose();
    expect((await running).code).toBe("jobCancelled");
    expect((await queued).code).toBe("jobCancelled");
    expect(FakeWorker.all[0].terminated).toBe(true);
    expect(pool.size()).toBe(0);
    await flush();
    expect(FakeWorker.all).toHaveLength(1);
  });
});
