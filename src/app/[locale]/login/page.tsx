import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth, getAuthProviders, signIn } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { buttonPrimary, buttonSecondary, field } from "@/components/ui/styles";

// Depends on the visitor's session.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });
  return { title: `${t("title")} — FileFlip`, robots: { index: false } };
}

/** Only same-site relative paths, so the login can't redirect to another site. */
function safeRedirect(target: string | undefined, locale: string) {
  return target?.startsWith("/") && !target.startsWith("//") ? target : `/${locale}/account`;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { error, callbackUrl } = await searchParams;
  setRequestLocale(locale);
  if (await auth()) redirect({ href: "/account", locale });

  const t = await getTranslations("Login");
  const providers = getAuthProviders();
  const redirectTo = safeRedirect(callbackUrl, locale);

  async function google() {
    "use server";
    await signIn("google", { redirectTo });
  }

  async function email(form: FormData) {
    "use server";
    await signIn("nodemailer", { email: String(form.get("email") ?? ""), redirectTo });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("subtitle")}</p>
      </header>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface shadow-card p-6">
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {t("error")}
          </p>
        )}
        {providers.google && (
          <form action={google}>
            <button
              type="submit"
              className={`w-full gap-3 ${buttonSecondary}`}
            >
              <span aria-hidden="true" className="font-bold text-brand">
                G
              </span>
              {t("google")}
            </button>
          </form>
        )}
        {providers.google && providers.email && (
          <p className="text-center text-sm text-muted" aria-hidden="true">
            {t("or")}
          </p>
        )}
        {providers.email && (
          <form action={email} className="flex flex-col gap-3">
            <label htmlFor="email" className="text-sm font-medium">
              {t("emailLabel")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              className={`h-11 ${field}`}
            />
            <button
              type="submit"
              className={buttonPrimary}
            >
              {t("emailSubmit")}
            </button>
          </form>
        )}
        {!providers.google && !providers.email && <p className="text-center text-muted">{t("noMethods")}</p>}
      </div>
      <p className="text-center text-xs text-muted">{t("privacyNote")}</p>
    </div>
  );
}
