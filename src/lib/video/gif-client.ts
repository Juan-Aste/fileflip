import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { GifOptions, GifResult } from "./gif";

// One GIF worker, started the first time a GIF is made.
const pool = createJobPool(() => new Worker(new URL("../../workers/video-gif.worker.ts", import.meta.url), { type: "module" }));

/** An animated GIF of part of a video; the job's timeout and signal stop the worker. */
export const makeGif = (input: Blob, options: GifOptions, job: JobOptions = {}) => pool.run<GifResult>("makeGif", { input, options }, job);
