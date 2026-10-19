import { use } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Converter from "@/components/converter/Converter";

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

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="flex flex-col items-center gap-6 py-16 text-center sm:py-24">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-sm font-medium text-brand">
          <span aria-hidden="true">🔒</span>
          {t("badge")}
        </p>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-lg text-muted text-pretty">
          {t("tagline")}
        </p>
        <a
          href="#converter"
          className="rounded-xl bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {t("cta")}
        </a>
      </section>

      <section id="converter" aria-label={t("cta")} className="scroll-mt-24">
        <Converter />
      </section>

      <section aria-labelledby="steps-heading" className="py-12">
        <h2 id="steps-heading" className="mb-8 text-center text-2xl font-bold">
          {t("steps.heading")}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-lg font-bold text-white">
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
              className="rounded-2xl border border-border bg-surface p-6"
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
  );
}
