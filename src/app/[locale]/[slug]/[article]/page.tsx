import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import WithSidebarAd from "@/components/ads/WithSidebarAd";
import { GuideArticleView } from "@/components/guides/GuideViews";
import { guideFromSlug, guidePath, guides, guidesSlugs } from "@/content/guides/meta";
import { locales, type Locale } from "@/i18n/routing";
import { shotSrc, renderGuide } from "@/lib/guides/render";
import { guideBodies } from "@/content/guides/bodies";

// A guide: /es/guias/<slug>, /en/guides/<slug>... (the index is in ../page.tsx).

type Params = { locale: string; slug: string; article: string };

// [slug] has no layout, so its params do not reach this segment. Every call
// returns every guide in every language (with its locale): if one locale
// returned nothing, Next would keep that locale's params without slug/article
// and prerender no guide at all.
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    guides.flatMap((g) => (g.versions[locale] ? [{ locale, slug: guidesSlugs[locale], article: g.versions[locale].slug }] : [])),
  );
}

export const dynamicParams = false;

function resolve({ locale, slug, article }: Params) {
  if (!locales.includes(locale as Locale) || decodeURIComponent(slug) !== guidesSlugs[locale as Locale]) return undefined;
  return guideFromSlug(locale as Locale, decodeURIComponent(article));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = await params;
  const guide = resolve(p);
  if (!guide) return {};
  const locale = p.locale as Locale;
  const version = guide.versions[locale]!;
  const languages = Object.fromEntries(locales.flatMap((l) => (guide.versions[l] ? [[l, `/${l}${guidePath(guide, l)}`]] : [])));
  const { shots } = renderGuide(guideBodies[guide.id]![locale]!, locale);
  return {
    title: `${version.title} — Fileflect`,
    description: version.description,
    alternates: { canonical: `/${locale}${guidePath(guide, locale)}`, languages },
    openGraph: {
      type: "article",
      title: version.title,
      description: version.description,
      publishedTime: guide.published,
      modifiedTime: guide.updated,
      ...(shots[0] ? { images: [shotSrc(shots[0])] } : {}),
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const p = await params;
  const guide = resolve(p);
  if (!guide) notFound();
  setRequestLocale(p.locale);
  return (
    <WithSidebarAd>
      <GuideArticleView guide={guide} locale={p.locale as Locale} />
    </WithSidebarAd>
  );
}
