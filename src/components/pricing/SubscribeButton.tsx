"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle } from "lucide-react";
import type { BillingPeriod } from "@/config/pricing";
import { useRouter } from "@/i18n/navigation";
import type { ApiErrorCode } from "@/lib/api-errors";
import { postAction } from "@/lib/post-action";
import { buttonPrimary } from "@/components/ui/styles";

/** Starts checkout; anonymous visitors are sent to sign in first. */
export default function SubscribeButton({ period, signedIn }: { period: BillingPeriod; signedIn: boolean }) {
  const t = useTranslations("Pricing");
  const te = useTranslations("ApiErrors");
  const tl = useTranslations("Login");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  // A ref, not state: a second click in the same frame must already see it.
  const inFlight = useRef(false);

  async function start() {
    if (!signedIn) {
      router.push({ pathname: "/login", query: { callbackUrl: `/${locale}/pricing` } });
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const result = await postAction("/api/billing/subscribe", { period, locale });
    if (result.ok && typeof result.body.url === "string") {
      // Stays busy until the payment page replaces this one.
      window.location.assign(result.body.url);
      return;
    }
    setError(result.ok ? "serviceUnavailable" : result.code);
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        aria-busy={busy}
        className={`w-full ${buttonPrimary}`}
      >
        {busy && <LoaderCircle aria-hidden="true" className="h-5 w-5 motion-safe:animate-spin" />}
        {busy ? tl("redirecting") : t("proCta")}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {te(error)}
        </p>
      )}
    </div>
  );
}
