import { use } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import {
  Download,
  FileText,
  Gift,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  Zap,
} from "lucide-react";
import WithSidebarAd from "@/components/ads/WithSidebarAd";
import Converter from "@/components/converter/Converter";
import FaqList from "@/components/ui/FaqList";
import PillLink from "@/components/ui/PillLink";
import { badge, card } from "@/components/ui/styles";
import { conversionSlug, popularConversions } from "@/config/conversion-pages";
import { formats } from "@/config/formats";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";

export function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return params.then(({ locale }) => ({ alternates: alternatesFor(locale as Locale, () => "") }));
}

const features = [
  { key: "privacy", Icon: Lock },
  { key: "speed", Icon: Zap },
  { key: "free", Icon: Gift },
  { key: "office", Icon: FileText },
] as const;

const steps = [
  { key: "drop", Icon: Upload },
  { key: "pick", Icon: SlidersHorizontal },
  { key: "download", Icon: Download },
] as const;

const faqKeys = ["free", "upload", "formats", "mobile", "batch", "quality"] as const;

export default function HomePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("HomePage");
  const tf = useTranslations("Footer");
  const tc = useTranslations("ConversionPage");

  return (
    <div>
      <section aria-labelledby="hero-heading" className="relative isolate pb-12">
        {/* Soft brand glow behind the hero; purely decorative. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,var(--brand-soft),transparent_70%)]"
        />
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 pt-12 pb-8 text-center sm:pt-16">
          <p className={badge}>
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            {t("badge")}
          </p>
          <h1
            id="hero-heading"
            className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            {t("title")}
          </h1>
          <p className="max-w-2xl text-lg text-muted text-pretty">{t("tagline")}</p>
        </div>

        <section id="converter" aria-label={t("cta")} className="scroll-mt-24">
          <WithSidebarAd>
            <Converter />
            <nav aria-labelledby="popular-heading" className="mt-8">
              <h2 id="popular-heading" className="mb-3 text-center text-sm font-semibold text-muted">
                {tf("headings.conversions")}
              </h2>
              <ul className="flex flex-wrap justify-center gap-2">
                {popularConversions.map((c) => (
                  <li key={`${c.from}-${c.to}`}>
                    <PillLink href={`/${conversionSlug(c, locale as Locale)}`}>
                      {tc("linkLabel", { from: formats[c.from].label, to: formats[c.to].label })}
                    </PillLink>
                  </li>
                ))}
              </ul>
            </nav>
          </WithSidebarAd>
        </section>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <section aria-labelledby="how-heading" className="py-12 sm:py-16">
          <div className="mb-10 text-center">
            <h2 id="how-heading" className="text-3xl font-bold">
              {t("how.heading")}
            </h2>
            <p className="mt-2 text-muted">{t("how.subtitle")}</p>
          </div>
          <div className="relative">
            {/* Dashed line joining the step cards on wide screens; decorative. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-11 right-[16%] left-[16%] hidden border-t-2 border-dashed border-border-strong sm:block"
            />
            <ol className="relative grid gap-4 sm:grid-cols-3 sm:gap-6">
              {steps.map(({ key, Icon }, i) => (
                <li key={key} className={`${card} relative flex flex-col gap-3 p-6`}>
                  <div className="flex items-center gap-3">
                    <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-solid font-display text-lg font-bold text-white ring-4 ring-surface">
                      {i + 1}
                    </span>
                    <Icon aria-hidden="true" className="h-5 w-5 text-accent-strong" />
                  </div>
                  <h3 className="text-lg font-bold">{t(`how.${key}.title`)}</h3>
                  <p className="text-sm text-muted">{t(`how.${key}.body`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="py-12 sm:py-16">
          <h2 id="features-heading" className="mb-10 text-center text-3xl font-bold">
            {t("features.heading")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ key, Icon }) => (
              <li key={key} className={`${card} p-6`}>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-bold">{t(`features.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-muted">{t(`features.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-heading" className="mx-auto max-w-3xl py-12 sm:py-16">
          <h2 id="faq-heading" className="mb-8 text-center text-3xl font-bold">
            {t("faq.heading")}
          </h2>
          <FaqList
            locale={locale}
            items={faqKeys.map((k) => ({ q: t(`faq.items.${k}.q`), a: t(`faq.items.${k}.a`) }))}
          />
        </section>
      </div>
    </div>
  );
}
