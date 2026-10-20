import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import WithSidebarAd from "@/components/ads/WithSidebarAd";
import Converter from "@/components/converter/Converter";
import ProcessingBadge from "@/components/converter/ProcessingBadge";
import ToolComponent from "@/components/tools/ToolComponent";
import { Cloud, ShieldCheck } from "lucide-react";
import ToolIcon from "@/components/tools/ToolIcon";
import FaqList from "@/components/ui/FaqList";
import PageHero from "@/components/ui/PageHero";
import PillLink from "@/components/ui/PillLink";
import { card } from "@/components/ui/styles";
import {
  conversionFromSlug,
  conversionPages,
  conversionSlug,
  relatedConversions,
} from "@/config/conversion-pages";
import { formats, type Conversion } from "@/config/formats";
import {
  availableTools,
  toolFromSlug,
  tools,
  type ToolInfo,
} from "@/config/tools";
import {
  longtailFromSlug,
  longtailPages,
  longtailTranslation,
  type LongtailPage,
} from "@/content/longtail";
import { routing, type Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";

type Params = { locale: string; slug: string };

type Page =
  | { kind: "tool"; tool: ToolInfo }
  | { kind: "conversion"; conversion: Conversion }
  | { kind: "longtail"; page: LongtailPage };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => [
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
  const tool = toolFromSlug(locale as Locale, decoded);
  if (tool && availableTools.includes(tool.id)) return { kind: "tool", tool };
  const conversion = conversionFromSlug(locale as Locale, decoded);
  if (conversion) return { kind: "conversion", conversion };
  const page = longtailFromSlug(locale as Locale, decoded);
  return page ? { kind: "longtail", page } : undefined;
}

const slugFor = (page: Exclude<Page, { kind: "longtail" }>, locale: Locale) =>
  page.kind === "tool"
    ? page.tool.slugs[locale]
    : conversionSlug(page.conversion, locale);

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
  return (
    <WithSidebarAd>
      {page.kind === "tool" ? (
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
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-12">
      <PageHero icon={<ToolIcon id={tool.id} className="h-7 w-7" />} title={t("title")}>
        <p className="max-w-xl text-lg text-muted text-pretty">{t("description")}</p>
        <ProcessingBadge engine={tool.engine} />
      </PageHero>
      <ToolComponent id={tool.id} />
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
          <ToolComponent id={widget.tool} />
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
