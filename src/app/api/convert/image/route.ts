import { formats, outputFilename } from "@/config/formats";
import { canConvertImageOnServer } from "@/config/server-capabilities";
import { apiError } from "@/lib/api-errors";
import { parseImageOptions } from "@/lib/image/parse-options";
import { attachment } from "@/lib/server/http";
import { convertImageOnServer } from "@/lib/server/image";
import { readUpload } from "@/lib/server/upload";

export const runtime = "nodejs";

/**
 * Server fallback for image conversions the browser can't do (old browser,
 * file too large for the device). Processed in memory only: nothing is stored.
 */
export async function POST(request: Request) {
  // TODO(5.7): use the signed-in user's plan.
  const upload = await readUpload(request, "free", canConvertImageOnServer);
  if (upload instanceof Response) return upload;
  const { file, bytes, from, to, form } = upload;

  let options;
  try {
    options = parseImageOptions(JSON.parse(String(form.get("options") ?? "{}")));
  } catch {
    return apiError("invalidRequest");
  }

  try {
    const output = await convertImageOnServer(Buffer.from(bytes), from, to, options);
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
