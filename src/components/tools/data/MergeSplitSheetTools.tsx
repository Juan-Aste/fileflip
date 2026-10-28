"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { tools } from "@/config/tools";
import { mergeSpreadsheetFiles, splitSpreadsheetFile } from "@/lib/data/client";
import { errorCode } from "@/lib/convert-error";
import { runBatch } from "@/lib/jobs";
import type { MergeOptions, SheetOptions, SplitOptions } from "@/lib/sheet/sheet";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import type { ShellOutput } from "../shell/state";

const mime = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  csv: "text/csv;charset=utf-8",
};
const baseName = (name: string) => name.replace(/\.(xlsx|xls|ods|csv|tsv)$/i, "") || "spreadsheet";
const safePart = (sheet: string) => sheet.replace(/[\\/:*?"<>|]+/g, "_").trim() || "sheet";

/** Several spreadsheets (or the sheets of one) into one workbook. */
export function MergeExcelTool() {
  const t = useTranslations("SheetTool");
  const tt = useTranslations("Tools.merge-excel");
  const [mode, setMode] = useState<MergeOptions["mode"]>("sheets");
  const [to, setTo] = useState<MergeOptions["to"]>("xlsx");
  const [skipHeader, setSkipHeader] = useState(true);
  const [source, setSource] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: ["xlsx", "xls", "ods", "csv", "tsv"],
        multiple: true,
        reorderable: true,
        maxFileBytes: tools["merge-excel"].limits.maxFileBytes,
        // One file only makes sense to stack its own sheets.
        ready: count >= 2 || (count === 1 && mode === "stack"),
      }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setCount(files.length)}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("mergeMode")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "sheets", label: t("mergeSheets") },
              { value: "stack", label: t("mergeStack") },
            ]}
          />
          {mode === "stack" && (
            <>
              <Checkbox checked={skipHeader} onChange={setSkipHeader} label={t("skipHeader")} />
              <Checkbox checked={source} onChange={setSource} label={t("sourceColumn")} />
            </>
          )}
          <ChoiceGroup
            legend={t("target")}
            value={to}
            onChange={setTo}
            options={[
              { value: "xlsx", label: t("targets.xlsx") },
              { value: "ods", label: t("targets.ods") },
            ]}
          />
          <p className="text-sm text-muted">{mode === "stack" ? t("noteStack") : t("noteMerge")}</p>
        </div>
      }
      process={async ({ files }) => {
        const options: MergeOptions = {
          mode,
          to,
          skipRepeatedHeader: skipHeader,
          stackedName: t("mergedSheet"),
          ...(source && { sourceColumn: t("sourceHeader") }),
        };
        const name = `${t("mergedFile")}.${to}`;
        try {
          const out = await trackTool(
            "merge-excel",
            { from: "xlsx", to, files },
            () => mergeSpreadsheetFiles(files, options),
            (result) => result.bytes.length,
          );
          return [{ kind: "file", name, blob: new Blob([out.bytes as Uint8Array<ArrayBuffer>], { type: mime[to] }) }];
        } catch (error) {
          return [{ kind: "error", name, code: errorCode(error) }];
        }
      }}
    />
  );
}

/** Each sheet of a workbook as its own file (all of them in a ZIP). */
export function SplitExcelTool() {
  const t = useTranslations("SheetTool");
  const tt = useTranslations("Tools.split-excel");
  const [to, setTo] = useState<SplitOptions["to"]>("xlsx");
  const [delimiter, setDelimiter] = useState<SheetOptions["delimiter"]>(",");
  const [bom, setBom] = useState(true);

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["xlsx", "xls", "ods"], multiple: true, maxFileBytes: tools["split-excel"].limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-sheets.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("splitTarget")}
            value={to}
            onChange={setTo}
            options={[
              { value: "xlsx", label: t("targets.xlsx") },
              { value: "ods", label: t("targets.ods") },
              { value: "csv", label: t("targets.csv") },
            ]}
          />
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
          <p className="text-sm text-muted">{t("noteSplit")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "split-excel",
              { from: "xlsx", to, files: [file] },
              () => splitSpreadsheetFile(file, { to, delimiter, bom }, { signal: job.signal }),
              (out) => out.reduce((sum, f) => sum + f.bytes.length, 0),
            ),
          { signal, onProgress },
        );
        const used = new Set<string>();
        return results.flatMap((result, i): ShellOutput[] => {
          if (result.status === "error") return [{ kind: "error", name: files[i]!.name, code: result.code }];
          const base = baseName(files[i]!.name);
          return result.value.map((out) => {
            const stem = `${base}-${safePart(out.sheet)}`;
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
