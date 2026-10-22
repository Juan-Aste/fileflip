"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { searchEntries, type SearchEntry } from "@/lib/search/match";
import { loadSearchIndex } from "./search-index";

/** Modal search with an ARIA combobox: arrows move, Enter opens, Esc closes. */
export default function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("Search");
  const locale = useLocale();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      input.current?.select();
      setFailed(false);
      loadSearchIndex(locale).then(setIndex, () => setFailed(true));
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, locale]);

  const results = useMemo(() => (index ? searchEntries(index, query, 10) : []), [index, query]);
  useEffect(() => setActive(0), [query]);

  const go = (entry: SearchEntry) => {
    onClose();
    router.push(entry.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  const optionId = (i: number) => `${listId}-${i}`;
  const status = !query.trim()
    ? t("hint")
    : failed
      ? t("error")
      : !index
        ? t("loading")
        : results.length === 0
          ? t("noResults", { query: query.trim() })
          : t("results", { count: results.length });

  return (
    <dialog
      ref={dialog}
      aria-label={t("label")}
      onClose={onClose}
      // Clicking the backdrop (the dialog element itself) closes it.
      onClick={(e) => e.target === dialog.current && onClose()}
      className="m-auto mt-[10vh] w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-border bg-surface p-0 text-foreground shadow-lift backdrop:bg-black/40"
    >
      {/* The row shows the focus (an underline), not the bare input. */}
      <div className="flex items-center gap-2 border-b border-border px-4 focus-within:shadow-[inset_0_-2px_0_var(--ring)]">
        <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-muted" />
        <input
          ref={input}
          // Not type="search": its Escape clears the text instead of closing.
          type="text"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results.length > 0 ? optionId(active) : undefined}
          aria-label={t("label")}
          placeholder={t("placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          style={{ outline: "none" }}
          className="h-14 min-w-0 flex-1 bg-transparent text-base placeholder:text-muted"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <ul id={listId} role="listbox" aria-label={t("label")} className="max-h-[60vh] overflow-y-auto p-2 empty:hidden">
        {results.map((r, i) => (
          <li
            key={r.href}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            onMouseMove={() => setActive(i)}
            onClick={() => go(r)}
            className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? "bg-brand-soft text-brand" : ""}`}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{r.title}</span>
              {r.description && <span className="truncate text-sm text-muted">{r.description}</span>}
            </span>
            <span className="shrink-0 text-xs text-muted">{t(`kinds.${r.kind}`)}</span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
          </li>
        ))}
      </ul>
      <p role="status" className="border-t border-border px-4 py-2.5 text-sm text-muted">
        {status}
      </p>
    </dialog>
  );
}
