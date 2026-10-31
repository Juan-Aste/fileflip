import { getTranslations } from "next-intl/server";
import { BookOpen, CalendarDays, ChevronRight, Clock } from "lucide-react";
import AdSlot from "@/components/ads/AdSlot";
import ToolIcon from "@/components/tools/ToolIcon";
import PageHero from "@/components/ui/PageHero";
import PillLink from "@/components/ui/PillLink";
import { card } from "@/components/ui/styles";
import { tools } from "@/config/tools";
import { guideBodies } from "@/content/guides/bodies";
import { guideById, guidePath, guidesFor, guidesSlugs, type GuideMeta } from "@/content/guides/meta";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { jsonLdString } from "@/lib/faq";
import { formatDate } from "@/lib/format";
import { guideJsonLd } from "@/lib/guides/schema";
import { renderGuide } from "@/lib/guides/render";
import { siteUrl } from "@/lib/seo";

/** Reading time at ~220 words (or ~400 Chinese characters) a minute. */
const readingMinutes = (words: number, locale: Locale) => Math.max(1, Math.round(words / (locale === "zh" ? 400 : 220)));

function Breadcrumbs({ label, items }: { label: string; items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label={label} className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />}
            {item.href ? (
              <Link href={item.href} className="hover:text-brand">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export async function GuidesIndexView({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Guides" });
  const list = guidesFor(locale);
  const base = siteUrl();
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("home"), item: `${base}/${locale}` },
      { "@type": "ListItem", position: 2, name: t("indexTitle"), item: `${base}/${locale}/${guidesSlugs[locale]}` },
    ],
  };
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbLd) }} />
      <Breadcrumbs label={t("breadcrumb")} items={[{ label: t("home"), href: "/" }, { label: t("indexTitle") }]} />
      <PageHero icon={<BookOpen aria-hidden="true" className="h-7 w-7" />} title={t("indexTitle")}>
        <p className="max-w-2xl text-lg text-muted text-pretty">{t("indexIntro")}</p>
      </PageHero>
      <ul className="flex flex-col gap-4">
        {list.map((guide) => {
          const v = guide.versions[locale]!;
          return (
            <li key={guide.id}>
              <Link href={guidePath(guide, locale)!} className={`group flex flex-col gap-2 p-5 transition hover:border-brand ${card}`}>
                <h2 className="text-xl font-bold group-hover:text-brand">{v.title}</h2>
                <p className="text-muted">{v.description}</p>
                <p className="text-sm text-muted">{t("updatedOn", { date: formatDate(guide.updated, locale) })}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export async function GuideArticleView({ guide, locale }: { guide: GuideMeta; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Guides" });
  const tt = await getTranslations({ locale, namespace: "Tools" });
  const version = guide.versions[locale]!;
  const rendered = renderGuide(guideBodies[guide.id]![locale]!, locale);
  const related = guide.related.map(guideById).filter((g): g is GuideMeta => !!g?.versions[locale]);
  const indexPath = `/${guidesSlugs[locale]}`;
  const jsonLd = guideJsonLd({ guide, locale, rendered, base: siteUrl(), names: { home: t("home"), index: t("indexTitle"), author: t("author") } });
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 py-12">
      {jsonLd.map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
      ))}
      <Breadcrumbs label={t("breadcrumb")} items={[{ label: t("home"), href: "/" }, { label: t("indexTitle"), href: indexPath }, { label: version.title }]} />
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{version.title}</h1>
        <p className="text-lg text-muted text-pretty">{version.description}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span>{t("byline", { author: t("author") })}</span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {t("published", { date: formatDate(guide.published, locale) })}
            {guide.updated !== guide.published && ` · ${t("updated", { date: formatDate(guide.updated, locale) })}`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" className="h-4 w-4" />
            {t("readingTime", { minutes: readingMinutes(rendered.words, locale) })}
          </span>
        </p>
      </header>
      {rendered.toc.length > 1 && (
        <nav aria-labelledby="guide-contents" className={`p-5 ${card}`}>
          <h2 id="guide-contents" className="mb-3 text-sm font-semibold text-muted">
            {t("contents")}
          </h2>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
            {rendered.toc.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} className="hover:text-brand">
                  {h.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="guide-body" dangerouslySetInnerHTML={{ __html: rendered.html }} />
      <section aria-labelledby="guide-tools" className="flex flex-col gap-3">
        <h2 id="guide-tools" className="text-2xl font-bold">
          {t("toolsTitle")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {guide.tools.map((id) => (
            <li key={id}>
              <Link href={`/${tools[id].slugs[locale]}`} className={`flex items-center gap-3 p-4 font-semibold transition hover:border-brand hover:text-brand ${card}`}>
                <ToolIcon id={id} className="h-5 w-5 shrink-0 text-brand" />
                {tt(`${id}.title`)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {/* After the whole article, never between its steps. */}
      <AdSlot placement="result" />
      {related.length > 0 && (
        <nav aria-labelledby="guide-related" className="flex flex-col gap-3">
          <h2 id="guide-related" className="text-2xl font-bold">
            {t("relatedTitle")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {related.map((g) => (
              <li key={g.id}>
                <PillLink href={guidePath(g, locale)!}>{g.versions[locale]!.title}</PillLink>
              </li>
            ))}
            <li>
              <PillLink href={indexPath}>{t("allGuides")}</PillLink>
            </li>
          </ul>
        </nav>
      )}
    </article>
  );
}
