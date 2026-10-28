import type { AbstractIntlMessages } from "next-intl";

// Read only by server components: never sent to the browser.
const SERVER_ONLY = ["Tools", "Legal"];
/**
 * Read only by the tool components in src/components/tools, so only tool
 * pages need them (client-messages.test.ts checks nothing else uses them).
 * A namespace missing here is just sent to every page.
 */
export const TOOL_ONLY = [
  "ArchiveTool", "AudioTool", "CompressVideoTool", "DataTools", "DxfConverterTool", "EbookTool", "EditPdf",
  "ExtractAudioTool", "FontTools", "IdPhotoTool", "ImageTools", "JoinVideosTool", "LithophaneTool",
  "MarkupTools", "ModelConverterTool", "ModelViewer", "OcrTool", "PdfExcelTool", "PdfTools", "PdfaTool", "QrTools",
  "ReadAloudTool", "RemoveBackgroundTool", "ScanDocumentTool", "SheetTool", "SignPdf", "SubtitleTools",
  "TextTools", "TrimVideoTool", "UtilityTools", "VideoSpeedTool", "VideoToGifTool", "VideoTool",
];

/**
 * The messages the browser gets on every page: all but the tool and legal
 * texts (server components render those). Keeps ~170 KB of JSON out of
 * every page's HTML; a tool page adds its own with <ToolMessages>.
 */
export function clientMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  const omit = new Set([...SERVER_ONLY, ...TOOL_ONLY]);
  return Object.fromEntries(Object.entries(messages).filter(([ns]) => !omit.has(ns)));
}

/** What one tool's client component needs on top of clientMessages: its `Tools.<id>` entry and the tool namespaces. */
export function toolMessages(messages: AbstractIntlMessages, id: string): AbstractIntlMessages {
  const all = messages.Tools as Record<string, AbstractIntlMessages> | undefined;
  return {
    ...Object.fromEntries(TOOL_ONLY.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]])),
    Tools: { [id]: all?.[id] ?? {} },
  };
}
