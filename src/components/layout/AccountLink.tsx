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
      className="grid whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-muted hover:text-foreground sm:px-3"
    >
      {/* Both labels share one grid cell, so the link is as wide as the longer
          one and the header doesn't shift when the session loads. */}
      <span className={`col-start-1 row-start-1 ${signedIn ? "invisible" : ""}`} aria-hidden={signedIn}>
        {t("login")}
      </span>
      <span className={`col-start-1 row-start-1 ${signedIn ? "" : "invisible"}`} aria-hidden={!signedIn}>
        {t("account")}
      </span>
    </Link>
  );
}
