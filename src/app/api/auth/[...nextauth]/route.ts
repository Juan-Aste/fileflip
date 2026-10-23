import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { apiError } from "@/lib/api-errors";
import { authSecretMissing } from "@/lib/auth-providers";
import { readBody, SMALL_BODY_BYTES } from "@/lib/server/body";

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
  return handlers.POST(new NextRequest(request.url, { method: "POST", headers: request.headers, body: body as Uint8Array<ArrayBuffer> }));
}
