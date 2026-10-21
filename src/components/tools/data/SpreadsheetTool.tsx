"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { convertSpreadsheetFile } from "@/lib/data/client";
import { runBatch } from "@/lib/jobs";
import type { SheetOptions, SheetTarget } from "@/lib/sheet/sheet";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import type { ShellOutput } from "../shell/state";

const extensions = ["xlsx", "xls", "ods", "csv", "tsv"];
const targets: SheetTarget[] = ["xlsx", "ods", "csv"];
const mime: Record<SheetTarget, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  csv: "text/csv;charset=utf-8",
};
const baseName = (name: string) => name.replace(/\.(xlsx|xls|ods|csv|tsv)$/i, "") || "spreadsheet";
const sourceFormat = (name: string): FormatId => {
  const ext = /\.(xlsx|xls|ods|csv|tsv)$/i.exec(name)?.[1]?.toLowerCase();
  return (ext ?? "csv") as FormatId;
};
/** A sheet name as part of a file name. */
const safePart = (sheet: string) => sheet.replace(/[\\/:*?"<>|]+/g, "_").trim() || "sheet";

/** XLSX, XLS, ODS, CSV and TSV ↔ XLSX, ODS and CSV, in the data worker. */
export default function SpreadsheetTool() {
  const t = useTranslations("SheetTool");
  const tt = useTranslations("Tools.spreadsheet-converter");
  const [to, setTo] = useState<SheetTarget>("xlsx");
  const [allSheets, setAllSheets] = useState(true);
  const [delimiter, setDelimiter] = useState<SheetOptions["delimiter"]>(",");
  const [bom, setBom] = useState(true);

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: tools["spreadsheet-converter"].limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-spreadsheets.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("target")} value={to} onChange={setTo} options={targets.map((f) => ({ value: f, label: t(`targets.${f}`) }))} />
          {to === "csv" && (
            <>
              <ChoiceGroup
                legend={t("delimiter")}
                value={delimiter}
                onChange={setDelimiter}
                options={[
                  { value: ",", label: t("delimiterComma") },
                  { value: ";", label: t("delimiterSemicolon") },
                ]}
              />
              <Checkbox checked={allSheets} onChange={setAllSheets} label={t("allSheets")} />
              <Checkbox checked={bom} onChange={setBom} label={t("bom")} />
            </>
          )}
          <p className="text-sm text-muted">{t("note")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const options: SheetOptions = { to, sheets: allSheets ? "all" : "first", delimiter, bom };
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "spreadsheet-converter",
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
            const stem = out.sheet ? `${base}-${safePart(out.sheet)}` : base;
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
