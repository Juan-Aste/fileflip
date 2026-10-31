"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { tools } from "@/config/tools";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ConversionError, errorCode } from "@/lib/convert-error";
import type { ApiErrorCode } from "@/lib/api-errors";
import { writeTableSheets } from "@/lib/data/client";
import { openPdf } from "@/lib/pdf/render";
import { extractPdfTables, groupTables, type PdfTable, type TableOptions } from "@/lib/pdf/tables";
import type { SheetOptions } from "@/lib/sheet/sheet";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "./Checkbox";
import ChoiceGroup from "./ChoiceGroup";
import ToolAlert from "./ToolAlert";
import ToolShell from "./shell/ToolShell";
import type { ShellOutput } from "./shell/state";

type Target = "xlsx" | "csv";
type Grouping = "page" | "table" | "all";
type Decimal = NonNullable<TableOptions["decimal"]>;

const PREVIEW_ROWS = 12;
const baseName = (name: string) => name.replace(/\.pdf$/i, "") || "tables";
const safePart = (sheet: string) => sheet.replace(/[\\/:*?"<>|]+/g, "_").trim() || "sheet";

type Reading = { status: "idle" | "reading" } | { status: "ready"; tables: PdfTable[] } | { status: "failed"; code: ApiErrorCode };

/** Tables of a PDF with text into XLSX or CSV; pdf.js reads the text in the browser. */
export default function PdfToExcelTool() {
  const t = useTranslations("PdfExcelTool");
  const ts = useTranslations("SheetTool");
  const te = useTranslations("ApiErrors");
  const tt = useTranslations("Tools.pdf-to-excel");
  const locale = useLocale() as Locale;
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState<Reading>({ status: "idle" });
  const [shown, setShown] = useState(0);
  const [to, setTo] = useState<Target>("xlsx");
  const [grouping, setGrouping] = useState<Grouping>("page");
  const [decimal, setDecimal] = useState<Decimal>("auto");
  const [delimiter, setDelimiter] = useState<SheetOptions["delimiter"]>(",");
  const [bom, setBom] = useState(true);
  const previewId = useId();

  useEffect(() => {
    if (!file) {
      setReading({ status: "idle" });
      return;
    }
    let cancelled = false;
    setReading({ status: "reading" });
    (async () => {
      let doc;
      try {
        doc = await openPdf(file);
      } catch (error) {
        throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
      }
      try {
        return await extractPdfTables(doc, { decimal });
      } finally {
        void doc.loadingTask.destroy();
      }
    })().then(
      (tables) => {
        if (cancelled) return;
        setReading({ status: "ready", tables });
        setShown((n) => Math.min(n, tables.length - 1));
      },
      (error) => !cancelled && setReading({ status: "failed", code: errorCode(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, [file, decimal]);

  const tables = reading.status === "ready" ? reading.tables : [];
  const table = tables[shown];
  const found = tables.filter((tb) => tb.detected).length;
  const names = { page: (n: number) => t("sheetPage", { n }), table: (n: number) => t("sheetTable", { n }), all: t("sheetAll") };

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["pdf"], multiple: false, maxFileBytes: tools["pdf-to-excel"].limits.maxFileBytes, ready: reading.status === "ready" }}
      actionLabel={tt("action")}
      zipName="fileflect-tables.zip"
      onFilesChange={(files) => {
        setFile(files[0] ?? null);
        setShown(0);
      }}
      options={
        <div className="flex flex-col gap-4">
          {reading.status === "reading" && (
            <p role="status" className="text-sm text-muted">
              {t("reading")}
            </p>
          )}
          {reading.status === "failed" &&
            (reading.code === "pdfIsScanned" ? (
              <div role="alert" className="flex flex-col gap-2 rounded-xl border border-brand/20 bg-brand-soft p-4 text-sm">
                <p>{t("scanned")}</p>
                <p>
                  <Link href={`/${tools["ocr-pdf"].slugs[locale]}`} className="font-medium text-brand underline-offset-2 hover:underline">
                    {t("scannedLink")}
                  </Link>
                </p>
              </div>
            ) : (
              <ToolAlert>{te(reading.code)}</ToolAlert>
            ))}
          {reading.status === "ready" && (
            <>
              <p className="text-sm" role="status">
                {found > 0 ? t("found", { count: found }) : t("noTable")}
              </p>
              {tables.length > 1 && (
                <div className="flex flex-col gap-1">
                  <label htmlFor={previewId} className="text-sm font-medium">
                    {t("previewOf")}
                  </label>
                  <select id={previewId} value={shown} onChange={(e) => setShown(Number(e.target.value))} className={`h-10 max-w-sm ${field}`}>
                    {tables.map((tb, i) => (
                      <option key={i} value={i}>
                        {t("tableOption", { page: tb.page, rows: tb.rows.length, columns: tb.rows[0]?.length ?? 0 })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {table && <TablePreview table={table} caption={t("previewCaption", { page: table.page })} more={(n) => t("moreRows", { count: n })} />}
              <ChoiceGroup
                legend={ts("target")}
                value={to}
                onChange={setTo}
                options={[
                  { value: "xlsx", label: ts("targets.xlsx") },
                  { value: "csv", label: ts("targets.csv") },
                ]}
              />
              {tables.length > 1 && (
                <ChoiceGroup
                  legend={t("grouping")}
                  value={grouping}
                  onChange={setGrouping}
                  options={[
                    { value: "page", label: to === "csv" ? t("groupPageCsv") : t("groupPage") },
                    { value: "table", label: to === "csv" ? t("groupTableCsv") : t("groupTable") },
                    { value: "all", label: to === "csv" ? t("groupAllCsv") : t("groupAll") },
                  ]}
                />
              )}
            </>
          )}
          {reading.status !== "failed" && (
            <ChoiceGroup
              legend={t("decimal")}
              value={decimal}
              onChange={setDecimal}
              options={[
                { value: "auto", label: t("decimalAuto") },
                { value: ",", label: t("decimalComma") },
                { value: ".", label: t("decimalPoint") },
              ]}
            />
          )}
          {to === "csv" && reading.status === "ready" && (
            <>
              <ChoiceGroup
                legend={ts("delimiter")}
                value={delimiter}
                onChange={setDelimiter}
                options={[
                  { value: ",", label: ts("delimiterComma") },
                  { value: ";", label: ts("delimiterSemicolon") },
                  { value: "\t", label: ts("delimiterTab") },
                ]}
              />
              <Checkbox checked={bom} onChange={setBom} label={ts("bom")} />
            </>
          )}
          <p className="text-sm text-muted">{t("note")}</p>
        </div>
      }
      process={async ({ files }) => {
        const source = files[0]!;
        const base = baseName(source.name);
        const sheets = groupTables(tables, tables.length > 1 ? grouping : "all", tables.length > 1 ? names : { ...names, all: base.slice(0, 31) });
        try {
          const out = await trackTool(
            "pdf-to-excel",
            { from: "pdf", to, files: [source] },
            () => writeTableSheets(sheets, { to, delimiter, bom }),
            (result) => result.reduce((sum, f) => sum + f.bytes.length, 0),
          );
          const type = to === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv;charset=utf-8";
          return out.map((f): ShellOutput => ({
            kind: "file",
            name: f.sheet ? `${base}-${safePart(f.sheet)}.${to}` : `${base}.${to}`,
            blob: new Blob([f.bytes as Uint8Array<ArrayBuffer>], { type }),
          }));
        } catch (error) {
          return [{ kind: "error", name: source.name, code: errorCode(error) }];
        }
      }}
    />
  );
}

function TablePreview({ table, caption, more }: { table: PdfTable; caption: string; more: (count: number) => string }) {
  const locale = useLocale();
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 15 });
  const rows = table.rows.slice(0, PREVIEW_ROWS);
  const width = Math.max(0, ...table.rows.map((r) => r.length));
  return (
    <div className="flex flex-col gap-1">
      <div className="max-h-80 overflow-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label={caption}>
        <table className="w-full border-collapse text-left text-sm" data-testid="table-preview">
          <caption className="sr-only">{caption}</caption>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i === 0 && table.detected ? "bg-surface-2 font-medium" : "border-t border-border"}>
                {Array.from({ length: width }, (_, j) => {
                  const value = row[j] ?? null;
                  return (
                    <td key={j} className={`whitespace-nowrap px-3 py-1.5 ${typeof value === "number" ? "text-right tabular-nums" : ""}`}>
                      {value === null ? "" : typeof value === "number" ? number.format(value) : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.rows.length > PREVIEW_ROWS && <p className="text-xs text-muted">{more(table.rows.length - PREVIEW_ROWS)}</p>}
    </div>
  );
}
