import { formats, outputFilename } from "@/config/formats";
import { canConvertImageOnServer } from "@/config/server-capabilities";
import { apiError } from "@/lib/api-errors";
import { parseImageOptions } from "@/lib/image/parse-options";
import { attachment } from "@/lib/server/http";
import { convertImageOnServer } from "@/lib/server/image";
import { elapsedMs, logConversion } from "@/lib/server/stats";
import { readUpload } from "@/lib/server/upload";
import { requestPlan } from "@/lib/server/plan";

export const runtime = "nodejs";

/**
 * Server fallback for image conversions the browser can't do (old browser,
 * file too large for the device). Processed in memory only: nothing is stored.
 */
export async function POST(request: Request) {
  const { plan, signedIn } = await requestPlan();
  const upload = await readUpload(request, plan, canConvertImageOnServer, { signedIn });
  if (upload instanceof Response) return upload;
  const { file, bytes, from, to, form } = upload;

  let options;
  try {
    options = parseImageOptions(
      JSON.parse(String(form.get("options") ?? "{}")),
    );
  } catch {
    return apiError("invalidRequest");
  }

  const start = performance.now();
  try {
    const output = await convertImageOnServer(
      // A view over the upload, not a copy.
      Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      from,
      to,
      options,
    );
    void logConversion({
      from,
      to,
      engine: "server",
      size: file.size,
      outputSize: output.length,
      success: true,
      durationMs: elapsedMs(start),
    });
    return new Response(output as Uint8Array<ArrayBuffer>, {
      headers: {
        "Content-Type": formats[to].mime,
        "Content-Disposition": attachment(outputFilename(file.name, to)),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("image conversion failed", error);
    void logConversion({
      from,
      to,
      engine: "server",
      size: file.size,
      success: false,
      durationMs: elapsedMs(start),
      errorCode: "conversionFailed",
    });
    return apiError("conversionFailed");
  }
}
