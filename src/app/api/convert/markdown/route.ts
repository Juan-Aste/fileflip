import { outputFilename } from "@/config/formats";
import { tools } from "@/config/tools";
import { apiError } from "@/lib/api-errors";
import { decodeText } from "@/lib/data/text";
import { GotenbergError, htmlToPdf } from "@/lib/server/gotenberg";
import { attachment } from "@/lib/server/http";
import { markdownToPrintHtml, pageSizes, type PageSize } from "@/lib/server/markdown-pdf";
import { requestPlan } from "@/lib/server/plan";
import { elapsedMs, logConversion } from "@/lib/server/stats";
import { readUpload } from "@/lib/server/upload";

export const runtime = "nodejs";
export const maxDuration = 120;

const tool = tools["markdown-to-pdf"];

/**
 * Markdown → PDF: the Markdown is rendered here into an inert HTML page
 * (markdown-pdf.ts) and printed by Gotenberg's Chromium. In memory only.
 */
export async function POST(request: Request) {
  const { plan, signedIn } = await requestPlan();
  // Markdown is plain text: the content check only tells text from binary.
  const upload = await readUpload(request, plan, (from, to) => from === "txt" && to === "pdf", { signedIn });
  if (upload instanceof Response) return upload;
  const { file, bytes, form } = upload;
  const start = performance.now();
  const log = (entry: { success: boolean; outputSize?: number; errorCode?: "conversionFailed" | "serviceUnavailable" }) =>
    void logConversion({ from: "md", to: "pdf", engine: "server", tool: "markdown-to-pdf", size: file.size, durationMs: elapsedMs(start), ...entry });

  // Rejections before converting are reported by the browser (stats-client).
  if (bytes.length > tool.limits.maxFileBytes!) return apiError("fileTooLarge");
  let pageSize: PageSize = "a4";
  try {
    const options = JSON.parse(String(form.get("options") ?? "{}")) as { pageSize?: unknown };
    if (pageSizes.includes(options.pageSize as PageSize)) pageSize = options.pageSize as PageSize;
  } catch {
    return apiError("invalidRequest");
  }

  try {
    const pdf = await htmlToPdf(markdownToPrintHtml(decodeText(bytes), { pageSize }));
    log({ success: true, outputSize: pdf.length });
    return new Response(pdf as Uint8Array<ArrayBuffer>, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": attachment(outputFilename(file.name, "pdf")),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("markdown to pdf failed", error);
    const code = error instanceof GotenbergError && error.reason !== "failed" ? "serviceUnavailable" : "conversionFailed";
    log({ success: false, errorCode: code });
    return apiError(code);
  }
}
