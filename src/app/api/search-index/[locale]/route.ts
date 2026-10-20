import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { buildSearchIndex } from "@/lib/search/index";

// Static JSON per language, built at deploy time and fetched only when the
// search dialog opens: the catalog never weighs on the first page load.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  const messages = (await import(`../../../../../messages/${locale}.json`)).default;
  return Response.json(buildSearchIndex(locale as Locale, messages));
}
