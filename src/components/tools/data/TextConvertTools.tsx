"use client";

import { useTranslations } from "next-intl";
import type { FormatId } from "@/config/formats";
import { formats } from "@/config/formats";
import { tools, type ToolId } from "@/config/tools";
import { convertText, type TextConversion } from "@/lib/data/client";
import ToolShell from "../shell/ToolShell";
import { runTextTool } from "./textTool";

interface Props {
  id: ToolId;
  method: TextConversion;
  from: FormatId;
  to: FormatId;
  placeholder: string;
}

/** A data conversion without options: pick files or paste, convert, download or copy. */
function TextConvertTool({ id, method, from, to, placeholder }: Props) {
  const t = useTranslations("DataTools");
  const tt = useTranslations(`Tools.${id}`);
  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: [...formats[from].extensions, "txt"],
        multiple: true,
        maxFileBytes: tools[id].limits.maxFileBytes,
        paste: { label: t("paste", { format: formats[from].label }), placeholder },
      }}
      actionLabel={tt("action")}
      zipName={`fileflect-${formats[to].extensions[0]}.zip`}
      process={(input, context) =>
        runTextTool(input, context, {
          tool: id,
          from: () => from,
          to,
          pastedName: `data.${formats[from].extensions[0]}`,
          convert: (source, job) => convertText(method, source, job),
        })
      }
    />
  );
}

export const JsonToYamlTool = () => (
  <TextConvertTool id="json-to-yaml" method="jsonToYaml" from="json" to="yaml" placeholder='{"name": "web", "ports": [80, 443]}' />
);
export const YamlToJsonTool = () => (
  <TextConvertTool id="yaml-to-json" method="yamlToJson" from="yaml" to="json" placeholder={"name: web\nports:\n  - 80\n  - 443"} />
);
export const JsonToTomlTool = () => (
  <TextConvertTool id="json-to-toml" method="jsonToToml" from="json" to="toml" placeholder='{"title": "Demo", "owner": {"name": "Ana"}}' />
);
export const TomlToJsonTool = () => (
  <TextConvertTool id="toml-to-json" method="tomlToJson" from="toml" to="json" placeholder={'title = "Demo"\n\n[owner]\nname = "Ana"'} />
);
