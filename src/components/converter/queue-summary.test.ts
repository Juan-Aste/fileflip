import { describe, expect, it } from "vitest";
import { queueSummary } from "./queue-summary";
import type { JobState } from "./useFileQueue";

const done: JobState = { status: "done", blob: new Blob(), url: "blob:x", name: "a.webp", engine: "browser" };
const error: JobState = { status: "error", code: "conversionFailed" };
const working = (progress: number): JobState => ({ status: "working", progress });

describe("queueSummary", () => {
  it("is idle with no jobs", () => {
    expect(queueSummary([{}, {}])).toMatchObject({ total: 0, state: "idle", progress: 0 });
  });

  it("averages progress while working, counting finished jobs as complete", () => {
    const s = queueSummary([{ job: working(0.5) }, { job: done }, { job: working(0) }, {}]);
    expect(s).toMatchObject({ total: 3, working: 2, done: 1, errors: 0, state: "working" });
    expect(s.progress).toBeCloseTo(0.5);
  });

  it("is done when every job succeeded", () => {
    expect(queueSummary([{ job: done }, { job: done }])).toMatchObject({ state: "done", progress: 1 });
  });

  it("reports errors once nothing is running", () => {
    expect(queueSummary([{ job: done }, { job: error }])).toMatchObject({
      state: "error",
      done: 1,
      errors: 1,
    });
  });

  it("clamps out-of-range progress", () => {
    expect(queueSummary([{ job: working(3) }]).progress).toBe(1);
  });
});
