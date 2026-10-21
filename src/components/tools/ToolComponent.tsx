"use client";

import dynamic from "next/dynamic";
import type { ToolId } from "@/config/tools";

// One chunk per tool: a page only downloads the tool it shows. They are still
// server-rendered, so there is no layout shift while the chunk loads.
const components: Record<ToolId, React.ComponentType> = {
  "merge-pdf": dynamic(() => import("./MergePdfTool")),
  "split-pdf": dynamic(() => import("./SplitPdfTool")),
  "rotate-pdf": dynamic(() => import("./RotatePdfTool")),
  "organize-pdf": dynamic(() => import("./OrganizePdfTool")),
  "images-to-pdf": dynamic(() => import("./ImagesToPdfTool")),
  "compress-pdf": dynamic(() => import("./CompressPdfTool")),
  "json-to-csv": dynamic(() => import("./JsonToCsvTool")),
  "csv-to-json": dynamic(() => import("./CsvToJsonTool")),
  "json-to-yaml": dynamic(() => import("./data/TextConvertTools").then((m) => m.JsonToYamlTool)),
  "yaml-to-json": dynamic(() => import("./data/TextConvertTools").then((m) => m.YamlToJsonTool)),
  "json-to-toml": dynamic(() => import("./data/TextConvertTools").then((m) => m.JsonToTomlTool)),
  "toml-to-json": dynamic(() => import("./data/TextConvertTools").then((m) => m.TomlToJsonTool)),
  "json-to-xml": dynamic(() => import("./data/TextConvertTools").then((m) => m.JsonToXmlTool)),
  "xml-to-json": dynamic(() => import("./data/TextConvertTools").then((m) => m.XmlToJsonTool)),
  "json-formatter": dynamic(() => import("./data/FormatterTools").then((m) => m.JsonFormatterTool)),
  "xml-formatter": dynamic(() => import("./data/FormatterTools").then((m) => m.XmlFormatterTool)),
  "yaml-formatter": dynamic(() => import("./data/FormatterTools").then((m) => m.YamlFormatterTool)),
  "base64-encode": dynamic(() => import("./data/EncodingTools").then((m) => m.Base64EncodeTool)),
  "base64-decode": dynamic(() => import("./data/EncodingTools").then((m) => m.Base64DecodeTool)),
  "url-encode": dynamic(() => import("./data/EncodingTools").then((m) => m.UrlEncodeTool)),
  "hash-generator": dynamic(() => import("./data/HashTool")),
};

export default function ToolComponent({ id }: { id: ToolId }) {
  const Component = components[id];
  return <Component />;
}
