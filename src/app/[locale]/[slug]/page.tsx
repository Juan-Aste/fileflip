import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import WithSidebarAd from "@/components/ads/WithSidebarAd";
import Converter from "@/components/converter/Converter";
import ProcessingBadge from "@/components/converter/ProcessingBadge";
import ToolComponent from "@/components/tools/ToolComponent";
import FaqList from "@/components/ui/FaqList";
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
import { Link } from "@/i18n/navigation";
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
      title: `${lt.metaTitle} — FileFlip`,
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
      title: `${t("title")} — FileFlip`,
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
    title: `${t("metaTitle", names)} — FileFlip`,
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <span aria-hidden="true" className="text-5xl">
          {tool.icon}
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-muted">{t("description")}</p>
        <ProcessingBadge engine={tool.engine} />
      </header>
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
  const steps = ["step1", "step2", "step3"] as const;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("title", names)}
        </h1>
        <p className="max-w-xl text-muted">{t("description", names)}</p>
      </header>
      <Converter from={conversion.from} to={conversion.to} />

      <section aria-labelledby="how" className="flex flex-col gap-3">
        <h2 id="how" className="text-2xl font-bold">
          {t("howTitle", names)}
        </h2>
        <ol className="list-decimal space-y-1 pl-6">
          {steps.map((s) => (
            <li key={s}>{t(s, names)}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="privacy" className="flex flex-col gap-2">
        <h2 id="privacy" className="text-2xl font-bold">
          {t("privacyTitle")}
        </h2>
        <p className="text-muted">
          {conversion.engine === "browser"
            ? t("privacyBrowser", names)
            : t("privacyServer")}
        </p>
      </section>

      {related.length > 0 && (
        <nav aria-labelledby="related" className="flex flex-col gap-3">
          <h2 id="related" className="text-2xl font-bold">
            {t("relatedTitle")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {related.map((c) => (
              <li key={`${c.from}-${c.to}`}>
                <Link
                  href={`/${conversionSlug(c, locale)}`}
                  className="block rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:border-brand"
                >
                  {t("linkLabel", {
                    from: formats[c.from].label,
                    to: formats[c.to].label,
                  })}
                </Link>
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
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {page.title}
        </h1>
        {page.intro.map((p) => (
          <p key={p} className="text-muted">
            {p}
          </p>
        ))}
      </header>
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
        <section key={section.heading} className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">{section.heading}</h2>
          {section.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}
      <section aria-labelledby="faq" className="flex flex-col gap-3">
        <h2 id="faq" className="text-2xl font-bold">
          {t("faqTitle")}
        </h2>
        <FaqList items={page.faq} locale={page.locale} />
      </section>
    </article>
  );
}
