import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Code2, HandCoins, Lightbulb, Mail, ShieldCheck, User, Users } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { card } from "@/components/ui/styles";
import { creditsSlugs } from "@/config/credits";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { jsonLdString } from "@/lib/faq";
import { aboutJsonLd, aboutSections } from "@/lib/about";
import { alternatesFor, siteUrl } from "@/lib/seo";
import { sourceUrl } from "@/lib/source-url";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return {
    title: `${t("title")} — Fileflect`,
    description: t("description"),
    alternates: alternatesFor(locale as Locale, () => "/about"),
  };
}

const linkClass = "font-semibold text-brand underline-offset-4 hover:underline";

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@fileflect.com";
  const source = sourceUrl();
  const base = siteUrl();
  const icons = { who: User, why: Lightbulb, privacy: ShieldCheck, source: Code2, funding: HandCoins, contact: Mail };
  const links: Partial<Record<(typeof aboutSections)[number], ReactNode>> = {
    privacy: (
      <Link href="/privacy" className={linkClass}>
        {t("links.privacy")}
      </Link>
    ),
    source: (
      <span className="flex flex-wrap gap-x-6 gap-y-2">
        {source && (
          <a href={source} rel="noopener noreferrer" className={linkClass}>
            {t("links.source")}
          </a>
        )}
        <Link href={`/${creditsSlugs[locale as Locale]}`} className={linkClass}>
          {t("links.credits")}
        </Link>
      </span>
    ),
    contact: (
      <span className="flex flex-wrap gap-x-6 gap-y-2">
        <a href={`mailto:${email}`} className={linkClass}>
          {email}
        </a>
        <Link href="/contact" className={linkClass}>
          {t("links.contact")}
        </Link>
      </span>
    ),
  };
  const jsonLd = aboutJsonLd({
    base,
    locale: locale as Locale,
    name: t("title"),
    description: t("description"),
    email,
    source,
  });
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <PageHero icon={<Users aria-hidden="true" className="h-7 w-7" />} title={t("title")}>
        <p className="max-w-2xl text-lg text-muted text-pretty">{t("intro")}</p>
      </PageHero>
      {aboutSections.map((id) => {
        const Icon = icons[id];
        const body = t.raw(`sections.${id}.body`) as string[];
        return (
          <section key={id} aria-labelledby={`about-${id}`} className={`flex flex-col gap-3 p-6 sm:p-8 ${card}`}>
            <h2 id={`about-${id}`} className="flex items-center gap-3 text-xl font-bold">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              {t(`sections.${id}.heading`)}
            </h2>
            {body.map((p) => (
              <p key={p} className="leading-relaxed text-muted">
                {p.replace("{email}", email)}
              </p>
            ))}
            {links[id] && <p>{links[id]}</p>}
          </section>
        );
      })}
    </article>
  );
}
