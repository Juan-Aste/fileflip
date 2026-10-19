import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Footer() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{t("tagline")}</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {(["pricing", "privacy", "terms", "contact"] as const).map((page) => (
            <Link key={page} href={`/${page}`} className="hover:text-foreground">
              {t(page)}
            </Link>
          ))}
        </nav>
        <p>{t("copyright", { year })}</p>
      </div>
    </footer>
  );
}
