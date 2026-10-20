import { useLocale, useTranslations } from "next-intl";
import { FileQuestion, House } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import PageHero from "@/components/ui/PageHero";
import PillLink from "@/components/ui/PillLink";
import { buttonPrimary } from "@/components/ui/styles";
import { conversionSlug, popularConversions } from "@/config/conversion-pages";
import { formats } from "@/config/formats";

export default function NotFound() {
  const t = useTranslations("Errors");
  const tf = useTranslations("Footer");
  const tc = useTranslations("ConversionPage");
  const locale = useLocale() as Locale;
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-10 px-4 py-16 sm:py-24">
      <PageHero icon={<FileQuestion aria-hidden="true" className="h-7 w-7" />} title={t("notFoundTitle")}>
        <p className="text-lg text-muted">{t("notFoundBody")}</p>
        <Link href="/" className={`mt-2 ${buttonPrimary}`}>
          <House aria-hidden="true" className="h-5 w-5" />
          {t("backHome")}
        </Link>
      </PageHero>
      <nav aria-labelledby="notfound-popular" className="flex flex-col items-center gap-3">
        <h2 id="notfound-popular" className="text-sm font-semibold text-muted">
          {tf("headings.conversions")}
        </h2>
        <ul className="flex flex-wrap justify-center gap-2">
          {popularConversions.map((c) => (
            <li key={`${c.from}-${c.to}`}>
              <PillLink href={`/${conversionSlug(c, locale)}`}>
                {tc("linkLabel", { from: formats[c.from].label, to: formats[c.to].label })}
              </PillLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
