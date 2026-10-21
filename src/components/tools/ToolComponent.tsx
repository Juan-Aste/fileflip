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
  "uuid-generator": dynamic(() => import("./data/GeneratorTools").then((m) => m.UuidGeneratorTool)),
  "timestamp-converter": dynamic(() => import("./data/GeneratorTools").then((m) => m.TimestampConverterTool)),
  "qr-generator": dynamic(() => import("./qr/QrTools").then((m) => m.QrGeneratorTool)),
  "qr-reader": dynamic(() => import("./qr/QrTools").then((m) => m.QrReaderTool)),
  "password-generator": dynamic(() => import("./text/TextTools").then((m) => m.PasswordGeneratorTool)),
  "word-counter": dynamic(() => import("./text/TextTools").then((m) => m.WordCounterTool)),
  "color-converter": dynamic(() => import("./utility/UtilityTools").then((m) => m.ColorConverterTool)),
  "unit-converter": dynamic(() => import("./utility/UtilityTools").then((m) => m.UnitConverterTool)),
  "compress-image": dynamic(() => import("./image/CompressImageTool")),
  "resize-image": dynamic(() => import("./image/ResizeImageTool")),
  "rotate-image": dynamic(() => import("./image/RotateImageTool")),
  "crop-image": dynamic(() => import("./image/CropImageTool")),
  "watermark-image": dynamic(() => import("./image/OverlayImageTool").then((m) => m.WatermarkImageTool)),
  "add-text-to-image": dynamic(() => import("./image/OverlayImageTool").then((m) => m.AddTextToImageTool)),
  "favicon-generator": dynamic(() => import("./image/FaviconTool")),
  "svg-converter": dynamic(() => import("./image/SvgConverterTool")),
  "delete-pdf-pages": dynamic(() => import("./PageSelectPdfTool").then((m) => m.DeletePdfPagesTool)),
  "extract-pdf-pages": dynamic(() => import("./PageSelectPdfTool").then((m) => m.ExtractPdfPagesTool)),
  "pdf-page-numbers": dynamic(() => import("./PdfStampTools").then((m) => m.PdfPageNumbersTool)),
  "pdf-watermark": dynamic(() => import("./PdfStampTools").then((m) => m.PdfWatermarkTool)),
  "pdf-to-text": dynamic(() => import("./PdfTextCropTools").then((m) => m.PdfToTextTool)),
  "crop-pdf": dynamic(() => import("./PdfTextCropTools").then((m) => m.CropPdfTool)),
  "sign-pdf": dynamic(() => import("./SignPdfTool")),
  "protect-pdf": dynamic(() => import("./PdfPasswordTools").then((m) => m.ProtectPdfTool)),
  "unlock-pdf": dynamic(() => import("./PdfPasswordTools").then((m) => m.UnlockPdfTool)),
  "pdf-to-pdfa": dynamic(() => import("./PdfaTool")),
  "extract-pdf-images": dynamic(() => import("./ExtractPdfImagesTool")),
  "font-converter": dynamic(() => import("./font/FontConverterTool")),
  "markdown-to-html": dynamic(() => import("./markup/MarkdownTools").then((m) => m.MarkdownToHtmlTool)),
  "markdown-to-pdf": dynamic(() => import("./markup/PrintToPdfTools").then((m) => m.MarkdownToPdfTool)),
  "html-to-pdf": dynamic(() => import("./markup/PrintToPdfTools").then((m) => m.HtmlToPdfTool)),
  "spreadsheet-converter": dynamic(() => import("./data/SpreadsheetTool")),
  "html-to-markdown": dynamic(() => import("./markup/MarkdownTools").then((m) => m.HtmlToMarkdownTool)),
  "subtitle-converter": dynamic(() => import("./subtitle/SubtitleTools").then((m) => m.SubtitleConverterTool)),
  "subtitle-sync": dynamic(() => import("./subtitle/SubtitleTools").then((m) => m.SubtitleSyncTool)),
  "remove-exif": dynamic(() => import("./image/RemoveMetadataTool")),
};

export default function ToolComponent({ id }: { id: ToolId }) {
  const Component = components[id];
  return <Component />;
}
