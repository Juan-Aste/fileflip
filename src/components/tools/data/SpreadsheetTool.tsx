"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import type { FormatId } from "@/config/formats";
import { tools, type ToolId } from "@/config/tools";
import { field } from "@/components/ui/styles";
import { convertSpreadsheetFile, listSpreadsheetSheets } from "@/lib/data/client";
import { runBatch } from "@/lib/jobs";
import type { SheetOptions, SheetSummary, SheetTarget } from "@/lib/sheet/sheet";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import type { ShellOutput } from "../shell/state";

/** A conversion with its own page: fixed inputs and output (the general converter lets you pick). */
export interface SheetPreset {
  id: ToolId;
  extensions: readonly string[];
  to: SheetTarget;
}

const allExtensions = ["xlsx", "xls", "ods", "csv", "tsv"];
const targets: SheetTarget[] = ["xlsx", "ods", "csv"];
const mime: Record<SheetTarget, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  csv: "text/csv;charset=utf-8",
  json: "application/json",
};
const EXT = /\.(xlsx|xls|ods|csv|tsv|json)$/i;
const baseName = (name: string) => name.replace(EXT, "") || "spreadsheet";
const sourceFormat = (name: string): FormatId => (EXT.exec(name)?.[1]?.toLowerCase() ?? "csv") as FormatId;
/** A sheet name as part of a file name. */
const safePart = (sheet: string) => sheet.replace(/[\\/:*?"<>|]+/g, "_").trim() || "sheet";

/** Picker value meaning every sheet (one CSV each, or one JSON object with a list per sheet). */
const ALL = "\u0000all";

/**
 * XLSX, XLS, ODS, CSV, TSV and JSON ↔ XLSX, ODS, CSV and JSON, in the data
 * worker. Without a preset it is the general converter (pick the output).
 */
export default function SpreadsheetTool({ preset }: { preset?: SheetPreset }) {
  const t = useTranslations("SheetTool");
  const id = preset?.id ?? "spreadsheet-converter";
  const tt = useTranslations(`Tools.${id}`);
  const [picked, setTo] = useState<SheetTarget>("xlsx");
  const to = preset?.to ?? picked;
  const [allSheets, setAllSheets] = useState(!preset);
  const [delimiter, setDelimiter] = useState<SheetOptions["delimiter"]>(",");
  const [bom, setBom] = useState(true);
  const [json, setJson] = useState<NonNullable<SheetOptions["json"]>>("objects");
  // With one workbook picked, its sheets can be chosen by name.
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetSummary[] | null>(null);
  const [sheet, setSheet] = useState<string>(ALL);
  const sheetId = useId();
  const perSheet = to === "csv" || to === "json";

  // Read as soon as the file is picked; until then the picker shows it is reading,
  // with the same height, so the options never move under the pointer.
  useEffect(() => {
    setSheets(null);
    if (!file) return;
    const controller = new AbortController();
    listSpreadsheetSheets(file, { signal: controller.signal })
      .then((list) => {
        setSheets(list);
        // The general converter keeps every sheet by default; a conversion page takes the first.
        setSheet(preset || list.length === 1 ? list[0]!.name : ALL);
      })
      // A damaged file fails again (with its message) when converted.
      .catch(() => !controller.signal.aborted && setSheets([]));
    return () => controller.abort();
  }, [file, preset]);

  const named = perSheet && !!sheets && sheets.length > 1;

  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: preset?.extensions ?? allExtensions,
        multiple: true,
        maxFileBytes: tools[id].limits.maxFileBytes,
      }}
      actionLabel={tt("action")}
      zipName={`fileflect-${to === "json" ? "json" : "spreadsheets"}.zip`}
      onFilesChange={(files) => setFile(files.length === 1 ? files[0]! : null)}
      options={
        <div className="flex flex-col gap-4">
          {!preset && (
            <ChoiceGroup legend={t("target")} value={picked} onChange={setTo} options={targets.map((f) => ({ value: f, label: t(`targets.${f}`) }))} />
          )}
          {perSheet &&
            (file ? (
              sheets?.length !== 0 && (
                <div className="flex flex-col gap-1">
                  <label htmlFor={sheetId} className="text-sm font-medium">
                    {t("sheet")}
                  </label>
                  <select
                    id={sheetId}
                    value={sheets ? sheet : ""}
                    disabled={!sheets || sheets.length < 2}
                    onChange={(e) => setSheet(e.target.value)}
                    className={`h-10 max-w-sm ${field}`}
                  >
                    {!sheets && <option value="">{t("sheetLoading")}</option>}
                    {sheets?.map((s) => (
                      <option key={s.name} value={s.name}>
                        {t("sheetOption", { name: s.name, rows: s.rows })}
                      </option>
                    ))}
                    {named && <option value={ALL}>{to === "json" ? t("sheetAllJson") : t("sheetAll")}</option>}
                  </select>
                </div>
                )
            ) : (
              <Checkbox checked={allSheets} onChange={setAllSheets} label={to === "json" ? t("allSheetsJson") : t("allSheets")} />
            ))}
          {to === "csv" && (
            <>
              <ChoiceGroup
                legend={t("delimiter")}
                value={delimiter}
                onChange={setDelimiter}
                options={[
                  { value: ",", label: t("delimiterComma") },
                  { value: ";", label: t("delimiterSemicolon") },
                  { value: "\t", label: t("delimiterTab") },
                ]}
              />
              <Checkbox checked={bom} onChange={setBom} label={t("bom")} />
            </>
          )}
          {to === "json" && (
            <ChoiceGroup
              legend={t("jsonShape")}
              value={json}
              onChange={setJson}
              options={[
                { value: "objects", label: t("jsonObjects") },
                { value: "arrays", label: t("jsonArrays") },
              ]}
            />
          )}
          <p className="text-sm text-muted">{to === "json" ? t("noteJson") : perSheet ? t("noteCsv") : t("note")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const chosen = files.length === 1 && named && sheet !== ALL ? sheet : undefined;
        const options: SheetOptions = {
          to,
          sheets: (named ? sheet === ALL : allSheets) ? "all" : "first",
          ...(chosen !== undefined && { sheet: chosen }),
          delimiter,
          bom,
          json,
        };
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              id,
              { from: sourceFormat(file.name), to, files: [file] },
              () => convertSpreadsheetFile(file, options, { signal: job.signal }),
              (out) => out.reduce((sum, f) => sum + f.bytes.length, 0),
            ),
          { signal, onProgress },
        );
        const used = new Set<string>();
        return results.flatMap((result, i): ShellOutput[] => {
          const base = baseName(files[i]!.name);
          if (result.status === "error") return [{ kind: "error", name: files[i]!.name, code: result.code }];
          return result.value.map((out) => {
            // One chosen sheet of a workbook is named after it too.
            const part = out.sheet || chosen;
            const stem = part ? `${base}-${safePart(part)}` : base;
            // book.xlsx and book.ods both become book.csv: keep both in the ZIP.
            let name = `${stem}.${to}`;
            for (let n = 2; used.has(name); n++) name = `${stem}-${n}.${to}`;
            used.add(name);
            return { kind: "file", name, blob: new Blob([out.bytes as Uint8Array<ArrayBuffer>], { type: mime[to] }) };
          });
        });
      }}
    />
  );
}
