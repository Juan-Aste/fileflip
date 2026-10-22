import { getLocale, getTranslations } from "next-intl/server";
import CategoryIcon from "@/components/catalog/CategoryIcon";
import ProcessingBadge from "@/components/converter/ProcessingBadge";
import ToolIcon from "@/components/tools/ToolIcon";
import PageHero from "@/components/ui/PageHero";
import PillLink from "@/components/ui/PillLink";
import { card } from "@/components/ui/styles";
import { allToolsSlugs, categoryEntries, categorySlug, publishedCategories } from "@/config/categories";
import { conversionSlug } from "@/config/conversion-pages";
import { formats, type Conversion, type FormatId } from "@/config/formats";
import type { ToolCategory, ToolInfo } from "@/config/tools";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** Links to every category page; the current one is marked. */
async function CategoryNav({ current }: { current?: ToolCategory }) {
  const t = await getTranslations("Catalog");
  const locale = (await getLocale()) as Locale;
  const pill =
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition";
  return (
    <nav aria-label={t("categoriesNav")}>
      <ul className="flex flex-wrap justify-center gap-2">
        <li>
          <Link
            href={`/${allToolsSlugs[locale]}`}
            aria-current={current ? undefined : "page"}
            className={`${pill} ${current ? "border-border bg-surface hover:border-brand hover:text-brand" : "border-brand-solid bg-brand-solid text-white"}`}
          >
            {t("allTitle")}
          </Link>
        </li>
        {publishedCategories.map((c) => (
          <li key={c}>
            <Link
              href={`/${categorySlug(c, locale)}`}
              aria-current={c === current ? "page" : undefined}
              className={`${pill} ${c === current ? "border-brand-solid bg-brand-solid text-white" : "border-border bg-surface hover:border-brand hover:text-brand"}`}
            >
              <CategoryIcon category={c} className="h-4 w-4" />
              {t(`categories.${c}.name`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

async function ToolCards({ items }: { items: ToolInfo[] }) {
  const tt = await getTranslations("Tools");
  const locale = (await getLocale()) as Locale;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((tool) => (
        <li key={tool.id}>
          <Link
            href={`/${tool.slugs[locale]}`}
            className={`${card} group flex h-full gap-4 p-5 transition hover:border-brand hover:shadow-lift`}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <ToolIcon id={tool.id} className="h-5 w-5" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-display font-bold group-hover:text-brand">{tt(`${tool.id}.title`)}</span>
              <span className="text-sm text-muted">{tt(`${tool.id}.description`)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Conversion pages grouped by input format. */
async function ConversionGroups({ conversions }: { conversions: Conversion[] }) {
  const t = await getTranslations("Catalog");
  const tc = await getTranslations("ConversionPage");
  const locale = (await getLocale()) as Locale;
  const pills = (list: Conversion[]) => (
    <ul className="flex flex-wrap gap-2">
      {list.map((c) => (
        <li key={`${c.from}-${c.to}`}>
          <PillLink href={`/${conversionSlug(c, locale)}`}>
            {tc("linkLabel", { from: formats[c.from].label, to: formats[c.to].label })}
          </PillLink>
        </li>
      ))}
    </ul>
  );
  // Short lists read better without per-format headings.
  if (conversions.length <= 16) return pills(conversions);
  const groups = new Map<FormatId, Conversion[]>();
  for (const c of conversions) groups.set(c.from, [...(groups.get(c.from) ?? []), c]);
  return (
    <div className="flex flex-col gap-5">
      {[...groups].map(([from, list]) => (
        <section key={from} aria-labelledby={`from-${from}`} className="flex flex-col gap-2">
          <h3 id={`from-${from}`} className="text-sm font-semibold text-muted">
            {t("conversionsFrom", { format: formats[from].label })}
          </h3>
          {pills(list)}
        </section>
      ))}
    </div>
  );
}

export async function CategoryView({ category }: { category: ToolCategory }) {
  const t = await getTranslations("Catalog");
  const { tools, conversions } = categoryEntries(category);
  const engines = new Set([...tools.map((x) => x.engine), ...conversions.map((c) => c.engine)]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 py-12">
      <PageHero
        icon={<CategoryIcon category={category} className="h-7 w-7" />}
        title={t("categoryTitle", { category: t(`categories.${category}.name`) })}
      >
        <p className="max-w-xl text-lg text-muted text-pretty">{t(`categories.${category}.description`)}</p>
        {engines.size === 1 && <ProcessingBadge engine={[...engines][0]} />}
      </PageHero>
      <CategoryNav current={category} />
      {tools.length > 0 && (
        <section aria-labelledby="tools-heading" className="flex flex-col gap-4">
          <h2 id="tools-heading" className="text-2xl font-bold">
            {t("toolsHeading")}
          </h2>
          <ToolCards items={tools} />
        </section>
      )}
      {conversions.length > 0 && (
        <section aria-labelledby="conversions-heading" className="flex flex-col gap-4">
          <h2 id="conversions-heading" className="text-2xl font-bold">
            {t("conversionsHeading")}
          </h2>
          <ConversionGroups conversions={conversions} />
        </section>
      )}
    </div>
  );
}

export async function AllToolsView() {
  const t = await getTranslations("Catalog");
  const locale = (await getLocale()) as Locale;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 py-12">
      <PageHero title={t("allTitle")}>
        <p className="max-w-xl text-lg text-muted text-pretty">{t("allDescription")}</p>
      </PageHero>
      <CategoryNav />
      {publishedCategories.map((category) => {
        const { tools, conversions } = categoryEntries(category);
        const name = t(`categories.${category}.name`);
        return (
          <section key={category} aria-labelledby={`cat-${category}`} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`cat-${category}`} className="flex items-center gap-2 text-2xl font-bold">
                <CategoryIcon category={category} className="h-6 w-6 text-brand" />
                {name}
              </h2>
              <span className="text-sm text-muted">
                {[
                  tools.length > 0 && t("toolCount", { count: tools.length }),
                  conversions.length > 0 && t("conversionCount", { count: conversions.length }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            {tools.length > 0 && <ToolCards items={tools} />}
            <div>
              <PillLink href={`/${categorySlug(category, locale)}`}>{t("seeCategory", { category: name })}</PillLink>
            </div>
          </section>
        );
      })}
    </div>
  );
}
