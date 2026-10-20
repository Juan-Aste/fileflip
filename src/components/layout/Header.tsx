import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LogoMark from "@/components/brand/LogoMark";
import AccountLink from "./AccountLink";
import LocaleSwitcher from "./LocaleSwitcher";
import MobileMenu from "./MobileMenu";
import ThemeToggle from "./ThemeToggle";

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-foreground";

export default function Header() {
  const t = useTranslations("Header");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          aria-label={t("homeLink")}
          className="flex shrink-0 items-center gap-2 font-display text-xl font-extrabold tracking-tight"
        >
          <LogoMark className="h-8 w-8" />
          <span>
            File<span className="text-brand">Flip</span>
          </span>
        </Link>

        <nav aria-label={t("mainNav")} className="ml-auto hidden items-center gap-1 md:flex">
          <Link href="/" className={navLink}>
            {t("nav.tools")}
          </Link>
          <Link href="/pricing" className={navLink}>
            {t("nav.pricing")}
          </Link>
          <AccountLink />
          <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
          <LocaleSwitcher />
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <MobileMenu>
            <nav aria-label={t("mainNav")} className="flex flex-col">
              <Link href="/" className={`${navLink} !py-3 !text-base`}>
                {t("nav.tools")}
              </Link>
              <Link href="/pricing" className={`${navLink} !py-3 !text-base`}>
                {t("nav.pricing")}
              </Link>
              <AccountLink className="px-3 py-3 text-base" />
            </nav>
            <div className="border-t border-border pt-3 pb-1">
              <LocaleSwitcher />
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
