import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { DxfRequest, DxfResult } from "./convert";

// One CAD worker, started the first time a drawing is converted.
const pool = createJobPool(() => new Worker(new URL("../../workers/cad.worker.ts", import.meta.url), { type: "module" }));

/** Converts one DXF in the worker; the job's timeout and signal stop it. */
export const convertDxfInWorker = (input: Blob, request: DxfRequest, job: JobOptions = {}) => pool.run<DxfResult>("convert", { input, request }, job);
