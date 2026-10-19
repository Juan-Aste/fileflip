"use client";

import { useTranslations } from "next-intl";
import { useSessionInfo } from "@/components/session/SessionInfo";
import { Link } from "@/i18n/navigation";

/** "Sign in" / "My account" link, from the client-side session info. */
export default function AccountLink() {
  const t = useTranslations("Header.nav");
  const { signedIn } = useSessionInfo();

  return (
    <Link
      href={signedIn ? "/account" : "/login"}
      // Shown on every page; most visitors never sign in.
      prefetch={false}
      className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-muted hover:text-foreground sm:px-3"
    >
      {signedIn ? t("account") : t("login")}
    </Link>
  );
}
