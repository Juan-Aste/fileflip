/// <reference lib="webworker" />
import { csvToJson, jsonToCsv, type CsvToJsonOptions, type JsonToCsvOptions } from "@/lib/data/csv";
import { decodeText } from "@/lib/data/text";
import { jsonToToml, tomlToJson } from "@/lib/data/toml";
import { jsonToXml, xmlToJson } from "@/lib/data/xml";
import { jsonToYaml, yamlToJson } from "@/lib/data/yaml";
import { exposeHandlers } from "@/lib/worker-rpc";

// Data tools (JSON, CSV, YAML, TOML, XML): parsing big files off the main thread keeps the page responsive.
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
});
