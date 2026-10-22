"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { tools } from "@/config/tools";
import { convertFontFile } from "@/lib/data/client";
import type { FontContainer } from "@/lib/font/font";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import type { ShellOutput } from "../shell/state";

const extensions = ["ttf", "otf", "woff", "woff2"];
const targets: FontContainer[] = ["woff2", "woff", "sfnt"];
const mime = { ttf: "font/ttf", otf: "font/otf", woff: "font/woff", woff2: "font/woff2" } as const;
const baseName = (name: string) => name.replace(/\.(ttf|otf|woff2?)$/i, "") || "font";
const sourceFormat = (name: string) => (/\.(ttf|otf|woff2?)$/i.exec(name)?.[1]?.toLowerCase() ?? "ttf") as keyof typeof mime;

/** The @font-face rule for a web font, ready to paste into a stylesheet. */
const fontFace = (family: string, file: string, format: "woff" | "woff2") =>
  `@font-face {\n  font-family: "${family.replace(/["\\]/g, "")}";\n  src: url("${file}") format("${format}");\n  font-display: swap;\n}\n`;

export default function FontConverterTool() {
  const t = useTranslations("FontTools");
  const tt = useTranslations("Tools.font-converter");
  const [target, setTarget] = useState<FontContainer>("woff2");

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: tools["font-converter"].limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-fonts.zip"
      options={
        <div className="flex flex-col gap-3">
          <ChoiceGroup legend={t("target")} value={target} onChange={setTarget} options={targets.map((f) => ({ value: f, label: t(`targets.${f}`) }))} />
          <p className="text-sm text-muted">{t("note")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "font-converter",
              { from: sourceFormat(file.name), to: target === "sfnt" ? "ttf" : target, files: [file] },
              () => convertFontFile(file, target, { signal: job.signal }),
              (r) => r.bytes.length,
            ),
          { signal, onProgress },
        );
        const used = new Set<string>();
        return results.map((result, i): ShellOutput => {
          if (result.status === "error") return { kind: "error", name: files[i]!.name, code: result.code };
          const ext = target === "sfnt" ? result.value.flavor : target;
          // font.ttf and font.otf both become font.woff2: keep both in the ZIP.
          let base = baseName(files[i]!.name);
          for (let n = 2; used.has(`${base}.${ext}`); n++) base = `${baseName(files[i]!.name)}-${n}`;
          const name = `${base}.${ext}`;
          used.add(name);
          return {
            kind: "file",
            name,
            blob: new Blob([result.value.bytes.slice().buffer], { type: mime[ext] }),
            preview: target === "sfnt" ? undefined : fontFace(base, name, target),
          };
        });
      }}
    />
  );
}
