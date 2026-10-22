"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftRight, Check, Copy } from "lucide-react";
import { card, field } from "@/components/ui/styles";
import { contrast, formatColor, parseColor, wcagLevels, type Rgba } from "@/lib/color/color";
import { reportConversion } from "@/lib/stats-client";
import type { ToolId } from "@/config/tools";
import { convertUnit, parseDecimal, unitCategories, units, type UnitCategory } from "@/lib/units/units";
import ChoiceGroup from "../ChoiceGroup";

/** One usage report per page view, once the tool has been used. */
function useReportOnce(tool: ToolId, used: boolean) {
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current || !used) return;
    const timer = setTimeout(() => {
      reported.current = true;
      reportConversion({ tool, from: "txt", to: "txt", size: 0, success: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [tool, used]);
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useTranslations("UtilityTools");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-brand"
    >
      {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
      <span className="sr-only">{copied ? t("copied") : t("copyValue", { value: label })}</span>
    </button>
  );
}

function ColorField({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid: boolean }) {
  const t = useTranslations("UtilityTools");
  const id = useId();
  const parsed = parseColor(value);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={t("pick", { label })}
          value={parsed ? formatColor({ ...parsed, a: 1 }).hex : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-surface"
        />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className={`h-10 min-w-0 flex-1 font-mono ${field}`}
        />
      </div>
      {invalid && (
        <span id={`${id}-error`} className="text-sm text-danger">
          {t("invalidColor")}
        </span>
      )}
    </div>
  );
}

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

export function ColorConverterTool() {
  const t = useTranslations("UtilityTools");
  const locale = useLocale();
  const [input, setInput] = useState("#0f766e");
  const [background, setBackground] = useState("#ffffff");
  const [touched, setTouched] = useState(false);
  const color = parseColor(input);
  const bg = parseColor(background);
  useReportOnce("color-converter", touched && color !== null);
  const ratio = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  const formats = color ? formatColor(color) : null;
  const pass = (ok: boolean) => (
    <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
      {ok ? t("pass") : t("fail")}
    </span>
  );

  return (
    <div className={`${card} flex flex-col gap-6 p-4 sm:p-6`}>
      <ColorField
        label={t("color")}
        value={input}
        onChange={(v) => {
          setTouched(true);
          setInput(v);
        }}
        invalid={!color}
      />
      {color && formats && (
        <>
          <div
            className="h-20 rounded-xl border border-border"
            style={{ backgroundColor: formats.rgb, backgroundImage: "none" }}
            role="img"
            aria-label={t("preview", { color: formats.hex })}
          />
          <dl className="flex flex-col gap-2">
            {(["hex", "rgb", "hsl", "oklch"] as const).map((key) => (
              <div key={key} className="flex items-center gap-3 rounded-xl border border-border px-3 py-1.5">
                <dt className="w-14 shrink-0 text-xs font-semibold uppercase text-muted">{key}</dt>
                <dd className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="min-w-0 flex-1 break-words font-mono text-sm" data-format={key}>
                    {formats[key]}
                  </span>
                  <CopyButton text={formats[key]} label={formats[key]} />
                </dd>
              </div>
            ))}
          </dl>
          <section className="flex flex-col gap-3" aria-labelledby="contrast-title">
            <h2 id="contrast-title" className="font-display text-lg font-bold">
              {t("contrastTitle")}
            </h2>
            <ColorField label={t("background")} value={background} onChange={setBackground} invalid={!bg} />
            {bg && (
              <>
                <p
                  className="rounded-xl border border-border p-4 text-lg"
                  style={{ color: formats.rgb, backgroundColor: formatColor({ ...bg, a: 1 }).rgb }}
                >
                  {t("sample")}
                </p>
                <p className="text-sm font-semibold" data-testid="contrast-ratio">
                  {t("ratio", { ratio: ratio.format(contrast(color, bg)) })}
                </p>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-muted">
                      <th className="py-1 font-medium">{t("textSize")}</th>
                      <th className="py-1 font-medium">AA</th>
                      <th className="py-1 font-medium">AAA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const levels = wcagLevels(contrast(color, bg));
                      return (
                        <>
                          <tr>
                            <td className="py-1">{t("normalText")}</td>
                            <td>{pass(levels.normalAA)}</td>
                            <td>{pass(levels.normalAAA)}</td>
                          </tr>
                          <tr>
                            <td className="py-1">{t("largeText")}</td>
                            <td>{pass(levels.largeAA)}</td>
                            <td>{pass(levels.largeAAA)}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </>
            )}
            <p className="text-sm text-muted">
              {t("versus", { white: ratio.format(contrast(color, WHITE)), black: ratio.format(contrast(color, BLACK)) })}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

export function UnitConverterTool() {
  const t = useTranslations("UtilityTools");
  const locale = useLocale();
  const valueId = useId();
  const fromId = useId();
  const toId = useId();
  const [category, setCategory] = useState<UnitCategory>("length");
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");
  const [touched, setTouched] = useState(false);
  const amount = parseDecimal(value);
  useReportOnce("unit-converter", touched && amount !== null);

  const changeCategory = (next: UnitCategory) => {
    setCategory(next);
    setFrom(units[next][0]!.id);
    setTo(units[next][1]!.id);
  };
  const format = (n: number) =>
    new Intl.NumberFormat(locale, Math.abs(n) !== 0 && (Math.abs(n) >= 1e15 || Math.abs(n) < 1e-6) ? { notation: "scientific", maximumSignificantDigits: 10 } : { maximumSignificantDigits: 10 }).format(n);
  const name = (id: string) => t(`unit.${category}.${id}`);
  const symbol = (id: string) => units[category].find((x) => x.id === id)!.symbol;
  const result = amount === null ? null : convertUnit(amount, category, from, to);

  return (
    <div className={`${card} flex flex-col gap-5 p-4 sm:p-6`}>
      <ChoiceGroup
        legend={t("category")}
        value={category}
        onChange={changeCategory}
        options={unitCategories.map((c) => ({ value: c, label: t(`categories.${c}`) }))}
      />
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto_1fr]">
        <div className="flex flex-col gap-1">
          <label htmlFor={valueId} className="text-sm font-medium">
            {t("value")}
          </label>
          <input
            id={valueId}
            value={value}
            inputMode="decimal"
            onChange={(e) => {
              setTouched(true);
              setValue(e.target.value);
            }}
            aria-invalid={amount === null}
            className={`h-10 ${field}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={fromId} className="text-sm font-medium">
            {t("from")}
          </label>
          <select id={fromId} value={from} onChange={(e) => setFrom(e.target.value)} className={`h-10 ${field}`}>
            {units[category].map((unit) => (
              <option key={unit.id} value={unit.id}>
                {name(unit.id)} ({unit.symbol})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          className="grid h-10 w-10 place-items-center self-end rounded-xl border border-border-strong text-muted hover:border-brand hover:text-brand"
        >
          <ArrowLeftRight aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">{t("swap")}</span>
        </button>
        <div className="flex flex-col gap-1">
          <label htmlFor={toId} className="text-sm font-medium">
            {t("to")}
          </label>
          <select id={toId} value={to} onChange={(e) => setTo(e.target.value)} className={`h-10 ${field}`}>
            {units[category].map((unit) => (
              <option key={unit.id} value={unit.id}>
                {name(unit.id)} ({unit.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>
      {amount === null ? (
        <p className="text-sm text-danger">{t("invalidNumber")}</p>
      ) : (
        <>
          <p className="font-display text-2xl font-bold" role="status" data-testid="unit-result">
            {format(amount)} {symbol(from)} = {format(result!)} {symbol(to)}
          </p>
          <table className="w-full text-left text-sm">
            <caption className="mb-2 text-left text-sm font-medium text-muted">{t("allUnits", { value: `${format(amount)} ${symbol(from)}` })}</caption>
            <tbody>
              {units[category].map((unit) => (
                <tr key={unit.id} className="border-t border-border">
                  <td className="py-1.5 pr-3">{name(unit.id)}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">
                    {format(convertUnit(amount, category, from, unit.id))} {unit.symbol}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
