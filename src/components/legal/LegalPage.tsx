import { getTranslations } from "next-intl/server";
import { CalendarDays, FileText, ShieldCheck } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { badge, card } from "@/components/ui/styles";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";

/** Date shown on the legal pages; bump it when their text changes. */
export const LEGAL_UPDATED = "2026-10-19";

interface Section {
  heading: string;
  body: string;
}

export default async function LegalPage({ locale, doc }: { locale: Locale; doc: "privacy" | "terms" }) {
  const t = await getTranslations({ locale, namespace: "Legal" });
  const sections = t.raw(`${doc}.sections`) as Section[];
  const Icon = doc === "privacy" ? ShieldCheck : FileText;
  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12">
      <PageHero icon={<Icon aria-hidden="true" className="h-7 w-7" />} title={t(`${doc}.title`)}>
        <p className={badge}>
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          {t("updated", { date: formatDate(LEGAL_UPDATED, locale) })}
        </p>
        <p className="max-w-2xl text-lg text-muted text-pretty">{t(`${doc}.intro`)}</p>
      </PageHero>
      <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:items-start">
        <nav aria-labelledby="legal-contents" className={`p-5 lg:sticky lg:top-24 ${card}`}>
          <h2 id="legal-contents" className="mb-3 text-sm font-semibold text-muted">
            {t("contents")}
          </h2>
          <ol className="flex flex-col gap-2 text-sm">
            {sections.map((s, i) => (
              <li key={s.heading}>
                <a href={`#section-${i + 1}`} className="flex gap-2 hover:text-brand">
                  <span className="w-5 shrink-0 font-semibold text-brand tabular-nums">{i + 1}.</span>
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className={`flex flex-col divide-y divide-border px-6 sm:px-8 ${card}`}>
          {sections.map((s, i) => (
            <section key={s.heading} id={`section-${i + 1}`} className="flex scroll-mt-24 flex-col gap-2 py-6">
              <h2 className="flex gap-3 text-xl font-bold">
                <span className="text-brand tabular-nums">{i + 1}.</span>
                {s.heading}
              </h2>
              <p className="max-w-prose leading-relaxed text-muted">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

export async function legalMetadata(locale: Locale, doc: "privacy" | "terms" | "contact", path: string) {
  const t = await getTranslations({ locale, namespace: "Legal" });
  const { alternatesFor } = await import("@/lib/seo");
  return { title: `${t(`${doc}.title`)} — Fileflect`, alternates: alternatesFor(locale, () => path) };
}
