import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LegalPage, { legalMetadata } from "@/components/legal/LegalPage";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return legalMetadata(locale as Locale, "privacy", "/privacy");
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage locale={locale as Locale} doc="privacy" />;
}
