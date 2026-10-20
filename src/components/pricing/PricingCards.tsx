"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";
import { limits } from "@/config/limits";
import { prices, yearlySaving, type BillingPeriod, type PricingRegion } from "@/config/pricing";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatBytes, formatCurrency, formatPercent } from "@/lib/format";
import ChoiceGroup from "@/components/tools/ChoiceGroup";
import { buttonSecondary, card } from "@/components/ui/styles";
import SubscribeButton from "./SubscribeButton";

interface Props {
  region: PricingRegion;
  signedIn: boolean;
  isPro: boolean;
  paymentsAvailable: boolean;
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-soft text-success">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function PricingCards({ region, signedIn, isPro, paymentsAvailable }: Props) {
  const t = useTranslations("Pricing");
  const locale = useLocale() as Locale;
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const price = prices[region];
  const size = (bytes: number) => formatBytes(bytes, locale);

  return (
    <div className="flex flex-col items-center gap-8">
      <ChoiceGroup
        legend={t("billingPeriod")}
        hideLegend
        value={period}
        onChange={setPeriod}
        options={[
          { value: "monthly", label: t("monthly") },
          { value: "yearly", label: `${t("yearly")} · ${t("save", { percent: formatPercent(yearlySaving(region), locale) })}` },
        ]}
      />
      <div className="grid w-full items-stretch gap-6 md:grid-cols-2">
        <section className={`flex flex-col gap-5 p-6 sm:p-8 ${card}`}>
          <h2 className="font-display text-xl font-bold">{t("free")}</h2>
          <p className="font-display text-5xl font-extrabold tracking-tight">{formatCurrency(0, price.currency, locale)}</p>
          <ul className="flex flex-1 flex-col gap-3 text-sm">
            <Feature>{t("features.allTools")}</Feature>
            <Feature>{t("features.device")}</Feature>
            <Feature>
              {t("features.serverFree", { size: size(limits.free.serverMaxFileBytes), count: limits.free.serverMaxBatch })}
            </Feature>
          </ul>
          {!isPro && signedIn ? (
            <p className="rounded-xl border border-border px-5 py-3 text-center text-sm font-semibold">{t("current")}</p>
          ) : (
            <Link href="/" className={`w-full py-3 ${buttonSecondary}`}>
              {t("freeCta")}
            </Link>
          )}
        </section>

        <section className="relative flex flex-col gap-5 rounded-2xl border-2 border-brand bg-surface p-6 shadow-lift sm:p-8">
          <span className="absolute -top-3.5 left-6 inline-flex items-center gap-1.5 rounded-full bg-brand-solid px-3 py-1 text-xs font-bold text-white shadow-card sm:left-8">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            {t("recommended")}
          </span>
          <h2 className="font-display text-xl font-bold text-brand">{t("pro")}</h2>
          <p className="flex flex-wrap items-baseline gap-1">
            <span className="font-display text-5xl font-extrabold tracking-tight">
              {formatCurrency(price[period], price.currency, locale)}
            </span>
            <span className="text-muted">{period === "monthly" ? t("perMonth") : t("perYear")}</span>
          </p>
          <ul className="flex flex-1 flex-col gap-3 text-sm">
            <Feature>{t("features.noAds")}</Feature>
            <Feature>
              {t("features.serverPro", { size: size(limits.pro.serverMaxFileBytes), count: limits.pro.serverMaxBatch })}
            </Feature>
            <Feature>{t("features.browserPro", { size: size(limits.pro.browserMaxFileBytes) })}</Feature>
            <Feature>{t("features.allTools")}</Feature>
            <Feature>{t("features.support")}</Feature>
          </ul>
          {isPro ? (
            <p className="rounded-xl bg-brand-soft px-5 py-3 text-center text-sm font-semibold text-brand">{t("current")}</p>
          ) : paymentsAvailable ? (
            <>
              <SubscribeButton period={period} signedIn={signedIn} />
              {price.provider === "mercadopago" && (
                <p className="text-center text-xs text-muted">{t("billedVia", { provider: "Mercado Pago" })}</p>
              )}
            </>
          ) : (
            <p className="rounded-xl bg-brand-soft px-4 py-3 text-center text-sm">{t("intlNote")}</p>
          )}
        </section>
      </div>
    </div>
  );
}
