"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * "Sign in" / "My account" link. Reads the session on the client so every
 * page can stay statically rendered.
 */
export default function AccountLink() {
  const t = useTranslations("Header.nav");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setSignedIn(Boolean(s?.user)))
      .catch(() => {});
  }, []);

  return (
    <Link
      href={signedIn ? "/account" : "/login"}
      className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-foreground"
    >
      {signedIn ? t("account") : t("login")}
    </Link>
  );
}
