"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";
import { field } from "@/components/ui/styles";

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  // The slug tables (tools, conversions, long-tail content) are only needed
  // when switching, so they stay out of every page's initial bundle.
  const loadRoutes = () => import("@/config/routes");

  async function onChange(next: Locale) {
    const { translatePathname } = await loadRoutes();
    startTransition(() => {
      // Same page in the new locale, with its translated slug.
      router.replace(translatePathname(pathname, locale, next), { locale: next });
    });
  }

  return (
    <label className="relative flex items-center">
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as Locale)}
        onPointerEnter={loadRoutes}
        onFocus={loadRoutes}
        className={`h-9 cursor-pointer text-sm disabled:opacity-60 ${field}`}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l} lang={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
