import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { ModelResult } from "./convert";
import type { LithophaneRequest, LithophaneResult } from "./lithophane-image";
import type { ModelInput, ModelTarget } from "./options";

// One 3D worker, started the first time a model is converted.
const pool = createJobPool(() => new Worker(new URL("../../workers/model.worker.ts", import.meta.url), { type: "module" }));

/** Converts one model in the worker; the job's timeout and signal stop it. */
export const convertModelInWorker = (input: Blob, from: ModelInput, to: ModelTarget, job: JobOptions = {}) => pool.run<ModelResult>("convert", { input, from, to }, job);

/** An image → lithophane STL, in the same worker. */
export const lithophaneInWorker = (input: Blob, request: LithophaneRequest, job: JobOptions = {}) => pool.run<LithophaneResult>("lithophane", { input, request }, job);
