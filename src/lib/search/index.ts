import { createTranslator } from "next-intl";
import { allToolsSlugs, categorySlug, publishedCategories } from "@/config/categories";
import { conversionPages, conversionSlug } from "@/config/conversion-pages";
import { formats } from "@/config/formats";
import { availableTools, conversionCategory, tools } from "@/config/tools";
import { longtailPages } from "@/content/longtail";
import type { Locale } from "@/i18n/routing";
import type { SearchEntry } from "./match";

type Messages = Parameters<typeof createTranslator>[0]["messages"];

/** Every published page of the catalog in one language, built from the registry. */
export function buildSearchIndex(locale: Locale, messages: Messages): SearchEntry[] {
  const t = createTranslator({ locale, messages });
  const categoryName = (c: Parameters<typeof categorySlug>[0]) => t(`Catalog.categories.${c}.name` as never);
  const label = (f: keyof typeof formats) => `${formats[f].label} ${f.toUpperCase()} ${formats[f].extensions.join(" ")}`;

  const entries: SearchEntry[] = [
    { kind: "category", href: `/${allToolsSlugs[locale]}`, title: t("Catalog.allTitle" as never), keywords: "" },
  ];
  for (const c of publishedCategories) {
    entries.push({
      kind: "category",
      href: `/${categorySlug(c, locale)}`,
      title: categoryName(c),
      description: t(`Catalog.categories.${c}.description` as never),
      keywords: t("Catalog.toolsHeading" as never),
    });
  }
  for (const id of availableTools) {
    const tool = tools[id];
    entries.push({
      kind: "tool",
      href: `/${tool.slugs[locale]}`,
      title: t(`Tools.${id}.title` as never),
      description: t(`Tools.${id}.description` as never),
      keywords: [categoryName(tool.category), ...new Set([...tool.inputs, ...tool.outputs].map(label))].join(" "),
    });
  }
  for (const c of conversionPages) {
    entries.push({
      kind: "conversion",
      href: `/${conversionSlug(c, locale)}`,
      title: t("ConversionPage.linkLabel" as never, { from: formats[c.from].label, to: formats[c.to].label } as never),
      keywords: `${label(c.from)} ${label(c.to)} ${categoryName(conversionCategory(c))}`,
    });
  }
  for (const page of longtailPages.filter((p) => p.locale === locale)) {
    entries.push({ kind: "guide", href: `/${page.slug}`, title: page.title, description: page.metaDescription, keywords: "" });
  }
  return entries;
}
