"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { BillingPeriod } from "@/config/pricing";
import { useRouter } from "@/i18n/navigation";
import { isApiErrorCode, type ApiErrorCode } from "@/lib/api-errors";

/** Starts checkout; anonymous visitors are sent to sign in first. */
export default function SubscribeButton({ period, signedIn }: { period: BillingPeriod; signedIn: boolean }) {
  const t = useTranslations("Pricing");
  const te = useTranslations("ApiErrors");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);

  async function start() {
    if (!signedIn) {
      router.push({ pathname: "/login", query: { callbackUrl: `/${locale}/pricing` } });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, locale }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && typeof body.url === "string") {
        window.location.assign(body.url);
        return;
      }
      setError(isApiErrorCode(body.error) ? body.error : "serviceUnavailable");
    } catch {
      setError("serviceUnavailable");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="w-full rounded-xl bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {t("proCta")}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {te(error)}
        </p>
      )}
    </div>
  );
}
