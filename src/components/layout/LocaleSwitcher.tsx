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
  const prefetchRoutes = () => void loadRoutes().catch(() => {});

  async function onChange(next: Locale) {
    let translatePathname;
    try {
      ({ translatePathname } = await loadRoutes());
    } catch {
      // Offline the selector just stays as it was; online, a deploy replaced this
      // page's files, so load the new language's home page (bug B-13).
      if (navigator.onLine !== false) window.location.assign(`/${next}`);
      return;
    }
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
        onPointerEnter={prefetchRoutes}
        onFocus={prefetchRoutes}
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
