import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import CategoryIcon from "@/components/catalog/CategoryIcon";
import ToolIcon from "@/components/tools/ToolIcon";
import { card } from "@/components/ui/styles";
import { allToolsSlugs, categoryEntries, categorySlug, publishedCategories } from "@/config/categories";
import { popularTools, tools } from "@/config/tools";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * The catalog on the home page: popular tools, then every category with its
 * count. Compact cards (name only) keep it short on phones however many tools
 * there are; the full lists live on the category pages.
 */
export default async function HomeCatalog() {
  const t = await getTranslations("HomePage.catalog");
  const tc = await getTranslations("Catalog");
  const tt = await getTranslations("Tools");
  const locale = (await getLocale()) as Locale;
  const tile = `${card} group flex h-full items-center gap-3 p-3 transition hover:border-brand hover:shadow-lift sm:p-4`;
  const iconBox = "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand sm:h-10 sm:w-10";

  return (
    <div className="flex flex-col gap-12 pt-16 sm:pt-20">
      <section aria-labelledby="popular-tools-heading">
        <h2 id="popular-tools-heading" className="mb-6 text-center text-3xl font-bold">
          {t("popularHeading")}
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {popularTools.map((id) => (
            <li key={id}>
              <Link href={`/${tools[id].slugs[locale]}`} className={tile}>
                <span className={iconBox}>
                  <ToolIcon id={id} className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold leading-snug group-hover:text-brand sm:text-base">{tt(`${id}.title`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="categories-heading">
        <div className="mb-6 text-center">
          <h2 id="categories-heading" className="text-3xl font-bold">
            {t("categoriesHeading")}
          </h2>
          <p className="mt-2 text-muted">{t("categoriesSubtitle")}</p>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {publishedCategories.map((category) => {
            const { tools: list, conversions } = categoryEntries(category);
            return (
              <li key={category}>
                <Link href={`/${categorySlug(category, locale)}`} className={tile}>
                  <span className={iconBox}>
                    <CategoryIcon category={category} className="h-5 w-5" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold leading-snug group-hover:text-brand sm:text-base">
                      {tc(`categories.${category}.name`)}
                    </span>
                    <span className="text-xs text-muted">
                      {list.length > 0 ? tc("toolCount", { count: list.length }) : tc("conversionCount", { count: conversions.length })}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-center">
          <Link
            href={`/${allToolsSlugs[locale]}`}
            className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
          >
            {t("allTools")}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </p>
      </section>
    </div>
  );
}
