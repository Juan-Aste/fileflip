import { formats, outputFilename } from "@/config/formats";
import { canConvertDocumentOnServer } from "@/config/server-capabilities";
import { apiError } from "@/lib/api-errors";
import { GotenbergError, officeToPdf } from "@/lib/server/gotenberg";
import { attachment } from "@/lib/server/http";
import { PdfHasNoTextError, pdfToDocx } from "@/lib/server/pdf-to-docx";
import { elapsedMs, logConversion } from "@/lib/server/stats";
import { readUpload } from "@/lib/server/upload";
import { requestPlan } from "@/lib/server/plan";

export const runtime = "nodejs";
// LibreOffice can take a while on big spreadsheets or presentations.
export const maxDuration = 120;

/**
 * Office documents (Word, Excel, PowerPoint, OpenDocument, RTF, TXT, CSV) →
 * PDF via Gotenberg, and PDF → Word (text extraction). In memory only.
 */
export async function POST(request: Request) {
  const { plan, signedIn } = await requestPlan();
  const upload = await readUpload(request, plan, canConvertDocumentOnServer, { signedIn });
  if (upload instanceof Response) return upload;
  const { file, bytes, from, to } = upload;
  const start = performance.now();

  if (from === "pdf") {
    try {
      const docx = await pdfToDocx(bytes);
      void logConversion({
        from,
        to,
        engine: "server",
        size: file.size,
        outputSize: docx.length,
        success: true,
        durationMs: elapsedMs(start),
      });
      return new Response(docx as Uint8Array<ArrayBuffer>, {
        headers: {
          "Content-Type": formats.docx.mime,
          "Content-Disposition": attachment(outputFilename(file.name, "docx")),
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      void logConversion({
        from,
        to,
        engine: "server",
        size: file.size,
        success: false,
        durationMs: elapsedMs(start),
        errorCode: error instanceof PdfHasNoTextError ? "pdfHasNoText" : "conversionFailed",
      });
      if (error instanceof PdfHasNoTextError) return apiError("pdfHasNoText");
      console.error("pdf to docx failed", error);
      return apiError("conversionFailed");
    }
  }

  try {
    // A neutral name with the real extension: LibreOffice picks its import
    // filter from it, and user-supplied names never reach the service.
    const pdf = await officeToPdf({
      name: `document.${formats[from].extensions[0]}`,
      bytes,
    });
    void logConversion({
      from,
      to,
      engine: "server",
      size: file.size,
      outputSize: pdf.length,
      success: true,
      durationMs: elapsedMs(start),
    });
    return new Response(pdf as Uint8Array<ArrayBuffer>, {
      headers: {
        "Content-Type": formats[to].mime,
        "Content-Disposition": attachment(outputFilename(file.name, to)),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("document conversion failed", error);
    const code = error instanceof GotenbergError && error.reason !== "failed" ? "serviceUnavailable" : "conversionFailed";
    void logConversion({
      from,
      to,
      engine: "server",
      size: file.size,
      success: false,
      durationMs: elapsedMs(start),
      errorCode: code,
    });
    return apiError(code);
  }
}
