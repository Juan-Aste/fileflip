import { getTranslations } from "next-intl/server";
import { CalendarDays, FileText, ShieldCheck } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { badge, card } from "@/components/ui/styles";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { LEGAL_UPDATED } from "@/config/legal";
import { proEnabled } from "@/lib/pro";

type Row = { data: string; purpose: string; basis: string; retention: string };

/**
 * One section of the Terms or the Privacy policy (messages: Legal.*.sections).
 * `pro*` parts only show with the Pro plan on, `free` only with it off.
 */
interface Section {
  heading: string;
  body: string[];
  items?: string[];
  proItems?: string[];
  rows?: Row[];
  proRows?: Row[];
  after?: string[];
  free?: string[];
  pro?: string[];
  /** The notice Argentina's data protection agency (AAIP) requires, word for word. */
  legend?: { label: string; text: string; originalLabel: string };
}

/** Terms: the Pro sections (or the free-service one) go after this many common sections. */
const TERMS_PLAN_AFTER = 8;

/** The sections to publish, according to the Pro switch. */
export function legalSections(raw: Record<string, unknown>, doc: "privacy" | "terms", pro: boolean): Section[] {
  const resolve = ({ proItems, proRows, pro: proText, free, ...s }: Section): Section => ({
    ...s,
    items: [...(s.items ?? []), ...(pro ? (proItems ?? []) : [])],
    rows: [...(s.rows ?? []), ...(pro ? (proRows ?? []) : [])],
    after: [...(s.after ?? []), ...((pro ? proText : free) ?? [])],
  });
  const sections = raw.sections as Section[];
  const all =
    doc === "privacy"
      ? sections
      : [
          ...sections.slice(0, TERMS_PLAN_AFTER),
          ...(pro ? (raw.proSections as Section[]) : [raw.freeService as Section]),
          ...sections.slice(TERMS_PLAN_AFTER),
        ];
  return all.map(resolve);
}

export default async function LegalPage({ locale, doc }: { locale: Locale; doc: "privacy" | "terms" }) {
  const t = await getTranslations({ locale, namespace: "Legal" });
  const sections = legalSections(t.raw(doc) as Record<string, unknown>, doc, proEnabled());
  const columns = doc === "privacy" ? (t.raw("privacy.columns") as Row) : null;
  // The AAIP notice is mandatory in Spanish: other languages also show the original.
  const tes = locale === "es" ? null : await getTranslations({ locale: "es", namespace: "Legal" });
  const original = tes
    ? legalSections(tes.raw("privacy") as Record<string, unknown>, "privacy", false).find((s) => s.legend)?.legend
    : undefined;
  const Icon = doc === "privacy" ? ShieldCheck : FileText;
  const paragraph = "max-w-prose leading-relaxed text-muted";
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
        <div className={`flex min-w-0 flex-col divide-y divide-border px-6 [overflow-wrap:anywhere] sm:px-8 ${card}`}>
          {sections.map((s, i) => (
            <section key={s.heading} id={`section-${i + 1}`} className="flex scroll-mt-24 flex-col gap-3 py-6">
              <h2 className="flex gap-3 text-xl font-bold">
                <span className="text-brand tabular-nums">{i + 1}.</span>
                {s.heading}
              </h2>
              {s.body.map((text) => (
                <p key={text} className={paragraph}>
                  {text}
                </p>
              ))}
              {s.items!.length > 0 && (
                <ul className="flex max-w-prose list-disc flex-col gap-1.5 pl-5 leading-relaxed text-muted">
                  {s.items!.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              )}
              {columns && s.rows!.length > 0 && (
                <div className="flex flex-col gap-3">
                  {s.rows!.map((row) => (
                    <dl
                      key={row.data}
                      className="grid gap-x-4 gap-y-1 rounded-xl bg-surface-2 px-4 py-3 text-sm sm:grid-cols-[8rem_1fr]"
                    >
                      {(["data", "purpose", "basis", "retention"] as const).map((key) => (
                        <div key={key} className="contents">
                          <dt className="font-semibold">{columns[key]}</dt>
                          <dd className="text-muted">{row[key]}</dd>
                        </div>
                      ))}
                    </dl>
                  ))}
                </div>
              )}
              {s.after!.map((text) => (
                <p key={text} className={paragraph}>
                  {text}
                </p>
              ))}
              {s.legend && (
                <figure className="flex max-w-prose flex-col gap-2 rounded-xl border border-border px-4 py-3 text-sm">
                  <figcaption className="font-semibold">{s.legend.label}</figcaption>
                  <blockquote className="leading-relaxed text-muted">{s.legend.text}</blockquote>
                  {original && (
                    <>
                      <p className="font-semibold">{s.legend.originalLabel}</p>
                      <blockquote lang="es" className="leading-relaxed text-muted">
                        {original.text}
                      </blockquote>
                    </>
                  )}
                </figure>
              )}
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
