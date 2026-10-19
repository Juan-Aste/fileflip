import { formats, outputFilename, type FormatId } from "@/config/formats";
import { limits } from "@/config/limits";
import { apiError } from "@/lib/api-errors";
import { detectFormat } from "@/lib/detect";
import { parseImageOptions } from "@/lib/image/parse-options";
import { attachment } from "@/lib/server/http";
import { canConvertImageOnServer, convertImageOnServer } from "@/lib/server/image";

export const runtime = "nodejs";

/**
 * Server fallback for image conversions the browser can't do (old browser,
 * file too large for the device). Processed in memory only: nothing is stored.
 */
export async function POST(request: Request) {
  // TODO(5.7): use the signed-in user's plan.
  const plan = "free";
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limits[plan].serverMaxFileBytes + 64 * 1024) return apiError("fileTooLarge");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("invalidRequest");
  }
  const file = form.get("file");
  const to = String(form.get("to") ?? "") as FormatId;
  if (!(file instanceof File) || !(to in formats)) return apiError("invalidRequest");
  if (file.size > limits[plan].serverMaxFileBytes) return apiError("fileTooLarge");

  const buffer = Buffer.from(await file.arrayBuffer());
  // Trust the content, not the name or the declared MIME type.
  const from = detectFormat(new Uint8Array(buffer), file.name);
  if (!from || !canConvertImageOnServer(from, to)) return apiError("unsupportedFormat");

  let options;
  try {
    options = parseImageOptions(JSON.parse(String(form.get("options") ?? "{}")));
  } catch {
    return apiError("invalidRequest");
  }

  try {
    const output = await convertImageOnServer(buffer, from, to, options);
    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": formats[to].mime,
        "Content-Disposition": attachment(outputFilename(file.name, to)),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("image conversion failed", error);
    return apiError("conversionFailed");
  }
}
