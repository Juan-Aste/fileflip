import { useLocale, useTranslations } from "next-intl";

const link = "underline underline-offset-2 hover:text-brand";

/**
 * Express acceptance of the Terms and the Privacy policy (including the
 * transfer of data abroad), next to the buttons that create an account or
 * start a subscription. Signing in records the accepted version. Rendered
 * on the server only (client components get it as a prop), with plain
 * links: rendered on the client it sometimes failed to hydrate (React #418).
 */
export default function TermsConsent({ action }: { action: "signIn" | "subscribe" }) {
  const t = useTranslations("Consent");
  const locale = useLocale();
  return (
    <p className="text-center text-xs text-pretty text-muted">
      {t.rich(action, {
        terms: (chunks) => (
          <a href={`/${locale}/terms`} className={link}>
            {chunks}
          </a>
        ),
        privacy: (chunks) => (
          <a href={`/${locale}/privacy`} className={link}>
            {chunks}
          </a>
        ),
      })}
    </p>
  );
}
