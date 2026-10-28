import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import WithSidebarAd from "@/components/ads/WithSidebarAd";
import { AllToolsView, CategoryView } from "@/components/catalog/CatalogViews";
import Converter from "@/components/converter/Converter";
import ProcessingBadge from "@/components/converter/ProcessingBadge";
import CreditsPage from "@/components/legal/CreditsPage";
import { GuidesIndexView } from "@/components/guides/GuideViews";
import ToolBlock from "@/components/tools/ToolBlock";
import { Cloud, ShieldCheck } from "lucide-react";
import ToolIcon from "@/components/tools/ToolIcon";
import FaqList from "@/components/ui/FaqList";
import PageHero from "@/components/ui/PageHero";
import PillLink from "@/components/ui/PillLink";
import { card } from "@/components/ui/styles";
import {
  allToolsSlugs,
  categoryFromSlug,
  categorySlug,
  publishedCategories,
} from "@/config/categories";
import {
  conversionFromSlug,
  conversionPages,
  conversionSlug,
  relatedConversions,
} from "@/config/conversion-pages";
import { creditsSlugs } from "@/config/credits";
import { formats, type Conversion } from "@/config/formats";
import {
  availableTools,
  relatedTools,
  toolsForConversion,
  toolFromSlug,
  tools,
  type ToolCategory,
  type ToolInfo,
} from "@/config/tools";
import {
  longtailFromSlug,
  longtailPages,
  longtailTranslation,
  type LongtailPage,
} from "@/content/longtail";
import { guideLocales, guidesSlugs } from "@/content/guides/meta";
import { routing, type Locale } from "@/i18n/routing";
import { limits } from "@/config/limits";
import { jsonLdString } from "@/lib/faq";
import { proEnabled } from "@/lib/pro";
import { formatBytes } from "@/lib/format";
import { alternatesFor, siteUrl, softwareApplicationJsonLd } from "@/lib/seo";

type Params = { locale: string; slug: string };

type Page =
  | { kind: "all" }
  | { kind: "credits" }
  | { kind: "guides" }
  | { kind: "category"; category: ToolCategory }
  | { kind: "tool"; tool: ToolInfo }
  | { kind: "conversion"; conversion: Conversion }
  | { kind: "longtail"; page: LongtailPage };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => [
    { locale, slug: allToolsSlugs[locale] },
    { locale, slug: creditsSlugs[locale] },
    ...(guideLocales.includes(locale) ? [{ locale, slug: guidesSlugs[locale] }] : []),
    ...publishedCategories.map((c) => ({ locale, slug: categorySlug(c, locale) })),
    ...availableTools.map((id) => ({ locale, slug: tools[id].slugs[locale] })),
    ...conversionPages.map((c) => ({
      locale,
      slug: conversionSlug(c, locale),
    })),
    ...longtailPages
      .filter((page) => page.locale === locale)
      .map((page) => ({ locale, slug: page.slug })),
  ]);
}

// Only the generated slugs exist; anything else is a 404.
export const dynamicParams = false;

function resolve({ locale, slug }: Params): Page | undefined {
  const decoded = decodeURIComponent(slug);
  if (decoded === allToolsSlugs[locale as Locale]) return { kind: "all" };
  if (decoded === creditsSlugs[locale as Locale]) return { kind: "credits" };
  if (decoded === guidesSlugs[locale as Locale] && guideLocales.includes(locale as Locale)) return { kind: "guides" };
  const category = categoryFromSlug(locale as Locale, decoded);
  if (category) return { kind: "category", category };
  const tool = toolFromSlug(locale as Locale, decoded);
  if (tool && availableTools.includes(tool.id)) return { kind: "tool", tool };
  const conversion = conversionFromSlug(locale as Locale, decoded);
  if (conversion) return { kind: "conversion", conversion };
  const page = longtailFromSlug(locale as Locale, decoded);
  return page ? { kind: "longtail", page } : undefined;
}

function slugFor(page: Exclude<Page, { kind: "longtail" }>, locale: Locale): string {
  switch (page.kind) {
    case "all":
      return allToolsSlugs[locale];
    case "credits":
      return creditsSlugs[locale];
    case "guides":
      return guidesSlugs[locale];
    case "category":
      return categorySlug(page.category, locale);
    case "tool":
      return page.tool.slugs[locale];
    case "conversion":
      return conversionSlug(page.conversion, locale);
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const p = await params;
  const page = resolve(p);
  if (!page) return {};
  if (page.kind === "longtail") {
    const lt = page.page;
    const versions = routing.locales.flatMap((l) => {
      const t = longtailTranslation(lt, l);
      return t ? [[l, `/${l}/${t.slug}`] as const] : [];
    });
    return {
      title: `${lt.metaTitle} — Fileflect`,
      description: lt.metaDescription,
      alternates: {
        canonical: `/${lt.locale}/${lt.slug}`,
        languages: Object.fromEntries(versions),
      },
    };
  }
  const alternates = alternatesFor(
    p.locale as Locale,
    (l) => `/${slugFor(page, l)}`,
  );
  if (page.kind === "guides") {
    const t = await getTranslations({ locale: p.locale, namespace: "Guides" });
    // Only the languages that have guides.
    const languages = Object.fromEntries(guideLocales.map((l) => [l, `/${l}/${guidesSlugs[l]}`]));
    return {
      title: `${t("indexMetaTitle")} — Fileflect`,
      description: t("indexIntro"),
      alternates: { canonical: `/${p.locale}/${guidesSlugs[p.locale as Locale]}`, languages },
    };
  }
  if (page.kind === "credits") {
    const t = await getTranslations({ locale: p.locale, namespace: "Credits" });
    return { title: `${t("metaTitle")} — Fileflect`, description: t("metaDescription"), alternates };
  }
  if (page.kind === "all" || page.kind === "category") {
    const t = await getTranslations({ locale: p.locale, namespace: "Catalog" });
    if (page.kind === "all") {
      return { title: `${t("allTitle")} — Fileflect`, description: t("allDescription"), alternates };
    }
    const name = t(`categories.${page.category}.name`);
    return {
      title: `${t("categoryTitle", { category: name })} — Fileflect`,
      description: t(`categories.${page.category}.description`),
      alternates,
    };
  }
  if (page.kind === "tool") {
    const t = await getTranslations({
      locale: p.locale,
      namespace: `Tools.${page.tool.id}`,
    });
    return {
      title: `${t("title")} — Fileflect`,
      description: t("description"),
      alternates,
    };
  }
  const t = await getTranslations({
    locale: p.locale,
    namespace: "ConversionPage",
  });
  const names = {
    from: formats[page.conversion.from].label,
    to: formats[page.conversion.to].label,
  };
  return {
    title: `${t("metaTitle", names)} — Fileflect`,
    description: t("description", names),
    alternates,
  };
}

export default async function SlugPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const p = await params;
  const page = resolve(p);
  if (!page) notFound();
  setRequestLocale(p.locale);
  // Like the legal pages, the credits page carries no ads.
  if (page.kind === "credits") return <CreditsPage locale={p.locale as Locale} />;
  return (
    <WithSidebarAd>
      {page.kind === "guides" ? (
        <GuidesIndexView locale={p.locale as Locale} />
      ) : page.kind === "all" ? (
        <AllToolsView />
      ) : page.kind === "category" ? (
        <CategoryView category={page.category} />
      ) : page.kind === "tool" ? (
        <ToolView tool={page.tool} />
      ) : page.kind === "conversion" ? (
        <ConversionView conversion={page.conversion} />
      ) : (
        <LongtailView page={page.page} />
      )}
    </WithSidebarAd>
  );
}

async function ToolView({ tool }: { tool: ToolInfo }) {
  const t = await getTranslations(`Tools.${tool.id}`);
  const tp = await getTranslations("ToolPage");
  const tcat = await getTranslations("Catalog");
  const locale = (await getLocale()) as Locale;
  const tt = await getTranslations("Tools");
  // Questions are numbered q1/a1, q2/a2... in the messages (at least 3 per tool).
  // An answer that mentions Pro has an aNNoPro version for while Pro is off.
  const pro = proEnabled();
  const answer = (n: number) => (!pro && t.has(`faq.a${n}NoPro`) ? t(`faq.a${n}NoPro`) : t(`faq.a${n}`));
  const faq = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter((n) => t.has(`faq.q${n}`))
    .map((n) => ({ q: t(`faq.q${n}`), a: answer(n) }));
  const related = relatedTools(tool.id);
  const size = (bytes: number) => formatBytes(bytes, locale);
  // The same caps ToolShell enforces: the plan's, or the tool's own when lower.
  const onServer = tool.engine === "server";
  const fileCap = (plan: keyof typeof limits) =>
    Math.min(tool.limits.maxFileBytes ?? Infinity, onServer ? limits[plan].serverMaxFileBytes : limits[plan].browserMaxFileBytes);
  const batch = (plan: keyof typeof limits) => (onServer ? limits[plan].serverMaxBatch : limits[plan].browserMaxBatch);
  const fileLimits =
    tool.limits.files === "none"
      ? []
      : [
          tool.limits.files === "single"
            ? tp("limitSingle", { size: size(fileCap("free")) })
            : tp("limitMultiple", { count: batch("free"), size: size(fileCap("free")) }),
          ...(!pro
            ? []
            : fileCap("pro") > fileCap("free")
              ? [tp("limitPro", { size: size(fileCap("pro")), count: batch("pro") })]
              : [tp("limitProBatch", { count: batch("pro") })]),
        ];
  const limitItems = [
    ...fileLimits,
    tp("limitTime", { minutes: Math.round(tool.limits.timeoutMs / 60_000) }),
    tool.engine === "browser" ? tp("limitBrowser") : tp("limitServer"),
  ];
  const jsonLd = softwareApplicationJsonLd({
    name: t("title"),
    description: t("description"),
    url: `${siteUrl()}/${locale}/${tool.slugs[locale]}`,
    locale,
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <div className="flex flex-col gap-8">
        <PageHero icon={<ToolIcon id={tool.id} className="h-7 w-7" />} title={t("title")}>
          <p className="max-w-xl text-lg text-muted text-pretty">{t("description")}</p>
          <ProcessingBadge engine={tool.engine} />
        </PageHero>
        <ToolBlock id={tool.id} />
      </div>

      <section aria-labelledby="about" className="flex flex-col gap-3">
        <h2 id="about" className="text-2xl font-bold">
          {tp("aboutTitle", { tool: t("title") })}
        </h2>
        <p className="leading-relaxed text-foreground/85">{t("about")}</p>
      </section>

      <section aria-labelledby="limits" className={`${card} flex flex-col gap-3 p-6`}>
        <h2 id="limits" className="text-xl font-bold">
          {tp("limitsTitle")}
        </h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-foreground/85">
          {limitItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq" className="flex flex-col gap-4">
        <h2 id="faq" className="text-2xl font-bold">
          {tp("faqTitle")}
        </h2>
        <FaqList items={faq} locale={locale} />
      </section>

      <nav aria-labelledby="related" className="flex flex-col gap-4">
        <h2 id="related" className="text-2xl font-bold">
          {tp("relatedTitle")}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {related.map((other) => (
            <li key={other.id}>
              <PillLink href={`/${other.slugs[locale]}`}>{tt(`${other.id}.title`)}</PillLink>
            </li>
          ))}
          <li>
            <PillLink href={`/${categorySlug(tool.category, locale)}`}>
              {tcat("seeCategory", { category: tcat(`categories.${tool.category}.name`) })}
            </PillLink>
          </li>
        </ul>
      </nav>
    </div>
  );
}

async function ConversionView({ conversion }: { conversion: Conversion }) {
  const t = await getTranslations("ConversionPage");
  const locale = (await getLocale()) as Locale;
  const names = {
    from: formats[conversion.from].label,
    to: formats[conversion.to].label,
  };
  const related = relatedConversions(conversion);
  const nextTools = toolsForConversion(conversion);
  const tt = await getTranslations("Tools");
  // Server (document) conversions have no quality or size options.
  const steps = ["step1", conversion.engine === "browser" ? "step2" : "step2Document", "step3"] as const;
  const PrivacyIcon = conversion.engine === "browser" ? ShieldCheck : Cloud;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 py-12">
      <PageHero title={t("title", names)}>
        <p className="max-w-xl text-lg text-muted text-pretty">{t("description", names)}</p>
      </PageHero>
      <Converter from={conversion.from} to={conversion.to} />

      <section aria-labelledby="how" className="flex flex-col gap-5">
        <h2 id="how" className="text-2xl font-bold">
          {t("howTitle", names)}
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s} className={`${card} flex flex-col gap-3 p-5`}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-solid font-display font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm">{t(s, names)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="privacy"
        className="flex flex-col gap-4 rounded-2xl border border-brand/20 bg-brand-soft p-6 sm:flex-row sm:items-start"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-brand shadow-card">
          <PrivacyIcon aria-hidden="true" className="h-6 w-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="privacy" className="text-xl font-bold">
            {t("privacyTitle")}
          </h2>
          <p className="text-foreground/80">
            {conversion.engine === "browser"
              ? t("privacyBrowser", names)
              : t("privacyServer")}
          </p>
        </div>
      </section>

      {nextTools.length > 0 && (
        <nav aria-labelledby="next-tools" className="flex flex-col gap-4">
          <h2 id="next-tools" className="text-2xl font-bold">
            {t("toolsTitle", names)}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {nextTools.map((tool) => (
              <li key={tool.id}>
                <PillLink href={`/${tool.slugs[locale]}`}>{tt(`${tool.id}.title`)}</PillLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {related.length > 0 && (
        <nav aria-labelledby="related" className="flex flex-col gap-4">
          <h2 id="related" className="text-2xl font-bold">
            {t("relatedTitle")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {related.map((c) => (
              <li key={`${c.from}-${c.to}`}>
                <PillLink href={`/${conversionSlug(c, locale)}`}>
                  {t("linkLabel", {
                    from: formats[c.from].label,
                    to: formats[c.to].label,
                  })}
                </PillLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

async function LongtailView({ page }: { page: LongtailPage }) {
  const t = await getTranslations("Longtail");
  const { widget } = page;
  const [lead, ...intro] = page.intro;
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10 py-12">
      <PageHero title={page.title}>
        {lead && <p className="max-w-2xl text-lg text-muted text-pretty">{lead}</p>}
      </PageHero>
      {intro.length > 0 && (
        <div className="flex flex-col gap-3 leading-relaxed text-foreground/85">
          {intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
      {widget.kind === "converter" ? (
        <Converter from={widget.from} to={widget.to} options={widget.options} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <ProcessingBadge engine={tools[widget.tool].engine} />
          </div>
          <ToolBlock id={widget.tool} />
        </div>
      )}
      {page.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold">{section.heading}</h2>
          {section.body.map((p) => (
            <p key={p} className="leading-relaxed text-foreground/85">
              {p}
            </p>
          ))}
        </section>
      ))}
      <section aria-labelledby="faq" className="flex flex-col gap-4">
        <h2 id="faq" className="text-2xl font-bold">
          {t("faqTitle")}
        </h2>
        <FaqList items={page.faq} locale={page.locale} />
      </section>
    </article>
  );
}
