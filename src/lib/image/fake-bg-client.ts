import type { FormatId } from "@/config/formats";
import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { DetectResult, RemoveResult } from "@/workers/fake-bg.worker";
import type { FakeBgOutput } from "./fake-bg-shared";

// One worker for the fake-transparency check, started when the first picture is added.
const pool = createJobPool(() => new Worker(new URL("../../workers/fake-bg.worker.ts", import.meta.url), { type: "module" }));

export const detectFakeBackground = (input: Blob, from: FormatId, job: JobOptions = {}) => pool.run<DetectResult>("detect", { input, from }, job);

export const removeFakeBackground = (input: Blob, from: FormatId, to: FakeBgOutput, job: JobOptions = {}) =>
  pool.run<RemoveResult>("remove", { input, from, to }, job);
