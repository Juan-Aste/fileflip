import { ConversionError, TextPositionError } from "@/lib/convert-error";
import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { Decoded, EncodeOptions } from "./base64";
import type { HashAlgorithm } from "./hash";
import type { CsvToJsonOptions, JsonToCsvOptions } from "./csv";
import type { SubtitleFormat, SubtitleResult, SyncOptions } from "@/lib/subtitle/subtitle";
import type { FontContainer, FontFlavor } from "@/lib/font/font";
import type { SheetFile, SheetOptions } from "@/lib/sheet/sheet";
import type { ArchiveOptions } from "@/lib/archive/create";
import type { ExtractResult } from "@/lib/archive/extract";
import type { EpubBook } from "@/lib/ebook/epub";
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

// Hashing reads files in chunks, so big files are fine but take longer.
const HASH_JOB_TIMEOUT_MS = 10 * 60_000;

/** Hex digests of a file's bytes, or of text as UTF-8. */
export const hashFileInput = (input: Input, algorithms: HashAlgorithm[], job: JobOptions = {}) =>
  call<Partial<Record<HashAlgorithm, string>>>("hash", { input, options: { algorithms } }, { timeoutMs: HASH_JOB_TIMEOUT_MS, ...job });

/** Subtitles converted to another format (styling beyond italic/bold/underline is dropped). */
export const convertSubtitleInput = (input: Input, to: SubtitleFormat, job: JobOptions = {}) =>
  call<SubtitleResult>("convertSubtitles", { input, options: { to } }, job);

/** Subtitles shifted and/or retimed between frame rates, in their own format. */
export const syncSubtitleInput = (input: Input, options: SyncOptions, job: JobOptions = {}) =>
  call<SubtitleResult & { format: SubtitleFormat }>("syncSubtitles", { input, options }, job);

/** A font in another container (sfnt, WOFF, WOFF2); `flavor` says whether the sfnt is .ttf or .otf. */
export const convertFontFile = (file: Blob, to: FontContainer, job: JobOptions = {}) =>
  call<{ bytes: Uint8Array; flavor: FontFlavor }>("convertFont", { input: file, options: { to } }, job);

/** A spreadsheet as XLSX, ODS or CSV (one CSV per sheet when asked). */
export const convertSpreadsheetFile = (file: File, options: SheetOptions, job: JobOptions = {}) =>
  call<SheetFile[]>("convertSpreadsheet", { input: file, options }, job);

/** The picked files in one ZIP, TAR or TAR.GZ. */
export const createArchiveFile = (files: File[], options: ArchiveOptions, job: JobOptions = {}) =>
  call<Uint8Array>("createArchive", { input: files, options }, { timeoutMs: 10 * 60_000, ...job });

/** The files inside a ZIP, TAR, TAR.GZ or GZ (links and special entries are skipped). */
export const extractArchiveFile = (file: File, job: JobOptions = {}) =>
  call<ExtractResult>("extractArchive", { input: file }, { timeoutMs: 10 * 60_000, ...job });

/** An EPUB's metadata, chapters (spine order) and images, unpacked in the worker (see lib/ebook/epub.ts). */
export const readEpubFile = (file: File, job: JobOptions = {}) => call<EpubBook>("readEpub", { input: file }, job);
