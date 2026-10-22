import { PDFDocument } from "pdf-lib";
import { outputFilename } from "@/config/formats";
import { apiError } from "@/lib/api-errors";
import { GotenbergError, pdfaStandards, pdfToPdfA, type PdfaStandard } from "@/lib/server/gotenberg";
import { attachment } from "@/lib/server/http";
import { requestPlan } from "@/lib/server/plan";
import { elapsedMs, logConversion } from "@/lib/server/stats";
import { readUpload } from "@/lib/server/upload";

export const runtime = "nodejs";

/** "acta.pdf" → "acta-pdfa.pdf", so the archival copy never replaces the original. */
const pdfaName = (name: string) => outputFilename(name, "pdf").replace(/\.pdf$/, "-pdfa.pdf");
export const maxDuration = 120;

/**
 * PDF → PDF/A (1b, 2b or 3b) with Gotenberg. The PDF is opened first with
 * pdf-lib so damaged or encrypted files get a clear error instead of a
 * Gotenberg 500. In memory only.
 */
export async function POST(request: Request) {
  const { plan, signedIn } = await requestPlan();
  const upload = await readUpload(request, plan, (from, to) => from === "pdf" && to === "pdf", { signedIn });
  if (upload instanceof Response) return upload;
  const { file, bytes, form } = upload;
  const start = performance.now();

  let standard: PdfaStandard = "PDF/A-2b";
  try {
    const options = JSON.parse(String(form.get("options") ?? "{}")) as { standard?: unknown };
    if (pdfaStandards.includes(options.standard as PdfaStandard)) standard = options.standard as PdfaStandard;
  } catch {
    return apiError("invalidRequest");
  }

  // Rejections before converting are reported by the browser (stats-client).
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    if (doc.isEncrypted) return apiError("pdfAlreadyProtected");
    if (doc.getPageCount() === 0) return apiError("fileDamaged");
  } catch {
    return apiError("fileDamaged");
  }

  const log = (entry: { success: boolean; outputSize?: number; errorCode?: "conversionFailed" | "serviceUnavailable" }) =>
    void logConversion({ from: "pdf", to: "pdf", engine: "server", tool: "pdf-to-pdfa", size: file.size, durationMs: elapsedMs(start), ...entry });
  try {
    const pdf = await pdfToPdfA(bytes, standard);
    log({ success: true, outputSize: pdf.length });
    return new Response(pdf as Uint8Array<ArrayBuffer>, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": attachment(pdfaName(file.name)),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("pdf to pdf/a failed", error);
    const code = error instanceof GotenbergError && error.reason !== "failed" ? "serviceUnavailable" : "conversionFailed";
    log({ success: false, errorCode: code });
    return apiError(code);
  }
}
