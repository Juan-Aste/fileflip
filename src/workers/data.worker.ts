/// <reference lib="webworker" />
import { csvToJson, jsonToCsv, type CsvToJsonOptions, type JsonToCsvOptions } from "@/lib/data/csv";
import { formatJson, formatXml, formatYaml, type JsonFormatOptions, type XmlFormatOptions, type YamlFormatOptions } from "@/lib/data/format";
import { decodeBase64, encodeBase64, type EncodeOptions } from "@/lib/data/base64";
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
  base64Encode: async ({ input, options }: Input<EncodeOptions>) => ({
    result: encodeBase64(typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(await input.arrayBuffer()), options),
  }),
  base64Decode: async ({ input }: Input) => {
    const result = decodeBase64(await textOf(input));
    return { result, transfer: [result.bytes.buffer] };
  },
  // Formatters answer with a result (with the error position) instead of throwing.
  formatJson: async ({ input, options }: Input<JsonFormatOptions>) => ({ result: formatJson(await textOf(input), options) }),
  formatXml: async ({ input, options }: Input<XmlFormatOptions>) => ({ result: formatXml(await textOf(input), options) }),
  formatYaml: async ({ input, options }: Input<YamlFormatOptions>) => ({ result: formatYaml(await textOf(input), options) }),
});
