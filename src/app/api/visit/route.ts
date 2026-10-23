import { apiError } from "@/lib/api-errors";
import { countryFromHeaders } from "@/config/pricing";
import { readJson, TOO_LARGE } from "@/lib/server/body";
import { clientIp, RateLimiter } from "@/lib/server/rate-limit";
import { classifyPath, logVisit } from "@/lib/server/visits";

export const runtime = "nodejs";

// The IP is only a key of this in-memory limiter; it is never stored.
const limiter = new RateLimiter(60, 60_000);

/** Page visit beacon: language, country (CDN header) and which page. */
export async function POST(request: Request) {
  if (limiter.hit(clientIp(request)) > 0) return apiError("rateLimited");
  const body = await readJson(request, 4 * 1024);
  if (body === TOO_LARGE) return apiError("fileTooLarge");
  if (body === undefined) return apiError("invalidRequest");
  const visit = classifyPath((body as { path?: unknown } | null)?.path);
  // Paths that are not counted (admin, unknown locale) are accepted silently.
  if (visit) await logVisit({ ...visit, country: countryFromHeaders(request.headers) ?? undefined });
  return new Response(null, { status: 204 });
}
