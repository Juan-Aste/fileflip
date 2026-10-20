import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarClock, CircleCheck, LogOut, PauseCircle, Sparkles } from "lucide-react";
import { auth, signOut } from "@/auth";
import CancelSubscriptionButton from "@/components/pricing/CancelSubscriptionButton";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { currentSubscription, planFromSubscription } from "@/lib/billing";
import { formatCurrency, formatDate } from "@/lib/format";
import { badge, buttonPrimary, buttonSecondary, card } from "@/components/ui/styles";

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

  const email = session.user.email ?? "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-solid font-display text-2xl font-extrabold text-white uppercase shadow-lift"
        >
          {email.charAt(0) || "?"}
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-1 truncate text-muted">{t("signedInAs", { email })}</p>
        </div>
      </header>

      {checkout === "done" && plan !== "pro" && (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">
          <CircleCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {t("checkoutDone")}
        </p>
      )}

      <section aria-labelledby="plan" className={`flex flex-col gap-3 p-6 sm:p-8 ${plan === "pro" ? "rounded-2xl border-2 border-brand bg-surface shadow-lift" : card}`}>
        <h2 id="plan" className="text-sm font-medium text-muted">
          {t("plan")}
        </h2>
        <p className="flex items-center gap-3">
          <span className="font-display text-3xl font-extrabold">{plan === "pro" ? t("planPro") : t("planFree")}</span>
          {plan === "pro" && (
            <span className={badge}>
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              FileFlip Pro
            </span>
          )}
        </p>
        {plan === "pro" && sub ? (
          <>
            <p className="text-muted">{t("planProBody")}</p>
            <ul className="flex flex-col gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm">
              <li>{t("billing", { amount: formatCurrency(sub.amount, sub.currency, loc), period: sub.period })}</li>
              {sub.status === "active" && sub.currentPeriodEnd && (
                <li className="flex items-center gap-2">
                  <CalendarClock aria-hidden="true" className="h-4 w-4 text-muted" />
                  {t("nextPayment", { date: formatDate(sub.currentPeriodEnd, loc) })}
                </li>
              )}
              {sub.status === "paused" && (
                <li className="flex items-center gap-2 text-warning">
                  <PauseCircle aria-hidden="true" className="h-4 w-4" />
                  {t("paused")}
                </li>
              )}
              {sub.status === "cancelled" && sub.currentPeriodEnd && (
                <li className="flex items-center gap-2">
                  <CalendarClock aria-hidden="true" className="h-4 w-4 text-muted" />
                  {t("paidUntil", { date: formatDate(sub.currentPeriodEnd, loc) })}
                </li>
              )}
            </ul>
            {sub.status === "active" && (
              <div className="mt-2">
                <CancelSubscriptionButton />
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-muted">{t("freeBody")}</p>
            <Link href="/pricing" className={`mt-2 self-start ${buttonPrimary}`}>
              <Sparkles aria-hidden="true" className="h-5 w-5" />
              {t("upgrade")}
            </Link>
          </>
        )}
      </section>

      <form action={logout}>
        <button type="submit" className={buttonSecondary}>
          <LogOut aria-hidden="true" className="h-4 w-4" />
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
