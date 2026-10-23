import { apiError } from "@/lib/api-errors";
import { readJson, TOO_LARGE } from "@/lib/server/body";
import { clientIp, RateLimiter } from "@/lib/server/rate-limit";
import { logConversion, parseConversionEntry } from "@/lib/server/stats";

export const runtime = "nodejs";

const limiter = new RateLimiter(120, 60_000);

/** Metadata of conversions done in the browser (format and size only, never the file). */
export async function POST(request: Request) {
  if (limiter.hit(clientIp(request)) > 0) return apiError("rateLimited");
  const body = await readJson(request, 16 * 1024);
  if (body === TOO_LARGE) return apiError("fileTooLarge");
  let entry;
  try {
    entry = parseConversionEntry(body);
  } catch {
    entry = null;
  }
  if (!entry) return apiError("invalidRequest");
  await logConversion(entry);
  return new Response(null, { status: 204 });
}
