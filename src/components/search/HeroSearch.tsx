"use client";

import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { prefetchSearchIndex } from "./search-index";
import { OPEN_SEARCH_EVENT } from "./SearchButton";

/** A wide search field on the home page; it opens the header's search dialog. */
export default function HeroSearch({ count }: { count: number }) {
  const t = useTranslations("HomePage.catalog");
  const locale = useLocale();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K /"
      onPointerEnter={() => prefetchSearchIndex(locale)}
      onFocus={() => prefetchSearchIndex(locale)}
      onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
      className="flex h-12 w-full max-w-xl items-center gap-3 rounded-2xl border border-border-strong bg-surface px-4 text-left text-muted shadow-sm transition hover:border-brand focus-visible:border-brand"
    >
      <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-brand" />
      <span className="min-w-0 flex-1 truncate">{t("searchPlaceholder", { count })}</span>
      <kbd aria-hidden="true" className="hidden rounded border border-border px-1.5 font-sans text-xs sm:inline">Ctrl K</kbd>
    </button>
  );
}
