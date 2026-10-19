import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import PricingCards from "@/components/pricing/PricingCards";
import RegionSelector from "@/components/pricing/RegionSelector";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { planForUser } from "@/lib/billing";
import { providerForRegion } from "@/lib/payments/providers";
import { currentRegion } from "@/lib/server/region";

// Prices depend on the visitor's country.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });
  return {
    title: `${t("title")} — FileFlip Pro`,
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
  setRequestLocale(locale);
  const [t, region, session] = await Promise.all([getTranslations("Pricing"), currentRegion(), auth()]);
  const isPro = (await planForUser(session?.user?.id)) === "pro";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-muted">{t("subtitle")}</p>
        <RegionSelector value={region} />
      </header>
      <PricingCards
        region={region}
        signedIn={Boolean(session?.user)}
        isPro={isPro}
        paymentsAvailable={paymentsAvailable(region)}
      />
      <section aria-labelledby="faq" className="flex flex-col gap-3">
        <h2 id="faq" className="text-2xl font-bold">
          {t("faqTitle")}
        </h2>
        {faq.map((n) => (
          <details key={n} className="rounded-xl border border-border bg-surface px-4 py-3">
            <summary className="cursor-pointer font-medium">{t(`faq.q${n}`)}</summary>
            <p className="mt-2 text-sm text-muted">{t(`faq.a${n}`)}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
