import { createJobPool, type JobOptions } from "@/lib/jobs";

// One QR worker, started the first time an image is read.
const QR_JOB_TIMEOUT_MS = 60_000;
const pool = createJobPool(() => new Worker(new URL("../../workers/qr.worker.ts", import.meta.url), { type: "module" }));

/** Text of the QR code in the image; fails with `qrNotFound` or `fileDamaged`. */
export const readQrImage = (input: Blob, job: JobOptions = {}) =>
  pool.run<string>("readQr", { input }, { timeoutMs: QR_JOB_TIMEOUT_MS, ...job });
