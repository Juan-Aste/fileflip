"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { field as fieldStyle } from "@/components/ui/styles";
import { tools } from "@/config/tools";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { ApiErrorCode } from "@/lib/api-errors";
import { errorCode } from "@/lib/convert-error";
import { fillPdfForm, readPdfForm } from "@/lib/pdf/client";
import type { FormFieldInfo, FormInfo, FormValues } from "@/lib/pdf/form";
import { canvasToBlob, openPdf, renderPage } from "@/lib/pdf/render";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "./Checkbox";
import PrimaryButton from "./PrimaryButton";
import SinglePdfInput from "./SinglePdfInput";
import ToolAlert from "./ToolAlert";
import ToolResult from "./ToolResult";
import { useSinglePdf } from "./useSinglePdf";

type Reading = { status: "idle" | "reading" } | { status: "ready"; form: FormInfo } | { status: "failed"; code: ApiErrorCode };
/** A box on the preview, in % of the page (left, top, width, height). */
type Box = [number, number, number, number];
type Preview = { page: number; url: string; ratio: number; boxes: { name: string; on?: string; box: Box }[] };

/** "persona.nombre_completo[0]" → "nombre completo": the field's own name when the author gave no tooltip. */
const prettyName = (name: string) => name.split(".").at(-1)!.replace(/\[\d+\]$/, "").replace(/[_-]+/g, " ").trim() || name;

const initialValue = (f: FormFieldInfo): FormValues[string] =>
  f.kind === "checkbox" ? f.value === "true" : f.kind === "list" || (f.kind === "dropdown" && f.multiselect) ? [f.value].flat() : [f.value].flat()[0] ?? "";

/** Fill PDF forms (AcroForm) in the browser with pdf-lib; the page preview is drawn by pdf.js. */
export default function FillPdfFormTool() {
  const t = useTranslations("FillPdfForm");
  const tu = useTranslations("ToolUi");
  const tt = useTranslations("Tools.fill-pdf-form");
  const te = useTranslations("ApiErrors");
  const locale = useLocale() as Locale;
  const baseId = useId();
  const pdf = useSinglePdf();
  const [reading, setReading] = useState<Reading>({ status: "idle" });
  const [values, setValues] = useState<FormValues>({});
  const [flatten, setFlatten] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const [result, setResult] = useState<{ blob: Blob; unsupported: string[]; flattened: boolean } | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);

  const fields = useMemo(() => (reading.status === "ready" ? reading.form.fields : []), [reading]);
  const fillable = fields.filter((f) => f.kind !== "signature");
  const inputId = (name: string) => `${baseId}-${name.replace(/[^\w-]/g, "_")}`;
  const labelOf = (f: FormFieldInfo) => f.label ?? prettyName(f.name);

  // Read the fields when a PDF is chosen.
  useEffect(() => {
    setReading({ status: "idle" });
    setPreview(null);
    setFocused(null);
    setError(null);
    if (!pdf.file) return;
    let cancelled = false;
    setReading({ status: "reading" });
    readPdfForm(pdf.file)
      .then((form) => {
        if (cancelled) return;
        setValues(Object.fromEntries(form.fields.map((f) => [f.name, initialValue(f)])));
        setReading({ status: "ready", form });
      })
      .catch((e) => !cancelled && setReading({ status: "failed", code: errorCode(e) }));
    return () => {
      cancelled = true;
    };
  }, [pdf.file]);

  // pdf.js document for the preview, kept while the file is the same.
  useEffect(() => {
    return () => {
      void docRef.current?.loadingTask.destroy();
      docRef.current = null;
    };
  }, [pdf.file]);

  const previewPage = fields.find((f) => f.name === focused)?.page ?? fillable.find((f) => f.page !== undefined)?.page;

  // Preview of the page of the field being filled, with every field's box.
  useEffect(() => {
    if (!pdf.file || previewPage === undefined) return;
    if (preview?.page === previewPage) return;
    let cancelled = false;
    let url = "";
    (async () => {
      docRef.current ??= await openPdf(pdf.file!);
      const doc = docRef.current;
      const canvas = await renderPage(doc, previewPage, { scale: 1.2, maxSide: 1400 });
      const viewport = (await doc.getPage(previewPage + 1)).getViewport({ scale: 1 });
      const boxes = fields.flatMap((f) =>
        f.widgets
          .filter((w) => w.page === previewPage)
          .map((w) => {
            const [x1, y1] = viewport.convertToViewportPoint(w.rect[0], w.rect[1]) as [number, number];
            const [x2, y2] = viewport.convertToViewportPoint(w.rect[2], w.rect[3]) as [number, number];
            const left = Math.min(x1, x2) / viewport.width;
            const top = Math.min(y1, y2) / viewport.height;
            const box: Box = [left * 100, top * 100, (Math.abs(x2 - x1) / viewport.width) * 100, (Math.abs(y2 - y1) / viewport.height) * 100];
            return { name: f.name, on: w.on, box };
          }),
      );
      url = URL.createObjectURL(await canvasToBlob(canvas, "image/jpeg", 0.8));
      if (cancelled) URL.revokeObjectURL(url);
      else setPreview({ page: previewPage, url, ratio: canvas.width / canvas.height, boxes });
    })().catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, [pdf.file, previewPage, fields, preview?.page]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview.url)), [preview]);

  const set = (name: string, value: FormValues[string]) => setValues((v) => ({ ...v, [name]: value }));

  async function save() {
    if (!pdf.file) return;
    const file = pdf.file;
    setWorking(true);
    setError(null);
    try {
      // Only the fields people can change: read-only ones keep their value.
      const changed = Object.fromEntries(fillable.filter((f) => !f.readOnly).map((f) => [f.name, values[f.name]!]));
      setResult(await trackTool("fill-pdf-form", { from: "pdf", to: "pdf", files: [file] }, () => fillPdfForm(file, changed, flatten), (r) => r.blob.size));
    } catch (e) {
      console.error(e);
      setError(errorCode(e));
    } finally {
      setWorking(false);
    }
  }

  if (result && pdf.file) {
    const names = result.unsupported.map((n) => labelOf(fields.find((f) => f.name === n) ?? { name: n } as FormFieldInfo));
    return (
      <div className="flex flex-col gap-4">
        {names.length > 0 && (
          <p role="status" className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
            {flatten && !result.flattened ? t("notFlattened", { fields: names.join(", ") }) : t("redrawnByReader", { fields: names.join(", ") })}
          </p>
        )}
        <ToolResult
          blob={result.blob}
          filename={pdf.file.name.replace(/(\.pdf)?$/i, result.flattened ? "-flattened.pdf" : "-filled.pdf")}
          onReset={() => {
            setResult(null);
            pdf.clear();
          }}
        />
      </div>
    );
  }

  const editPdfLink = (
    <Link href={`/${tools["edit-pdf"].slugs[locale]}`} className="font-medium text-brand underline-offset-2 hover:underline">
      {t("editPdfLink")}
    </Link>
  );

  const pages = [...new Set(fillable.map((f) => f.page ?? -1))].sort((a, b) => (a < 0 ? 1 : b < 0 ? -1 : a - b));

  function control(f: FormFieldInfo) {
    const id = inputId(f.name);
    const value = values[f.name];
    const common = { id, disabled: f.readOnly, onFocus: () => setFocused(f.name) };
    switch (f.kind) {
      case "checkbox":
        return (
          <div onFocus={() => setFocused(f.name)}>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                {...common}
                type="checkbox"
                checked={value === true}
                onChange={(e) => set(f.name, e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-solid)]"
              />
              <span className="font-medium">{labelOf(f)}</span>
            </label>
          </div>
        );
      case "radio":
        return (
          <fieldset onFocus={() => setFocused(f.name)} disabled={f.readOnly}>
            <legend className="mb-1 text-sm font-medium">{labelOf(f)}</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {f.options!.map((o, i) => (
                <label key={o} className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    id={i === 0 ? id : undefined}
                    name={id}
                    checked={value === o}
                    onChange={() => set(f.name, o)}
                    className="h-4 w-4 accent-[var(--brand-solid)]"
                  />
                  {o}
                </label>
              ))}
              {value !== "" && !f.readOnly && (
                <button type="button" className="text-sm text-brand underline-offset-2 hover:underline" onClick={() => set(f.name, "")}>
                  {t("clearChoice")}
                </button>
              )}
            </div>
          </fieldset>
        );
      case "list":
      case "dropdown": {
        const label = <label htmlFor={id} className="text-sm font-medium">{labelOf(f)}</label>;
        if (f.multiselect) {
          const chosen = [value].flat() as string[];
          return (
            <fieldset onFocus={() => setFocused(f.name)} disabled={f.readOnly}>
              <legend className="mb-1 text-sm font-medium">{labelOf(f)}</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {f.options!.map((o, i) => (
                  <label key={o} className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      id={i === 0 ? id : undefined}
                      checked={chosen.includes(o)}
                      onChange={(e) => set(f.name, e.target.checked ? f.options!.filter((x) => x === o || chosen.includes(x)) : chosen.filter((x) => x !== o))}
                      className="h-4 w-4 accent-[var(--brand-solid)]"
                    />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        }
        if (f.editable) {
          return (
            <div className="flex flex-col gap-1">
              {label}
              <input {...common} list={`${id}-options`} value={String(value ?? "")} onChange={(e) => set(f.name, e.target.value)} className={`${fieldStyle} h-10`} />
              <datalist id={`${id}-options`}>
                {f.options!.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            {label}
            <select {...common} value={String(value ?? "")} onChange={(e) => set(f.name, e.target.value)} className={`${fieldStyle} h-10`}>
              <option value="">{t("noChoice")}</option>
              {f.options!.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        );
      }
      default: {
        const text = String(value ?? "");
        const props = { ...common, value: text, maxLength: f.maxLength, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(f.name, e.target.value) };
        return (
          <div className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm font-medium">
              {labelOf(f)}
              {f.readOnly && <span className="font-normal text-muted"> {t("readOnly")}</span>}
            </label>
            {f.multiline ? <textarea {...props} rows={3} className={`${fieldStyle} py-2`} /> : <input {...props} type="text" className={`${fieldStyle} h-10`} />}
            {f.maxLength !== undefined && <span className="text-xs text-muted">{t("maxLength", { count: f.maxLength })}</span>}
          </div>
        );
      }
    }
  }

  /** What the preview shows inside a field's box. */
  function shown(name: string, on?: string) {
    const f = fields.find((x) => x.name === name)!;
    const value = values[name];
    if (f.kind === "checkbox") return value === true ? "✓" : "";
    if (f.kind === "radio") return value === on ? "●" : "";
    if (f.kind === "signature") return "";
    return [value].flat().join(", ");
  }

  return (
    <div className="flex flex-col gap-4">
      <SinglePdfInput pdf={pdf} />
      {reading.status === "reading" && (
        <p role="status" className="text-sm text-muted">
          {t("reading")}
        </p>
      )}
      {reading.status === "failed" && <ToolAlert>{te(reading.code)}</ToolAlert>}
      {reading.status === "ready" && fillable.length === 0 && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-brand/20 bg-brand-soft p-4 text-sm">
          <p>{reading.form.xfa ? t("xfaOnly") : t("noFields")}</p>
          <p>{editPdfLink}</p>
        </div>
      )}
      {reading.status === "ready" && fillable.length > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
          <p className="text-sm text-muted">
            {t("found", { count: fillable.length })} {t("hint")}
          </p>
          {reading.form.xfa && <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{t("hybridXfa")}</p>}
          {fields.some((f) => f.kind === "signature") && (
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
              {t("signatureField")}{" "}
              <Link href={`/${tools["sign-pdf"].slugs[locale]}`} className="font-medium text-brand underline-offset-2 hover:underline">
                {t("signPdfLink")}
              </Link>
            </p>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              {pages.map((page) => (
                <section key={page} className="flex flex-col gap-4" aria-labelledby={`${baseId}-p${page}`}>
                  <h3 id={`${baseId}-p${page}`} className="border-b border-border pb-1 text-sm font-semibold text-muted">
                    {page >= 0 ? tu("pageLabel", { n: page + 1 }) : t("otherFields")}
                  </h3>
                  {fillable.filter((f) => (f.page ?? -1) === page).map((f) => (
                    <div key={f.name} data-field={f.name}>
                      {control(f)}
                    </div>
                  ))}
                </section>
              ))}
            </div>
            <div className="lg:sticky lg:top-4 lg:self-start">
              <div
                data-testid="form-preview"
                className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border border-border bg-white shadow"
                style={{ aspectRatio: preview ? String(preview.ratio) : "1 / 1.414" }}
              >
                {preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
                    <img src={preview.url} alt={tu("pageLabel", { n: preview.page + 1 })} draggable={false} className="absolute inset-0 h-full w-full" />
                    {preview.boxes.map(({ name, on, box: [left, top, width, height] }, i) => {
                      const f = fields.find((x) => x.name === name)!;
                      const active = name === focused;
                      return (
                        <button
                          key={`${name}-${i}`}
                          type="button"
                          tabIndex={-1}
                          aria-hidden="true"
                          disabled={f.readOnly || f.kind === "signature"}
                          onClick={() => document.getElementById(inputId(name))?.focus()}
                          className={`absolute overflow-hidden whitespace-pre-wrap rounded-sm border text-left leading-tight text-[#1d3f9e] ${active ? "border-brand ring-2 ring-brand" : "border-brand/50"} ${
                            // Opaque over text fields: some readers' drawings of the old value show through otherwise.
                            f.kind === "checkbox" || f.kind === "radio" ? (active ? "bg-brand/15" : "bg-brand/5") : "bg-white"
                          }`}
                          style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, fontSize: "clamp(6px, 1.6cqw, 11px)" }}
                        >
                          {shown(name, on)}
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-sm text-muted">{tu("loadingPages")}</span>
                )}
              </div>
            </div>
          </div>
          <Checkbox checked={flatten} onChange={setFlatten} label={t("flatten")} />
          <p className="-mt-2 text-xs text-muted">{t("flattenHint")}</p>
          {error && <ToolAlert>{te(error)}</ToolAlert>}
          <PrimaryButton onClick={save} disabled={working}>
            {working ? tu("working") : tt("action")}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
