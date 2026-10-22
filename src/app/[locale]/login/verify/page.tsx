import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MailCheck } from "lucide-react";
import PageHero from "@/components/ui/PageHero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });
  return { title: `${t("verifyTitle")} — Fileflect`, robots: { index: false } };
}

export default async function VerifyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Login");
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <PageHero icon={<MailCheck aria-hidden="true" className="h-7 w-7" />} title={t("verifyTitle")}>
        <p className="text-lg text-muted">{t("verifyBody")}</p>
      </PageHero>
    </div>
  );
}
