import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSentencePlayer, type AudioOut, type GeneratedAudio } from "./player";
import { createPrefetchQueue } from "./prefetch";

// A fake audio clock on Vitest's fake timers: a source started at `when`
// "plays" until when + duration and then fires onended.
function fakeOutput() {
  const t0 = Date.now();
  const starts: { at: number; startAt: number; duration: number }[] = [];
  const out: AudioOut = {
    get currentTime() {
      return (Date.now() - t0) / 1000;
    },
    destination: {} as AudioNode,
    createBuffer: (_c, length, sampleRate) => ({ duration: length / sampleRate, copyToChannel() {} }) as unknown as AudioBuffer,
    createBufferSource() {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const node = {
        buffer: null as AudioBuffer | null,
        onended: null as (() => void) | null,
        connect() {},
        disconnect() {},
        start(when = 0) {
          const end = Math.max(when, out.currentTime) + node.buffer!.duration;
          timer = setTimeout(() => node.onended?.(), (end - out.currentTime) * 1000);
        },
        stop() {
          clearTimeout(timer);
        },
      };
      return node as unknown as AudioBufferSourceNode;
    },
  };
  return { out, starts };
}

const RATE = 1000;
const audio = (seconds: number): GeneratedAudio => ({ pcm: new Float32Array(Math.round(seconds * RATE)), sampleRate: RATE });

/**
 * Plays `durations` (seconds of speech per sentence) with a generator taking
 * `latency(i)` ms per sentence, and returns the silence between sentences
 * beyond the designed pause, in ms.
 */
async function measure({
  durations,
  latency,
  ahead,
  concurrency,
  gapSeconds = 0.3,
}: {
  durations: number[];
  latency: (i: number) => number;
  ahead: number;
  concurrency: number;
  gapSeconds?: number;
}) {
  const { out } = fakeOutput();
  const scheduled: { startAt: number; duration: number }[] = [];
  let finished = false;
  const queue = createPrefetchQueue<GeneratedAudio>({
    generate: (i) => new Promise((resolve) => setTimeout(() => resolve(audio(durations[i])), latency(i))),
    ahead,
    concurrency,
    count: () => durations.length,
  });
  const indexes: number[] = [];
  const player = createSentencePlayer({
    output: () => out,
    queue,
    count: () => durations.length,
    gapSeconds,
    events: {
      onIndex: (i) => indexes.push(i),
      onWaiting: () => {},
      onFinished: () => (finished = true),
      onFailed: () => {
        throw new Error("failed");
      },
      onScheduled: (i, startAt, duration) => (scheduled[i] = { startAt, duration }),
    },
  });
  player.start(0);
  const total = durations.reduce((a, b) => a + b + gapSeconds, 0) + durations.length * (latency(0) / 1000) + 5;
  await vi.advanceTimersByTimeAsync(total * 1000);
  expect(finished).toBe(true);
  const gaps = scheduled.slice(1).map((s, i) => Math.round((s.startAt - (scheduled[i].startAt + scheduled[i].duration)) * 1000));
  return { gaps, indexes, firstStart: scheduled[0].startAt };
}

describe("createSentencePlayer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("with the AI voice in the browser on a PC (generation ~0.4× real time) no silence is added between sentences", async () => {
    const durations = [4, 2.5, 6, 3, 1.5, 5, 2];
    const { gaps, indexes } = await measure({ durations, latency: (i) => durations[i] * 400, ahead: 3, concurrency: 1 });
    expect(gaps).toEqual([0, 0, 0, 0, 0, 0]);
    expect(indexes.at(-1)).toBe(durations.length - 1);
  });

  it("with a cloud voice (~600–900 ms per request, 3 in parallel) no silence after the first sentence either", async () => {
    const durations = [3, 1, 1, 4, 1, 2, 3, 1];
    const latency = (i: number) => 600 + ((i * 137) % 300);
    const { gaps, firstStart } = await measure({ durations, latency, ahead: 3, concurrency: 3 });
    expect(Math.max(...gaps)).toBeLessThan(150);
    // Only the first sentence waits for the network.
    expect(firstStart).toBeCloseTo(0.6, 1);
  });

  it("when generation is slower than speech (a slow phone), each sentence starts as soon as it is ready", async () => {
    const durations = [1, 1, 1, 1];
    const { gaps } = await measure({ durations, latency: () => 2000, ahead: 3, concurrency: 1 });
    // 2 s per sentence against 1.3 s of audio: ~700 ms of waiting each time, never more.
    for (const gap of gaps) expect(gap).toBeLessThanOrEqual(700);
    expect(gaps.at(-1)).toBeGreaterThan(600);
  });

  it("stop() cancels the scheduled sentence and nothing more is played", async () => {
    const { out } = fakeOutput();
    const onFinished = vi.fn();
    const scheduled: number[] = [];
    const queue = createPrefetchQueue<GeneratedAudio>({ generate: async () => audio(1), ahead: 2, concurrency: 1, count: () => 5 });
    const player = createSentencePlayer({
      output: () => out,
      queue,
      count: () => 5,
      gapSeconds: 0.3,
      events: { onIndex() {}, onWaiting() {}, onFinished, onFailed() {}, onScheduled: (i) => scheduled.push(i) },
    });
    player.start(0);
    await vi.advanceTimersByTimeAsync(500);
    expect(scheduled).toEqual([0, 1]);
    player.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(scheduled).toEqual([0, 1]);
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("a failed sentence reports the failure", async () => {
    const { out } = fakeOutput();
    const onFailed = vi.fn();
    const queue = createPrefetchQueue<GeneratedAudio>({
      generate: async (i) => {
        if (i === 1) throw new Error("offline");
        return audio(1);
      },
      ahead: 1,
      concurrency: 1,
      count: () => 3,
    });
    const player = createSentencePlayer({ output: () => out, queue, count: () => 3, gapSeconds: 0.3, events: { onIndex() {}, onWaiting() {}, onFinished() {}, onFailed } });
    player.start(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(onFailed).toHaveBeenCalledTimes(1);
  });
});
