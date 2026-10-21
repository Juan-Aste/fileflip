import "server-only";
import { outputFilename } from "@/config/formats";
import { tools, type ToolId } from "@/config/tools";
import { apiError } from "@/lib/api-errors";
import { decodeText } from "@/lib/data/text";
import { GotenbergError, htmlToPdf } from "./gotenberg";
import { attachment } from "./http";
import { pageSizes, type PageSize } from "./markdown-pdf";
import { requestPlan } from "./plan";
import { elapsedMs, logConversion } from "./stats";
import { readUpload } from "./upload";

/** A text upload turned into an inert HTML page (markdown-pdf.ts, html-print.ts). */
export type PrintRenderer = (text: string, options: { pageSize: PageSize }) => string;

/**
 * Shared handler of the tools printed by Gotenberg's Chromium: validates the
 * text upload, renders it with `render`, prints it and logs the conversion.
 * `rejects` turns a renderer error into an API error code (else it is a failure).
 */
export async function printUpload(
  request: Request,
  toolId: ToolId,
  render: PrintRenderer,
  rejects: (error: unknown) => "fileDamaged" | null = () => null,
): Promise<Response> {
  const tool = tools[toolId];
  const { plan, signedIn } = await requestPlan();
  // The content check only tells text from binary: these inputs are plain text.
  const upload = await readUpload(request, plan, (from, to) => from === "txt" && to === "pdf", { signedIn });
  if (upload instanceof Response) return upload;
  const { file, bytes, form } = upload;
  const start = performance.now();
  const log = (entry: { success: boolean; outputSize?: number; errorCode?: "conversionFailed" | "serviceUnavailable" }) =>
    void logConversion({ from: tool.inputs[0], to: "pdf", engine: "server", tool: toolId, size: file.size, durationMs: elapsedMs(start), ...entry });

  // Rejections before converting are reported by the browser (stats-client).
  if (bytes.length > tool.limits.maxFileBytes!) return apiError("fileTooLarge");
  let pageSize: PageSize = "a4";
  try {
    const options = JSON.parse(String(form.get("options") ?? "{}")) as { pageSize?: unknown };
    if (pageSizes.includes(options.pageSize as PageSize)) pageSize = options.pageSize as PageSize;
  } catch {
    return apiError("invalidRequest");
  }

  let html: string;
  try {
    html = render(decodeText(bytes), { pageSize });
  } catch (error) {
    const code = rejects(error);
    if (!code) throw error;
    // Not a server-logged code (convert-error.ts): the browser reports it.
    return apiError(code);
  }

  try {
    const pdf = await htmlToPdf(html);
    log({ success: true, outputSize: pdf.length });
    return new Response(pdf as Uint8Array<ArrayBuffer>, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": attachment(outputFilename(file.name, "pdf")),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(`${toolId} failed`, error);
    const code = error instanceof GotenbergError && error.reason !== "failed" ? "serviceUnavailable" : "conversionFailed";
    log({ success: false, errorCode: code });
    return apiError(code);
  }
}
