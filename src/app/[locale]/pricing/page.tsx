import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck } from "lucide-react";
import { auth } from "@/auth";
import PricingCards from "@/components/pricing/PricingCards";
import RegionSelector from "@/components/pricing/RegionSelector";
import FaqList from "@/components/ui/FaqList";
import PageHero from "@/components/ui/PageHero";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { planForUser } from "@/lib/billing";
import { proEnabled } from "@/lib/pro";
import { providerForRegion } from "@/lib/payments/providers";
import { currentRegion } from "@/lib/server/region";

// Prices depend on the visitor's country.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!proEnabled()) return {};
  const t = await getTranslations({ locale, namespace: "Pricing" });
  return {
    title: `${t("title")} — Fileflect Pro`,
    description: t("subtitle"),
    alternates: alternatesFor(locale as Locale, () => "/pricing"),
  };
}

function paymentsAvailable(region: Awaited<ReturnType<typeof currentRegion>>) {
  try {
    providerForRegion(region);
    return true;
  } catch {
    return false;
  }
}

const faq = ["1", "2", "3"] as const;

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  // Hidden until the owner can bill (PRO_ENABLED).
  if (!proEnabled()) notFound();
  setRequestLocale(locale);
  const [t, region, session] = await Promise.all([getTranslations("Pricing"), currentRegion(), auth()]);
  const isPro = (await planForUser(session?.user?.id)) === "pro";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-12">
      <PageHero icon={<BadgeCheck aria-hidden="true" className="h-7 w-7" />} title={t("title")}>
        <p className="max-w-2xl text-lg text-muted">{t("subtitle")}</p>
        <RegionSelector value={region} />
      </PageHero>
      <PricingCards
        region={region}
        signedIn={Boolean(session?.user)}
        isPro={isPro}
        paymentsAvailable={paymentsAvailable(region)}
      />
      <section aria-labelledby="faq" className="flex flex-col gap-4">
        <h2 id="faq" className="text-2xl font-bold">
          {t("faqTitle")}
        </h2>
        <FaqList locale={locale} items={faq.map((n) => ({ q: t(`faq.q${n}`), a: t(`faq.a${n}`) }))} />
      </section>
    </div>
  );
}
