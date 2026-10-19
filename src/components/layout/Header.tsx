import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import AccountLink from "./AccountLink";
import LocaleSwitcher from "./LocaleSwitcher";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const t = useTranslations("Header");
  const tc = useTranslations("Common");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          aria-label={t("homeLink")}
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white"
          >
            ⇄
          </span>
          {tc("appName")}
        </Link>
        <nav aria-label={t("mainNav")} className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground md:block"
          >
            {t("nav.tools")}
          </Link>
          <Link
            href="/pricing"
            className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground md:block"
          >
            {t("nav.pricing")}
          </Link>
          <AccountLink />
          <LocaleSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
