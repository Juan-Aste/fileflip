import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth, signOut } from "@/auth";
import CancelSubscriptionButton from "@/components/pricing/CancelSubscriptionButton";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { currentSubscription, planFromSubscription } from "@/lib/billing";
import { formatCurrency, formatDate } from "@/lib/format";
import { buttonPrimary } from "@/components/ui/styles";

// Depends on the visitor's session.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ checkout?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: `${t("title")} — FileFlip`, robots: { index: false } };
}

export default async function AccountPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { checkout } = await searchParams;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) {
    redirect({ href: { pathname: "/login", query: { callbackUrl: `/${locale}/account` } }, locale });
    return null;
  }
  const t = await getTranslations("Account");
  const sub = process.env.MONGODB_URI ? await currentSubscription(session.user.id ?? "").catch(() => null) : null;
  const plan = planFromSubscription(sub);
  const loc = locale as Locale;

  async function logout() {
    "use server";
    await signOut({ redirectTo: `/${locale}` });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted">{t("signedInAs", { email: session.user.email ?? "" })}</p>
      </header>

      {checkout === "done" && plan !== "pro" && (
        <p role="status" className="rounded-xl bg-brand-soft px-4 py-3 text-sm">
          {t("checkoutDone")}
        </p>
      )}

      <section aria-labelledby="plan" className="flex flex-col gap-2 rounded-2xl border border-border bg-surface shadow-card p-6">
        <h2 id="plan" className="text-sm font-medium text-muted">
          {t("plan")}
        </h2>
        <p className="text-2xl font-bold">{plan === "pro" ? t("planPro") : t("planFree")}</p>
        {plan === "pro" && sub ? (
          <>
            <p className="text-sm text-muted">{t("planProBody")}</p>
            <p className="text-sm">
              {t("billing", { amount: formatCurrency(sub.amount, sub.currency, loc), period: sub.period })}
            </p>
            {sub.status === "active" && sub.currentPeriodEnd && (
              <p className="text-sm">{t("nextPayment", { date: formatDate(sub.currentPeriodEnd, loc) })}</p>
            )}
            {sub.status === "paused" && <p className="text-sm text-warning">{t("paused")}</p>}
            {sub.status === "cancelled" && sub.currentPeriodEnd && (
              <p className="text-sm">{t("paidUntil", { date: formatDate(sub.currentPeriodEnd, loc) })}</p>
            )}
            {sub.status === "active" && (
              <div className="mt-2">
                <CancelSubscriptionButton />
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted">{t("freeBody")}</p>
            <Link
              href="/pricing"
              className={`mt-2 self-start ${buttonPrimary}`}
            >
              {t("upgrade")}
            </Link>
          </>
        )}
      </section>

      <form action={logout}>
        <button type="submit" className="rounded-xl border border-border px-5 py-2.5 font-semibold hover:bg-brand-soft">
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
