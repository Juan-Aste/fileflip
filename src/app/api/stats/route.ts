import { apiError } from "@/lib/api-errors";
import { clientIp, RateLimiter } from "@/lib/server/rate-limit";
import { logConversion, parseConversionEntry } from "@/lib/server/stats";

export const runtime = "nodejs";

const limiter = new RateLimiter(120, 60_000);

/** Metadata of conversions done in the browser (format and size only, never the file). */
export async function POST(request: Request) {
  if (limiter.hit(clientIp(request)) > 0) return apiError("rateLimited");
  let entry;
  try {
    entry = parseConversionEntry(JSON.parse(await request.text()));
  } catch {
    entry = null;
  }
  if (!entry) return apiError("invalidRequest");
  await logConversion(entry);
  return new Response(null, { status: 204 });
}
