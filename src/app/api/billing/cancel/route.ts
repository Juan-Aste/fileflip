import { auth } from "@/auth";
import { apiError } from "@/lib/api-errors";
import { proDisabledResponse, proEnabled } from "@/lib/pro";
import { cancelUserSubscription } from "@/lib/billing";

export const runtime = "nodejs";

/** Cancels future charges; Pro remains until the paid period ends. */
export async function POST() {
  if (!proEnabled()) return proDisabledResponse();
  const session = await auth();
  if (!session?.user?.id) return apiError("signInRequired");
  try {
    const cancelled = await cancelUserSubscription(session.user.id);
    return cancelled ? new Response(null, { status: 204 }) : apiError("invalidRequest");
  } catch (error) {
    console.error("cancel failed", error);
    return apiError("serviceUnavailable");
  }
}
