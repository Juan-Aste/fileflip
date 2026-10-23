import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { apiError } from "@/lib/api-errors";
import { authSecretMissing } from "@/lib/auth-providers";
import { readBody, SMALL_BODY_BYTES } from "@/lib/server/body";
import { clientIp, signInLinkLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

// Without AUTH_SECRET in production Auth.js answers every call with a 500
// (MissingSecret), and every page asks for the session. Degrade instead:
// nobody is signed in and sign-in is unavailable (the login page says so).
export function GET(request: NextRequest) {
  if (!authSecretMissing()) return handlers.GET(request);
  return request.nextUrl.pathname.endsWith("/session") ? Response.json(null) : apiError("serviceUnavailable");
}

export async function POST(request: NextRequest) {
  if (authSecretMissing()) return apiError("serviceUnavailable");
  // Sign-in and sign-out forms are tiny: don't let Auth.js buffer a huge body (B-23).
  const body = await readBody(request, SMALL_BODY_BYTES);
  if (!body) return apiError("fileTooLarge");
  if (request.nextUrl.pathname.endsWith("/signin/nodemailer")) {
    const email = new URLSearchParams(new TextDecoder().decode(body)).get("email")?.trim().toLowerCase();
    const waitMs = Math.max(signInLinkLimiter.perIp.hit(clientIp(request)), email ? signInLinkLimiter.perEmail.hit(email) : 0);
    if (waitMs > 0) return apiError("rateLimited", { "Retry-After": String(Math.ceil(waitMs / 1000)) });
  }
  return handlers.POST(new NextRequest(request.url, { method: "POST", headers: request.headers, body: body as Uint8Array<ArrayBuffer> }));
}
