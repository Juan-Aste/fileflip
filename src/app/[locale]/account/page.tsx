import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { Link, redirect } from "@/i18n/navigation";

// Depends on the visitor's session.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: `${t("title")} — FileFlip`, robots: { index: false } };
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) {
    redirect({ href: { pathname: "/login", query: { callbackUrl: `/${locale}/account` } }, locale });
    return null;
  }
  const t = await getTranslations("Account");

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

      <section aria-labelledby="plan" className="rounded-2xl border border-border bg-surface p-6">
        <h2 id="plan" className="text-sm font-medium text-muted">
          {t("plan")}
        </h2>
        <p className="mt-1 text-2xl font-bold">{t("planFree")}</p>
        <p className="mt-2 text-sm text-muted">{t("freeBody")}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-block rounded-xl bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-strong"
        >
          {t("upgrade")}
        </Link>
      </section>

      <form action={logout}>
        <button type="submit" className="rounded-xl border border-border px-5 py-2.5 font-semibold hover:bg-brand-soft">
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
