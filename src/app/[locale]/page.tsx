import { use } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { ArrowRight, ShieldCheck } from "lucide-react";
import WithSidebarAd from "@/components/ads/WithSidebarAd";
import Converter from "@/components/converter/Converter";
import { badge } from "@/components/ui/styles";
import { conversionSlug, popularConversions } from "@/config/conversion-pages";
import { formats } from "@/config/formats";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";

export function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return params.then(({ locale }) => ({ alternates: alternatesFor(locale as Locale, () => "") }));
}

const features = [
  { key: "privacy", icon: "🔒" },
  { key: "speed", icon: "⚡" },
  { key: "free", icon: "🎁" },
  { key: "office", icon: "📄" },
] as const;

const steps = ["drop", "pick", "download"] as const;

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
                    <Link
                      href={`/${conversionSlug(c, locale as Locale)}`}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium shadow-card transition hover:border-brand hover:text-brand"
                    >
                      {tc("linkLabel", { from: formats[c.from].label, to: formats[c.to].label })}
                      <ArrowRight
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </WithSidebarAd>
        </section>
      </section>

      <div className="mx-auto max-w-6xl px-4">
      <section aria-labelledby="steps-heading" className="py-12">
        <h2 id="steps-heading" className="mb-8 text-center text-2xl font-bold">
          {t("steps.heading")}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface shadow-card p-5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-solid text-lg font-bold text-white">
                {i + 1}
              </span>
              <span className="font-medium">{t(`steps.${step}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="features-heading" className="py-12">
        <h2 id="features-heading" className="mb-8 text-center text-2xl font-bold">
          {t("features.heading")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ key, icon }) => (
            <li
              key={key}
              className="rounded-2xl border border-border bg-surface shadow-card p-6"
            >
              <span aria-hidden="true" className="text-3xl">
                {icon}
              </span>
              <h3 className="mt-3 font-semibold">
                {t(`features.${key}.title`)}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {t(`features.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </section>
      </div>
    </div>
  );
}
