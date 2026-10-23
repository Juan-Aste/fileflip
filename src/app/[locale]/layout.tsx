import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";
import VisitBeacon from "@/components/analytics/VisitBeacon";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { SessionInfoProvider } from "@/components/session/SessionInfo";
import { themeInitScript } from "@/components/layout/theme";
import { bodyFont, headingFont } from "@/app/fonts";
import "./globals.css";

type Props = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    metadataBase: new URL(siteUrl()),
    title: t("title"),
    description: t("description"),
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Enables static rendering for this locale.
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Common" });

  return (
    // The theme script toggles the `dark` class before hydration.
    <html
      lang={locale}
      className={`${bodyFont.variable} ${headingFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <NextIntlClientProvider>
          <SessionInfoProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-solid focus:px-4 focus:py-2 focus:text-white"
          >
            {t("skipToContent")}
          </a>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <VisitBeacon />
          </SessionInfoProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
