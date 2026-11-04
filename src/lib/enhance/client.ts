import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { AutoResult, EnhanceArgs, UpscaleArgs, UpscaleResult } from "@/workers/enhance.worker";

// "Enhance photo" worker, started on first use. One job at a time: photos are
// decoded whole and the upscaler keeps its model loaded between runs.
const pool = createJobPool(() => new Worker(new URL("../../workers/enhance.worker.ts", import.meta.url), { type: "module" }));

export const autoEnhanceFile = (args: EnhanceArgs, job: JobOptions = {}) => pool.run<AutoResult>("auto", args, job);

export const upscaleFile = (args: UpscaleArgs, job: JobOptions = {}) => pool.run<UpscaleResult>("upscale", args, job);
