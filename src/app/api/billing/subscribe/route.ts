import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { apiError } from "@/lib/api-errors";
import { startSubscription } from "@/lib/billing";
import { PaymentProviderError } from "@/lib/payments/types";
import { currentRegion } from "@/lib/server/region";

export const runtime = "nodejs";

/** Starts a Pro subscription and returns the provider's checkout URL. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return apiError("signInRequired");

  let body: { period?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError("invalidRequest");
  }
  const period = body.period === "yearly" ? "yearly" : body.period === "monthly" ? "monthly" : null;
  const locale = hasLocale(routing.locales, body.locale) ? body.locale : routing.defaultLocale;
  if (!period) return apiError("invalidRequest");

  const t = await getTranslations({ locale, namespace: "Billing" });
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  try {
    const url = await startSubscription({
      userId: session.user.id,
      email: session.user.email,
      region: await currentRegion(),
      period,
      reason: t(period),
      backUrl: `${origin}/${locale}/account?checkout=done`,
    });
    return Response.json({ url });
  } catch (error) {
    console.error("subscribe failed", error);
    if (error instanceof PaymentProviderError && error.reason !== "rejected") return apiError("paymentsUnavailable");
    return apiError("serviceUnavailable");
  }
}
