import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { apiError } from "@/lib/api-errors";
import { proDisabledResponse, proEnabled } from "@/lib/pro";
import { startSubscription } from "@/lib/billing";
import { readJson, TOO_LARGE } from "@/lib/server/body";
import { PaymentProviderError } from "@/lib/payments/types";
import { configuredSiteUrl } from "@/lib/seo";
import { currentRegion } from "@/lib/server/region";

export const runtime = "nodejs";

/** Starts a Pro subscription and returns the provider's checkout URL. */
export async function POST(request: Request) {
  if (!proEnabled()) return proDisabledResponse();
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return apiError("signInRequired");

  const json = await readJson(request, 4 * 1024);
  if (json === TOO_LARGE) return apiError("fileTooLarge");
  if (!json || typeof json !== "object") return apiError("invalidRequest");
  const body = json as { period?: unknown; locale?: unknown };
  const period = body.period === "yearly" ? "yearly" : body.period === "monthly" ? "monthly" : null;
  const locale = hasLocale(routing.locales, body.locale) ? body.locale : routing.defaultLocale;
  if (!period) return apiError("invalidRequest");

  const t = await getTranslations({ locale, namespace: "Billing" });
  const origin = configuredSiteUrl() ?? new URL(request.url).origin;
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
