"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { COUNTRY_COOKIE, pricingRegions, type PricingRegion } from "@/config/pricing";
import { intlLocale } from "@/lib/format";
import type { Locale } from "@/i18n/routing";

/** Lets visitors override the detected country (remembered for a year). */
export default function RegionSelector({ value }: { value: PricingRegion }) {
  const t = useTranslations("Pricing");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const names = new Intl.DisplayNames([intlLocale[locale]], { type: "region" });

  function onChange(region: PricingRegion) {
    document.cookie = `${COUNTRY_COOKIE}=${region}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  const options = pricingRegions
    .map((r) => ({ value: r, label: r === "INTL" ? t("otherCountry") : (names.of(r) ?? r) }))
    .sort((a, b) => (a.value === "INTL" ? 1 : b.value === "INTL" ? -1 : a.label.localeCompare(b.label, locale)));

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">{t("country")}</span>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as PricingRegion)}
        className="h-9 rounded-lg border border-border bg-surface px-2.5 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
