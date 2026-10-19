import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ProcessingBadge from "@/components/converter/ProcessingBadge";
import ToolComponent from "@/components/tools/ToolComponent";
import { availableTools, toolFromSlug, tools } from "@/config/tools";
import { routing, type Locale } from "@/i18n/routing";

type Params = { locale: string; slug: string };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    availableTools.map((id) => ({ locale, slug: tools[id].slugs[locale] })),
  );
}

// Only the generated slugs exist; anything else is a 404.
export const dynamicParams = false;

function resolve({ locale, slug }: Params) {
  const tool = toolFromSlug(locale as Locale, decodeURIComponent(slug));
  return tool && availableTools.includes(tool.id) ? tool : undefined;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = await params;
  const tool = resolve(p);
  if (!tool) return {};
  const t = await getTranslations({ locale: p.locale, namespace: `Tools.${tool.id}` });
  return {
    title: `${t("title")} — FileFlip`,
    description: t("description"),
    alternates: {
      canonical: `/${p.locale}/${tool.slugs[p.locale as Locale]}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/${tool.slugs[l]}`])),
    },
  };
}

export default async function ToolPage({ params }: { params: Promise<Params> }) {
  const p = await params;
  const tool = resolve(p);
  if (!tool) notFound();
  setRequestLocale(p.locale);
  const t = await getTranslations({ locale: p.locale, namespace: `Tools.${tool.id}` });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <span aria-hidden="true" className="text-5xl">
          {tool.icon}
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="max-w-xl text-muted">{t("description")}</p>
        <ProcessingBadge engine={tool.engine} />
      </header>
      <ToolComponent id={tool.id} />
    </div>
  );
}
