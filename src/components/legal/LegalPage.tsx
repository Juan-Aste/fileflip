import { getTranslations } from "next-intl/server";
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
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">{t(`${doc}.title`)}</h1>
        <p className="text-sm text-muted">{t("updated", { date: formatDate(LEGAL_UPDATED, locale) })}</p>
        <p className="text-lg">{t(`${doc}.intro`)}</p>
      </header>
      {sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">{s.heading}</h2>
          <p className="leading-relaxed text-muted">{s.body}</p>
        </section>
      ))}
    </article>
  );
}

export async function legalMetadata(locale: Locale, doc: "privacy" | "terms" | "contact", path: string) {
  const t = await getTranslations({ locale, namespace: "Legal" });
  const { alternatesFor } = await import("@/lib/seo");
  return { title: `${t(`${doc}.title`)} — FileFlip`, alternates: alternatesFor(locale, () => path) };
}
