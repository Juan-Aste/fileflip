import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { legalMetadata } from "@/components/legal/LegalPage";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return legalMetadata(locale as Locale, "contact", "/contact");
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Legal.contact");
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="text-lg">{t("intro")}</p>
      </header>
      <div className="rounded-2xl border border-border bg-surface shadow-card p-6">
        <p className="text-sm font-medium text-muted">{t("emailLabel")}</p>
        {email ? (
          <a href={`mailto:${email}`} className="text-xl font-semibold text-brand hover:underline">
            {email}
          </a>
        ) : (
          <p className="text-muted">{t("missing")}</p>
        )}
      </div>
      <p className="text-muted">{t("topics")}</p>
      <p className="text-muted">{t("privacy")}</p>
    </div>
  );
}
