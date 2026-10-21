"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { tools } from "@/config/tools";
import { convertCsvToJson } from "@/lib/data/client";
import type { Delimiter } from "@/lib/data/csv";
import ChoiceGroup from "./ChoiceGroup";
import Checkbox from "./Checkbox";
import { runTextTool } from "./data/textTool";
import { extensionOf } from "./shell/state";
import ToolShell from "./shell/ToolShell";

export default function CsvToJsonTool() {
  const t = useTranslations("DataTools");
  const tt = useTranslations("Tools.csv-to-json");
  const [delimiter, setDelimiter] = useState<Delimiter | "">("");
  const [typed, setTyped] = useState(true);
  const [nested, setNested] = useState(true);

  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: ["csv", "tsv", "tab", "txt"],
        multiple: true,
        maxFileBytes: tools["csv-to-json"].limits.maxFileBytes,
        paste: { label: t("pasteCsv"), placeholder: "name,city\nAna,Lima" },
      }}
      actionLabel={tt("action")}
      zipName="fileflect-json.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("delimiter")}
            value={delimiter}
            onChange={setDelimiter}
            options={[
              { value: "", label: t("auto") },
              { value: ",", label: t("comma") },
              { value: ";", label: t("semicolon") },
              { value: "\t", label: t("tab") },
            ]}
          />
          <Checkbox checked={typed} onChange={setTyped} label={t("typed")} />
          <Checkbox checked={nested} onChange={setNested} label={t("nested")} />
        </div>
      }
      process={(input, context) =>
        runTextTool(input, context, {
          tool: "csv-to-json",
          from: (file) => (file && ["tsv", "tab"].includes(extensionOf(file.name)) ? "tsv" : "csv"),
          to: "json",
          pastedName: "data.csv",
          // A .tsv file is tab-separated even when the user left "detect" on.
          convert: (source, job) =>
            convertCsvToJson(
              source,
              { delimiter: delimiter || (source instanceof File && ["tsv", "tab"].includes(extensionOf(source.name)) ? "\t" : ""), typed, nested },
              job,
            ),
        })
      }
    />
  );
}
