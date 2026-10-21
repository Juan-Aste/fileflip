"use client";

import { useDeferredValue, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, Download, FileUp } from "lucide-react";
import { buttonSecondary, card, field } from "@/components/ui/styles";
import { decodeText } from "@/lib/data/text";
import { changeCase, textStats, type CaseMode } from "@/lib/text/count";
import { MAX_PASSWORDS, PASSWORD_LENGTH, entropyBits, generatePasswords, type PasswordOptions } from "@/lib/text/password";
import { reportConversion, trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ToolShell from "../shell/ToolShell";

/** Below this many bits a password is easy to guess offline. */
const STRONG_BITS = 80;

export function PasswordGeneratorTool() {
  const t = useTranslations("TextTools");
  const tt = useTranslations("Tools.password-generator");
  const lengthId = useId();
  const countId = useId();
  const [options, setOptions] = useState<PasswordOptions>({
    length: 20,
    count: 1,
    upper: true,
    lower: true,
    digits: true,
    symbols: true,
    avoidAmbiguous: false,
  });
  const set = <K extends keyof PasswordOptions>(key: K) => (value: PasswordOptions[K]) => setOptions((o) => ({ ...o, [key]: value }));
  const bits = entropyBits(options);
  const anySet = options.upper || options.lower || options.digits || options.symbols;

  return (
    <ToolShell
      input={{ kind: "none", ready: anySet }}
      actionLabel={tt("action")}
      options={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={lengthId} className="text-sm font-medium">
              {t("length", { length: options.length })}
            </label>
            <input
              id={lengthId}
              type="range"
              min={8}
              max={PASSWORD_LENGTH.max}
              value={options.length}
              onChange={(e) => set("length")(Number(e.target.value))}
              className="w-full max-w-sm accent-[var(--brand-solid)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={countId} className="text-sm font-medium">
              {t("count", { max: MAX_PASSWORDS })}
            </label>
            <input
              id={countId}
              type="number"
              min={1}
              max={MAX_PASSWORDS}
              value={options.count}
              onChange={(e) => set("count")(Number(e.target.value))}
              className={`h-10 w-32 ${field}`}
            />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{t("characters")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Checkbox checked={options.upper} onChange={set("upper")} label={t("upper")} />
              <Checkbox checked={options.lower} onChange={set("lower")} label={t("lower")} />
              <Checkbox checked={options.digits} onChange={set("digits")} label={t("digits")} />
              <Checkbox checked={options.symbols} onChange={set("symbols")} label={t("symbols")} />
            </div>
          </fieldset>
          <Checkbox checked={options.avoidAmbiguous} onChange={set("avoidAmbiguous")} label={t("avoidAmbiguous")} />
          <p className={`text-sm font-medium ${bits >= STRONG_BITS ? "text-success" : "text-danger"}`}>
            {anySet ? t(bits >= STRONG_BITS ? "strong" : "weak", { bits }) : t("chooseSet")}
          </p>
        </div>
      }
      process={async () => {
        const passwords = await trackTool(
          "password-generator",
          { from: "txt", to: "txt", files: [] },
          async () => generatePasswords(options),
          (out) => out.length,
        );
        const text = `${passwords.join("\n")}\n`;
        return [
          {
            kind: "file",
            name: passwords.length === 1 ? "password.txt" : "passwords.txt",
            blob: new Blob([text], { type: "text/plain;charset=utf-8" }),
            preview: text,
          },
        ];
      }}
    />
  );
}

const CASES: CaseMode[] = ["upper", "lower", "title", "sentence"];
const MAX_CHARS = 2_000_000;

/** Live counter: the numbers update while typing; case changes rewrite the text in place. */
export function WordCounterTool() {
  const t = useTranslations("TextTools");
  const locale = useLocale();
  const textId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [fileError, setFileError] = useState(false);
  const deferred = useDeferredValue(text);
  const stats = textStats(deferred, locale);
  const reported = useRef(false);

  // One usage report per page view, once there is some text.
  useEffect(() => {
    if (reported.current || deferred.trim() === "") return;
    const timer = setTimeout(() => {
      reported.current = true;
      reportConversion({ tool: "word-counter", from: "txt", to: "txt", size: new Blob([deferred]).size, success: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [deferred]);

  async function open(file: File | undefined) {
    if (!file) return;
    setFileError(false);
    if (file.size > MAX_CHARS * 4) return setFileError(true);
    const content = decodeText(new Uint8Array(await file.arrayBuffer()));
    setText(content.slice(0, MAX_CHARS));
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "text.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const figures: [string, number][] = [
    [t("words"), stats.words],
    [t("charactersCount"), stats.characters],
    [t("charactersNoSpaces"), stats.charactersNoSpaces],
    [t("sentences"), stats.sentences],
    [t("paragraphs"), stats.paragraphs],
    [t("lines"), stats.lines],
  ];
  const number = new Intl.NumberFormat(locale);

  return (
    <div className={`${card} flex flex-col gap-4 p-4 sm:p-6`}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {figures.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border p-3">
            <dt className="text-xs font-medium text-muted">{label}</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{number.format(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">{t("readingTime", { minutes: stats.readingMinutes })}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={textId} className="text-sm font-medium">
            {t("textLabel")}
          </label>
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:bg-brand-soft">
            <FileUp aria-hidden="true" className="h-4 w-4" />
            {t("openFile")}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md,.csv,.html,.srt,.vtt"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              void open(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <textarea
          id={textId}
          value={text}
          maxLength={MAX_CHARS}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className={`min-h-48 py-2 ${field}`}
        />
        {fileError && <p className="text-sm text-danger">{t("fileTooLarge")}</p>}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("changeCase")}>
        {CASES.map((mode) => (
          <button key={mode} type="button" disabled={!text} onClick={() => setText(changeCase(text, mode, locale))} className={`${buttonSecondary} disabled:opacity-40`}>
            {t(`case.${mode}`)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
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
        <button type="button" disabled={!text} onClick={download} className={`${buttonSecondary} disabled:opacity-40`}>
          <Download aria-hidden="true" className="h-4 w-4" />
          {t("download")}
        </button>
      </div>
    </div>
  );
}
