"use client";

import { useDeferredValue, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, Download, FileUp, RefreshCw, Undo2 } from "lucide-react";
import { tools, type ToolId } from "@/config/tools";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { buttonPrimary, buttonSecondary, card, field } from "@/components/ui/styles";
import { decodeText } from "@/lib/data/text";
import { changeCase, type CaseMode } from "@/lib/text/count";
import { cleanLines, type LineOptions, type LineSort } from "@/lib/text/lines";
import { LOREM_LIMITS, generateLorem, loremToText, type LoremUnit } from "@/lib/text/lorem";
import { reportConversion } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";

// Small text tools that work on what is typed or pasted, live, with nothing uploaded.

const MAX_CHARS = 2_000_000;

/** One usage report per page view, once the tool has produced something. */
export function useUsageReport(tool: ToolId, text: string) {
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current || text.trim() === "") return;
    const timer = setTimeout(() => {
      reported.current = true;
      reportConversion({ tool, from: "txt", to: "txt", size: new Blob([text]).size, success: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [tool, text]);
}

/** A labelled text box that can also be filled from a text file (encoding detected). */
export function TextBox({
  label,
  value,
  onChange,
  rows = 10,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (text: string) => void;
  rows?: number;
  readOnly?: boolean;
}) {
  const t = useTranslations("TextTools");
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState(false);

  async function open(file: File | undefined) {
    if (!file || !onChange) return;
    setFileError(false);
    if (file.size > MAX_CHARS * 4) return setFileError(true);
    onChange(decodeText(new Uint8Array(await file.arrayBuffer())).slice(0, MAX_CHARS));
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {!readOnly && (
          <>
            <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:bg-brand-soft">
              <FileUp aria-hidden="true" className="h-4 w-4" />
              {t("openFile")}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.md,.csv,.tsv,.json,.html,.xml,.srt,.vtt,.log"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                void open(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
      <textarea
        id={id}
        value={value}
        maxLength={MAX_CHARS}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        rows={rows}
        spellCheck={false}
        className={`min-h-40 py-2 ${field}`}
      />
      {fileError && <p className="text-sm text-danger">{t("fileTooLarge")}</p>}
    </div>
  );
}

function save(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copy and download buttons for a result, plus a link to count its words. */
export function TextActions({ text, fileName = "text.txt", children }: { text: string; fileName?: string; children?: React.ReactNode }) {
  const html = fileName.endsWith(".html");
  const t = useTranslations("TextTools");
  const locale = useLocale() as Locale;
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={!text}
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className={`${buttonSecondary} disabled:opacity-40`}
      >
        {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
        {copied ? t("copied") : t("copy")}
      </button>
      <button type="button" disabled={!text} onClick={() => save(text, fileName)} className={`${buttonSecondary} disabled:opacity-40`}>
        <Download aria-hidden="true" className="h-4 w-4" />
        {t(html ? "downloadHtml" : "download")}
      </button>
      {children}
      <Link href={`/${tools["word-counter"].slugs[locale]}`} className="px-2 text-sm font-semibold text-brand underline-offset-2 hover:underline">
        {t("countWords")}
      </Link>
    </div>
  );
}

const CASE_MODES: CaseMode[] = ["upper", "lower", "title", "sentence", "alternating", "inverse"];
/** Languages with their own casing rules (Turkish dotted i, Dutch IJ) or title-case small words. */
// Named in their own language: Intl.DisplayNames differs between engines (server and browser render must match).
const CASE_LANGUAGES = { es: "Español", en: "English", pt: "Português", fr: "Français", it: "Italiano", de: "Deutsch", nl: "Nederlands", tr: "Türkçe" } as const;

export function CaseConverterTool() {
  const t = useTranslations("TextTools");
  const locale = useLocale();
  const languageId = useId();
  const [text, setText] = useState("");
  const [previous, setPrevious] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>(locale in CASE_LANGUAGES ? locale : "en");
  const [smallWords, setSmallWords] = useState(true);
  useUsageReport("case-converter", previous === null ? "" : text);

  return (
    <div className={`${card} flex flex-col gap-4 p-4 sm:p-6`}>
      <TextBox
        label={t("textLabel")}
        value={text}
        onChange={(value) => {
          setText(value);
          setPrevious(null);
        }}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("changeCase")}>
        {CASE_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={!text}
            onClick={() => {
              setPrevious(text);
              setText(changeCase(text, mode, language, { smallWords }));
            }}
            className={`${buttonSecondary} disabled:opacity-40`}
          >
            {t(`case.${mode}`)}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
        <div className="flex flex-col gap-1">
          <label htmlFor={languageId} className="text-sm font-medium">
            {t("textLanguage")}
          </label>
          <select id={languageId} value={language} onChange={(e) => setLanguage(e.target.value)} className={`h-10 max-w-xs ${field}`}>
            {Object.entries(CASE_LANGUAGES).map(([code, name]) => (
              <option key={code} value={code} lang={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:pb-2.5">
          <Checkbox checked={smallWords} onChange={setSmallWords} label={t("smallWords")} />
        </div>
      </div>
      <TextActions text={text}>
        <button type="button" disabled={previous === null} onClick={() => {
            setText(previous ?? text);
            setPrevious(null);
          }} className={`${buttonSecondary} disabled:opacity-40`}>
          <Undo2 aria-hidden="true" className="h-4 w-4" />
          {t("undo")}
        </button>
      </TextActions>
    </div>
  );
}

/** Live: the result updates while typing or changing an option. */
export function RemoveDuplicateLinesTool() {
  const t = useTranslations("TextTools");
  const locale = useLocale();
  const [text, setText] = useState("");
  const [options, setOptions] = useState<Omit<LineOptions, "locale">>({
    removeDuplicates: true,
    ignoreCase: false,
    trim: true,
    removeEmpty: true,
    sort: "none",
  });
  const set = <K extends keyof typeof options>(key: K) => (value: (typeof options)[K]) => setOptions((o) => ({ ...o, [key]: value }));
  const deferred = useDeferredValue(text);
  const result = cleanLines(deferred, { ...options, locale });
  useUsageReport("remove-duplicate-lines", result.text);

  return (
    <div className={`${card} flex flex-col gap-4 p-4 sm:p-6`}>
      <TextBox label={t("textLabel")} value={text} onChange={setText} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Checkbox checked={options.removeDuplicates} onChange={set("removeDuplicates")} label={t("removeDuplicates")} />
        <Checkbox checked={options.ignoreCase} onChange={set("ignoreCase")} label={t("ignoreCase")} />
        <Checkbox checked={options.trim} onChange={set("trim")} label={t("trimLines")} />
        <Checkbox checked={options.removeEmpty} onChange={set("removeEmpty")} label={t("removeEmpty")} />
      </div>
      <ChoiceGroup<LineSort>
        legend={t("sort")}
        value={options.sort}
        onChange={set("sort")}
        options={[
          { value: "none", label: t("sortNone") },
          { value: "asc", label: t("sortAsc") },
          { value: "desc", label: t("sortDesc") },
        ]}
      />
      <p role="status" className="text-sm font-medium">
        {t("lineResult", { before: result.before, after: result.after, duplicates: result.duplicates, empty: result.empty })}
      </p>
      <TextBox label={t("result")} value={result.text} readOnly />
      <TextActions text={result.text} fileName="lines.txt" />
    </div>
  );
}

export function LoremIpsumTool() {
  const t = useTranslations("TextTools");
  const countId = useId();
  const [unit, setUnit] = useState<LoremUnit>("paragraphs");
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [html, setHtml] = useState(false);
  // Generated on demand (not while rendering on the server): the text is random.
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const output = paragraphs.length ? loremToText(paragraphs, html) : "";
  useUsageReport("lorem-ipsum", output);
  const max = LOREM_LIMITS[unit];

  return (
    <div className={`${card} flex flex-col gap-4 p-4 sm:p-6`}>
      <ChoiceGroup<LoremUnit>
        legend={t("loremUnit")}
        value={unit}
        onChange={(value) => {
          setUnit(value);
          setCount((c) => Math.min(c, LOREM_LIMITS[value]));
        }}
        options={[
          { value: "paragraphs", label: t("paragraphs") },
          { value: "sentences", label: t("sentences") },
          { value: "words", label: t("words") },
        ]}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={countId} className="text-sm font-medium">
          {t("count", { max })}
        </label>
        <input id={countId} type="number" min={1} max={max} value={count} onChange={(e) => setCount(Number(e.target.value))} className={`h-10 w-32 ${field}`} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Checkbox checked={startWithLorem} onChange={setStartWithLorem} label={t("startWithLorem")} />
        <Checkbox checked={html} onChange={setHtml} label={t("asHtml")} />
      </div>
      <div>
        <button type="button" onClick={() => setParagraphs(generateLorem({ unit, count, startWithLorem }))} className={buttonPrimary}>
          {paragraphs.length ? <RefreshCw aria-hidden="true" className="h-4 w-4" /> : null}
          {t(paragraphs.length ? "regenerate" : "generate")}
        </button>
      </div>
      <TextBox label={t("result")} value={output} readOnly />
      <TextActions text={output} fileName={html ? "lorem-ipsum.html" : "lorem-ipsum.txt"} />
    </div>
  );
}
