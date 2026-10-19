import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import WithSidebarAd from "@/components/ads/WithSidebarAd";
import Converter from "@/components/converter/Converter";
import ProcessingBadge from "@/components/converter/ProcessingBadge";
import ToolComponent from "@/components/tools/ToolComponent";
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
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";

type Params = { locale: string; slug: string };

type Page =
  | { kind: "tool"; tool: ToolInfo }
  | { kind: "conversion"; conversion: Conversion };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => [
    ...availableTools.map((id) => ({ locale, slug: tools[id].slugs[locale] })),
    ...conversionPages.map((c) => ({
      locale,
      slug: conversionSlug(c, locale),
    })),
  ]);
}

// Only the generated slugs exist; anything else is a 404.
export const dynamicParams = false;

function resolve({ locale, slug }: Params): Page | undefined {
  const decoded = decodeURIComponent(slug);
  const tool = toolFromSlug(locale as Locale, decoded);
  if (tool && availableTools.includes(tool.id)) return { kind: "tool", tool };
  const conversion = conversionFromSlug(locale as Locale, decoded);
  return conversion ? { kind: "conversion", conversion } : undefined;
}

const slugFor = (page: Page, locale: Locale) =>
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
      ) : (
        <ConversionView conversion={page.conversion} />
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
