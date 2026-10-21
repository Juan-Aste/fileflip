import { ConversionError, TextPositionError } from "@/lib/convert-error";
import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { Decoded, EncodeOptions } from "./base64";
import type { CsvToJsonOptions, JsonToCsvOptions } from "./csv";
import type { FormatResult, JsonFormatOptions, XmlFormatOptions, YamlFormatOptions } from "./format";

// One data worker, started on first use. Text formats are parsed whole, so a
// job that runs away (a huge or pathological file) is stopped by the limit.
const DATA_JOB_TIMEOUT_MS = 2 * 60_000;
const pool = createJobPool(
  () => new Worker(new URL("../../workers/data.worker.ts", import.meta.url), { type: "module" }),
);

type Input = Blob | string;
const call = <T = string>(method: string, args: unknown, options: JobOptions) =>
  pool.run<T>(method, args, { timeoutMs: DATA_JOB_TIMEOUT_MS, ...options });

export const convertJsonToCsv = (input: Input, options: JsonToCsvOptions, job: JobOptions = {}) =>
  call("jsonToCsv", { input, options }, job);

export const convertCsvToJson = (input: Input, options: CsvToJsonOptions, job: JobOptions = {}) =>
  call("csvToJson", { input, options }, job);

/** Conversions without options. */
export type TextConversion = "jsonToYaml" | "yamlToJson" | "jsonToToml" | "tomlToJson" | "jsonToXml" | "xmlToJson";

export const convertText = (method: TextConversion, input: Input, job: JobOptions = {}) => call(method, { input }, job);

type FormatCall =
  | { method: "formatJson"; options: JsonFormatOptions }
  | { method: "formatXml"; options: XmlFormatOptions }
  | { method: "formatYaml"; options: YamlFormatOptions };

/** Formats a text, failing with the position of the first syntax error when there is one. */
export async function formatText({ method, options }: FormatCall, input: Input, job: JobOptions = {}): Promise<string> {
  const result = await call<FormatResult>(method, { input, options }, job);
  if (result.ok) return result.text;
  if (result.line !== undefined && result.column !== undefined) {
    throw new TextPositionError(result.code, { line: result.line, column: result.column });
  }
  throw new ConversionError(result.code);
}

/** Base64 of a file's bytes, or of text as UTF-8. */
export const encodeBase64Input = (input: Input, options: EncodeOptions, job: JobOptions = {}) =>
  call("base64Encode", { input, options }, job);

export const decodeBase64Input = (input: Input, job: JobOptions = {}) => call<Decoded>("base64Decode", { input }, job);
