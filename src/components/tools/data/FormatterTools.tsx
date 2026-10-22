"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formats } from "@/config/formats";
import { tools, type ToolId } from "@/config/tools";
import { formatText } from "@/lib/data/client";
import type { Indent } from "@/lib/data/format";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { runTextTool } from "./textTool";

type Kind = "json" | "xml" | "yaml";
type Layout = "2" | "4" | "tab" | "min";

const ids: Record<Kind, ToolId> = { json: "json-formatter", xml: "xml-formatter", yaml: "yaml-formatter" };
const placeholders: Record<Kind, string> = {
  json: '{"name":"Ana","tags":["a","b"]}',
  xml: '<book id="1"><title>Rayuela</title></book>',
  yaml: "name: Ana\ntags: [a, b]",
};

/** Validates and re-indents (or minifies) JSON, XML or YAML, pointing at the first syntax error. */
function FormatterTool({ kind }: { kind: Kind }) {
  const t = useTranslations("DataTools");
  const id = ids[kind];
  const tt = useTranslations(`Tools.${id}`);
  const [layout, setLayout] = useState<Layout>("2");
  const [sortKeys, setSortKeys] = useState(false);
  const indent: Indent | null = layout === "min" ? null : layout === "tab" ? "tab" : (Number(layout) as 2 | 4);

  const layouts = [
    { value: "2" as const, label: t("indent2") },
    { value: "4" as const, label: t("indent4") },
    // YAML can't be indented with tabs, and "minified" YAML would just be JSON.
    ...(kind === "yaml" ? [] : [{ value: "tab" as const, label: t("indentTab") }, { value: "min" as const, label: t("minify") }]),
  ];

  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: [...formats[kind].extensions, "txt"],
        multiple: true,
        maxFileBytes: tools[id].limits.maxFileBytes,
        paste: { label: t("paste", { format: formats[kind].label }), placeholder: placeholders[kind] },
      }}
      actionLabel={tt("action")}
      zipName={`fileflect-${kind}.zip`}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("layout")} value={layout} onChange={setLayout} options={layouts} />
          {kind === "json" && <Checkbox checked={sortKeys} onChange={setSortKeys} label={t("sortKeys")} />}
        </div>
      }
      process={(input, context) =>
        runTextTool(input, context, {
          tool: id,
          from: () => kind,
          to: kind,
          pastedName: `data.${formats[kind].extensions[0]}`,
          convert: (source, job) =>
            formatText(
              kind === "json"
                ? { method: "formatJson", options: { indent, sortKeys } }
                : kind === "xml"
                  ? { method: "formatXml", options: { indent } }
                  : { method: "formatYaml", options: { indent: indent === 4 ? 4 : 2 } },
              source,
              job,
            ),
        })
      }
    />
  );
}

export const JsonFormatterTool = () => <FormatterTool kind="json" />;
export const XmlFormatterTool = () => <FormatterTool kind="xml" />;
export const YamlFormatterTool = () => <FormatterTool kind="yaml" />;
