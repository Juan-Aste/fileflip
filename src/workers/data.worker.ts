/// <reference lib="webworker" />
import { csvToJson, jsonToCsv, type CsvToJsonOptions, type JsonToCsvOptions } from "@/lib/data/csv";
import { formatJson, formatXml, formatYaml, type JsonFormatOptions, type XmlFormatOptions, type YamlFormatOptions } from "@/lib/data/format";
import { decodeBase64, encodeBase64, type EncodeOptions } from "@/lib/data/base64";
import { hashInput, type HashAlgorithm } from "@/lib/data/hash";
import { decodeText } from "@/lib/data/text";
import { jsonToToml, tomlToJson } from "@/lib/data/toml";
import { jsonToXml, xmlToJson } from "@/lib/data/xml";
import { jsonToYaml, yamlToJson } from "@/lib/data/yaml";
import { convertSubtitles, syncSubtitles, type SubtitleFormat, type SyncOptions } from "@/lib/subtitle/subtitle";
import { convertFont, type FontContainer, type Woff2Codec } from "@/lib/font/font";
import type { SheetOptions } from "@/lib/sheet/sheet";
import { createArchive, type ArchiveOptions } from "@/lib/archive/create";
import { extractArchive } from "@/lib/archive/extract";
import { exposeHandlers } from "@/lib/worker-rpc";

// Google's WOFF2 encoder (WASM, ~1 MB): only downloaded by the font converter.
const woff2Codec = (): Promise<Woff2Codec> => import("woff2-encoder").then(({ compress, decompress }) => ({ compress, decompress }));

// SheetJS (~1 MB): only downloaded by the spreadsheet converter.
const sheetEngine = () => import("@/lib/sheet/sheet");

// Data tools (JSON, CSV, YAML, TOML, XML) and subtitles: parsing big files off the main thread keeps the page responsive.
const textOf = async (input: Blob | string) =>
  typeof input === "string" ? input : decodeText(new Uint8Array(await input.arrayBuffer()));

type Input<O = undefined> = { input: Blob | string; options: O };
const text = (convert: (text: string) => string) => async ({ input }: Input) => ({ result: convert(await textOf(input)) });

exposeHandlers({
  jsonToCsv: async ({ input, options }: Input<JsonToCsvOptions>) => ({ result: jsonToCsv(await textOf(input), options) }),
  csvToJson: async ({ input, options }: Input<CsvToJsonOptions>) => ({ result: csvToJson(await textOf(input), options) }),
  jsonToYaml: text(jsonToYaml),
  yamlToJson: text(yamlToJson),
  jsonToToml: text(jsonToToml),
  tomlToJson: text(tomlToJson),
  jsonToXml: text(jsonToXml),
  xmlToJson: text(xmlToJson),
  base64Encode: async ({ input, options }: Input<EncodeOptions>) => ({
    result: encodeBase64(typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(await input.arrayBuffer()), options),
  }),
  base64Decode: async ({ input }: Input) => {
    const result = decodeBase64(await textOf(input));
    return { result, transfer: [result.bytes.buffer] };
  },
  hash: async ({ input, options }: Input<{ algorithms: HashAlgorithm[] }>, onProgress: (progress: number) => void) => ({
    result: await hashInput(input, options.algorithms, onProgress),
  }),
  convertSubtitles: async ({ input, options }: Input<{ to: SubtitleFormat }>) => ({ result: convertSubtitles(await textOf(input), options.to) }),
  convertFont: async ({ input, options }: { input: Blob; options: { to: FontContainer } }) => {
    const result = await convertFont(new Uint8Array(await input.arrayBuffer()), options.to, woff2Codec);
    return { result, transfer: [result.bytes.buffer] };
  },
  convertSpreadsheet: async ({ input, options }: { input: File; options: SheetOptions }) => {
    const result = (await sheetEngine()).convertSpreadsheet(new Uint8Array(await input.arrayBuffer()), input.name, options);
    return { result, transfer: result.map((file) => file.bytes.buffer) };
  },
  createArchive: async ({ input, options }: { input: File[]; options: ArchiveOptions }) => {
    const entries = await Promise.all(
      input.map(async (file) => ({ name: file.name, data: new Uint8Array(await file.arrayBuffer()), mtime: file.lastModified })),
    );
    const result = createArchive(entries, options);
    return { result, transfer: [result.buffer] };
  },
  extractArchive: async ({ input }: { input: File }) => {
    const result = extractArchive(new Uint8Array(await input.arrayBuffer()), input.name);
    return { result, transfer: result.files.map((f) => f.data.buffer) };
  },
  syncSubtitles: async ({ input, options }: Input<SyncOptions>) => ({ result: syncSubtitles(await textOf(input), options) }),
  // Formatters answer with a result (with the error position) instead of throwing.
  formatJson: async ({ input, options }: Input<JsonFormatOptions>) => ({ result: formatJson(await textOf(input), options) }),
  formatXml: async ({ input, options }: Input<XmlFormatOptions>) => ({ result: formatXml(await textOf(input), options) }),
  formatYaml: async ({ input, options }: Input<YamlFormatOptions>) => ({ result: formatYaml(await textOf(input), options) }),
});
