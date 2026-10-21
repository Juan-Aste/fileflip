"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { tools } from "@/config/tools";
import { convertJsonToCsv } from "@/lib/data/client";
import type { Delimiter } from "@/lib/data/csv";
import ChoiceGroup from "./ChoiceGroup";
import Checkbox from "./Checkbox";
import { runTextTool } from "./data/textTool";
import ToolShell from "./shell/ToolShell";

export default function JsonToCsvTool() {
  const t = useTranslations("DataTools");
  const tt = useTranslations("Tools.json-to-csv");
  const [delimiter, setDelimiter] = useState<Delimiter>(",");
  const [bom, setBom] = useState(true);
  const [flatten, setFlatten] = useState(true);

  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: ["json"],
        multiple: true,
        maxFileBytes: tools["json-to-csv"].limits.maxFileBytes,
        paste: { label: t("pasteJson"), placeholder: '[{"name": "Ana", "city": "Lima"}]' },
      }}
      actionLabel={tt("action")}
      zipName="fileflect-csv.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("delimiter")}
            value={delimiter}
            onChange={setDelimiter}
            options={[
              { value: ",", label: t("comma") },
              { value: ";", label: t("semicolon") },
              { value: "\t", label: t("tab") },
            ]}
          />
          <Checkbox checked={flatten} onChange={setFlatten} label={t("flatten")} />
          <Checkbox checked={bom} onChange={setBom} label={t("bom")} />
        </div>
      }
      process={(input, context) =>
        runTextTool(input, context, {
          tool: "json-to-csv",
          from: () => "json",
          to: delimiter === "\t" ? "tsv" : "csv",
          pastedName: "data.json",
          convert: (source, job) => convertJsonToCsv(source, { delimiter, bom, flatten }, job),
        })
      }
    />
  );
}
