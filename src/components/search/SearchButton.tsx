"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { prefetchSearchIndex } from "./search-index";

// The dialog (and the index it fetches) loads on first use only.
const SearchDialog = dynamic(() => import("./SearchDialog"), { ssr: false });

/** Other search fields (the home page's) open this button's dialog with this event. */
export const OPEN_SEARCH_EVENT = "fileflect:open-search";

/** Header search button; Ctrl/⌘+K or "/" opens it from anywhere. */
export default function SearchButton({ className = "" }: { className?: string }) {
  const t = useTranslations("Search");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target?.closest("input, textarea, select, [contenteditable=true]");
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault();
        setUsed(true);
        setOpen(true);
      }
    };
    const onOpen = () => {
      setUsed(true);
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K /"
        aria-label={t("label")}
        onPointerEnter={() => prefetchSearchIndex(locale)}
        onFocus={() => prefetchSearchIndex(locale)}
        onClick={() => {
          setUsed(true);
          setOpen(true);
        }}
        className={`inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-brand hover:text-brand ${className}`}
      >
        <Search aria-hidden="true" className="h-4 w-4" />
        <span className="hidden lg:inline">{t("button")}</span>
        <kbd className="hidden rounded border border-border px-1.5 font-sans text-xs lg:inline">Ctrl K</kbd>
      </button>
      {used && <SearchDialog open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
