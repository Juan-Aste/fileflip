"use client";

import { useTransition } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  function onChange(next: Locale) {
    startTransition(() => {
      // Same page in the new locale; params keep dynamic segments intact.
      router.replace(
        // @ts-expect-error -- pathname and params always match the current route.
        { pathname, params },
        { locale: next },
      );
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
