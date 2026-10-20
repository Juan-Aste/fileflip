import { apiError } from "@/lib/api-errors";
import { countryFromHeaders } from "@/config/pricing";
import { clientIp, RateLimiter } from "@/lib/server/rate-limit";
import { classifyPath, logVisit } from "@/lib/server/visits";

export const runtime = "nodejs";

// The IP is only a key of this in-memory limiter; it is never stored.
const limiter = new RateLimiter(60, 60_000);

/** Page visit beacon: language, country (CDN header) and which page. */
export async function POST(request: Request) {
  if (limiter.hit(clientIp(request)) > 0) return apiError("rateLimited");
  let visit;
  try {
    visit = classifyPath((JSON.parse(await request.text()) as { path?: unknown } | null)?.path);
  } catch {
    return apiError("invalidRequest");
  }
  // Paths that are not counted (admin, unknown locale) are accepted silently.
  if (visit) await logVisit({ ...visit, country: countryFromHeaders(request.headers) ?? undefined });
  return new Response(null, { status: 204 });
}
