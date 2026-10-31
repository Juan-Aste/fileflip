import type { GuideMeta } from "@/content/guides/meta";
import { guidesSlugs } from "@/content/guides/meta";
import type { Locale } from "@/i18n/routing";
import { shotSrc, type RenderedGuide } from "./render";

/** Article (+ HowTo when the guide has numbered steps) and BreadcrumbList structured data. */
export function guideJsonLd({
  guide,
  locale,
  rendered,
  base,
  names,
}: {
  guide: GuideMeta;
  locale: Locale;
  rendered: RenderedGuide;
  base: string;
  names: { home: string; index: string; author: string };
}) {
  const version = guide.versions[locale]!;
  const url = `${base}/${locale}/${guidesSlugs[locale]}/${version.slug}`;
  const image = rendered.shots.length > 0 ? `${base}${shotSrc(rendered.shots[0])}` : undefined;
  const publisher = { "@type": "Organization", name: "Fileflect", url: base, logo: { "@type": "ImageObject", url: `${base}/icon.svg` } };
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: version.title,
    description: version.description,
    inLanguage: locale,
    url,
    mainEntityOfPage: url,
    datePublished: guide.published,
    dateModified: guide.updated,
    author: { "@type": "Organization", name: names.author, url: base },
    publisher,
    ...(image ? { image } : {}),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: names.home, item: `${base}/${locale}` },
      { "@type": "ListItem", position: 2, name: names.index, item: `${base}/${locale}/${guidesSlugs[locale]}` },
      { "@type": "ListItem", position: 3, name: version.title, item: url },
    ],
  };
  const howTo =
    guide.howTo && rendered.steps.length > 1
      ? {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: version.title,
          description: version.description,
          inLanguage: locale,
          ...(image ? { image } : {}),
          step: rendered.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
        }
      : undefined;
  return [article, ...(howTo ? [howTo] : []), breadcrumbs];
}
