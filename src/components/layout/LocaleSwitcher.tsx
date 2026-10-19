"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { translatePathname } from "@/config/routes";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function onChange(next: Locale) {
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
        className="h-9 cursor-pointer rounded-lg border border-border bg-surface px-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60"
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
