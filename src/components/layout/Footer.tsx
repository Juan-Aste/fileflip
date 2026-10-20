import { ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import LogoMark from "@/components/brand/LogoMark";
import { conversionSlug, popularConversions } from "@/config/conversion-pages";
import { formats } from "@/config/formats";
import { availableTools, tools } from "@/config/tools";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const linkClass = "text-muted transition hover:text-brand";

export default function Footer() {
  const t = useTranslations("Footer");
  const tt = useTranslations("Tools");
  const tc = useTranslations("ConversionPage");
  const th = useTranslations("HomePage");
  const locale = useLocale() as Locale;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 text-sm md:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col gap-3 md:col-span-3 lg:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
            <LogoMark className="h-7 w-7" />
            <span>
              File<span className="text-brand">Flip</span>
            </span>
          </Link>
          <p className="max-w-xs text-muted">{t("tagline")}</p>
          <p className="inline-flex items-center gap-2 font-medium text-brand">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
            {th("badge")}
          </p>
        </div>

        <nav aria-labelledby="footer-tools">
          <h2 id="footer-tools" className="mb-3 text-sm font-bold">
            {t("headings.tools")}
          </h2>
          <ul className="flex flex-col gap-2">
            {availableTools.map((id) => (
              <li key={id}>
                <Link href={`/${tools[id].slugs[locale]}`} className={linkClass}>
                  {tt(`${id}.title`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-conversions">
          <h2 id="footer-conversions" className="mb-3 text-sm font-bold">
            {t("headings.conversions")}
          </h2>
          <ul className="flex flex-col gap-2">
            {popularConversions.map((c) => (
              <li key={`${c.from}-${c.to}`}>
                <Link href={`/${conversionSlug(c, locale)}`} className={linkClass}>
                  {tc("linkLabel", { from: formats[c.from].label, to: formats[c.to].label })}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-company">
          <h2 id="footer-company" className="mb-3 text-sm font-bold">
            {t("headings.company")}
          </h2>
          <ul className="flex flex-col gap-2">
            {(["pricing", "privacy", "terms", "contact"] as const).map((page) => (
              <li key={page}>
                <Link href={`/${page}`} className={linkClass}>
                  {t(page)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted">{t("copyright", { year })}</p>
      </div>
    </footer>
  );
}
