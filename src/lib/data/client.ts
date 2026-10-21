import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { CsvToJsonOptions, JsonToCsvOptions } from "./csv";

// One data worker, started on first use. Text formats are parsed whole, so a
// job that runs away (a huge or pathological file) is stopped by the limit.
const DATA_JOB_TIMEOUT_MS = 2 * 60_000;
const pool = createJobPool(
  () => new Worker(new URL("../../workers/data.worker.ts", import.meta.url), { type: "module" }),
);

type Input = Blob | string;
const call = (method: string, args: unknown, options: JobOptions) =>
  pool.run<string>(method, args, { timeoutMs: DATA_JOB_TIMEOUT_MS, ...options });

export const convertJsonToCsv = (input: Input, options: JsonToCsvOptions, job: JobOptions = {}) =>
  call("jsonToCsv", { input, options }, job);

export const convertCsvToJson = (input: Input, options: CsvToJsonOptions, job: JobOptions = {}) =>
  call("csvToJson", { input, options }, job);
