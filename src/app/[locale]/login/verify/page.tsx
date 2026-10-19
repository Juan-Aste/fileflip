import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });
  return { title: `${t("verifyTitle")} — FileFlip`, robots: { index: false } };
}

export default async function VerifyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Login");
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <span aria-hidden="true" className="text-5xl">
        📬
      </span>
      <h1 className="text-3xl font-extrabold tracking-tight">{t("verifyTitle")}</h1>
      <p className="text-muted">{t("verifyBody")}</p>
    </div>
  );
}
