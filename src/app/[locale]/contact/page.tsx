import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Bug, Mail, ShieldCheck } from "lucide-react";
import { legalMetadata } from "@/components/legal/LegalPage";
import PageHero from "@/components/ui/PageHero";
import { buttonPrimary, card } from "@/components/ui/styles";
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
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12">
      <PageHero icon={<Mail aria-hidden="true" className="h-7 w-7" />} title={t("title")}>
        <p className="text-lg text-muted text-pretty">{t("intro")}</p>
      </PageHero>
      <div className={`flex flex-col items-center gap-4 p-6 text-center sm:p-8 ${card}`}>
        <p className="text-sm font-medium text-muted">{t("emailLabel")}</p>
        {email ? (
          <>
            <p className="font-display text-xl font-bold break-all sm:text-2xl">{email}</p>
            <a href={`mailto:${email}`} className={buttonPrimary}>
              <Mail aria-hidden="true" className="h-5 w-5" />
              {t("write")}
            </a>
          </>
        ) : (
          <p className="text-muted">{t("missing")}</p>
        )}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {[
          { Icon: Bug, text: t("topics") },
          { Icon: ShieldCheck, text: t("privacy") },
        ].map(({ Icon, text }) => (
          <li key={text} className={`flex gap-3 p-5 text-sm text-muted ${card}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
