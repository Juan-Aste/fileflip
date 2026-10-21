/// <reference lib="webworker" />
import { csvToJson, jsonToCsv, type CsvToJsonOptions, type JsonToCsvOptions } from "@/lib/data/csv";
import { decodeText } from "@/lib/data/text";
import { exposeHandlers } from "@/lib/worker-rpc";

// Data tools (JSON, CSV...): parsing big files off the main thread keeps the page responsive.
const textOf = async (input: Blob | string) =>
  typeof input === "string" ? input : decodeText(new Uint8Array(await input.arrayBuffer()));

exposeHandlers({
  jsonToCsv: async ({ input, options }: { input: Blob | string; options: JsonToCsvOptions }) => ({
    result: jsonToCsv(await textOf(input), options),
  }),
  csvToJson: async ({ input, options }: { input: Blob | string; options: CsvToJsonOptions }) => ({
    result: csvToJson(await textOf(input), options),
  }),
});
