import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogIn, ShieldCheck } from "lucide-react";
import { auth, getAuthProviders, signIn } from "@/auth";
import EmailSignInForm from "@/components/session/EmailSignInForm";
import PendingSubmitButton from "@/components/session/PendingSubmitButton";
import TermsConsent from "@/components/legal/TermsConsent";
import PageHero from "@/components/ui/PageHero";
import { redirect } from "@/i18n/navigation";
import { proEnabled } from "@/lib/pro";
import { buttonSecondary, card } from "@/components/ui/styles";

// Depends on the visitor's session.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });
  return { title: `${t("title")} — Fileflect`, robots: { index: false } };
}

/** Google's "G" mark, as its sign-in branding guidelines ask for. */
function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
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

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-12 sm:py-16">
      <PageHero icon={<LogIn aria-hidden="true" className="h-7 w-7" />} title={t("title")}>
        <p className="text-muted">{t(proEnabled() ? "subtitle" : "subtitleNoPro")}</p>
      </PageHero>

      <div className={`flex flex-col gap-5 p-6 sm:p-8 ${card}`}>
        {error && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
            {t("error")}
          </p>
        )}
        {providers.google && (
          <form action={google}>
            <PendingSubmitButton
              icon={<GoogleMark />}
              pendingLabel={t("redirecting")}
              className={`w-full gap-3 py-3 ${buttonSecondary}`}
            >
              {t("google")}
            </PendingSubmitButton>
          </form>
        )}
        {providers.google && providers.email && (
          <p className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </p>
        )}
        {providers.email && <EmailSignInForm redirectTo={redirectTo} />}
        {(providers.google || providers.email) && <TermsConsent action="signIn" />}
        {!providers.google && !providers.email && <p className="text-center text-muted">{t("noMethods")}</p>}
      </div>
      <p className="text-center text-sm text-balance text-muted">
        <ShieldCheck aria-hidden="true" className="mr-1.5 inline h-4 w-4 align-[-3px] text-success" />
        {t("privacyNote")}
      </p>
    </div>
  );
}
