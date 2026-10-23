import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { apiError } from "@/lib/api-errors";
import { authSecretMissing } from "@/lib/auth-providers";

export const runtime = "nodejs";

// Without AUTH_SECRET in production Auth.js answers every call with a 500
// (MissingSecret), and every page asks for the session. Degrade instead:
// nobody is signed in and sign-in is unavailable (the login page says so).
export function GET(request: NextRequest) {
  if (!authSecretMissing()) return handlers.GET(request);
  return request.nextUrl.pathname.endsWith("/session") ? Response.json(null) : apiError("serviceUnavailable");
}

export function POST(request: NextRequest) {
  return authSecretMissing() ? apiError("serviceUnavailable") : handlers.POST(request);
}
