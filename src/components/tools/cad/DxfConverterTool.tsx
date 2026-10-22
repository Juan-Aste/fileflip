"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { tools } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import { dxfExtension, dxfMime, dxfPages, dxfPngWidths, dxfTargets, type DxfPage, type DxfPngWidth, type DxfTarget } from "@/lib/cad/options";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const tool = tools["dxf-converter"];
const engine = () => import("@/lib/cad/client");

/** DXF drawings → SVG, PNG or PDF, drawn by our own geometry in a worker (dxf-parser reads the file). */
export default function DxfConverterTool() {
  const t = useTranslations("DxfConverterTool");
  const tt = useTranslations("Tools.dxf-converter");
  const locale = useLocale() as Locale;
  const [target, setTarget] = useState<DxfTarget>("svg");
  const [background, setBackground] = useState(true);
  const [pngWidth, setPngWidth] = useState("2000");
  const [page, setPage] = useState<DxfPage>("a4");

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["dxf"], multiple: true, maxFileBytes: tool.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-dxf.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("target")} value={target} onChange={setTarget} options={dxfTargets.map((f) => ({ value: f, label: t(`targets.${f}`) }))} />
          {target === "png" && (
            <ChoiceGroup legend={t("pngWidth")} value={pngWidth} onChange={setPngWidth} options={dxfPngWidths.map((w) => ({ value: String(w), label: `${w.toLocaleString(locale)} px` }))} />
          )}
          {target === "pdf" ? (
            <ChoiceGroup legend={t("page")} value={page} onChange={setPage} options={(Object.keys(dxfPages) as DxfPage[]).map((p) => ({ value: p, label: t(`pages.${p}`) }))} />
          ) : (
            <Checkbox checked={background} onChange={setBackground} label={t("background")} />
          )}
          <p className="text-sm text-muted">{t("note")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "dxf-converter",
              { from: "dxf", to: target, files: [file] },
              async () => (await engine()).convertDxfInWorker(file, { to: target, background, pngWidth: Number(pngWidth) as DxfPngWidth, page, title: file.name.replace(/\.dxf$/i, "") }, { signal: job.signal, onProgress: job.onProgress, timeoutMs: tool.limits.timeoutMs }),
              (out) => out.data.length,
            ),
          { signal, onProgress },
        );
        const list = new Intl.ListFormat(locale, { type: "conjunction" });
        return results.map((result, i): ShellOutput => {
          const file = files[i]!;
          if (result.status === "error") return { kind: "error", name: file.name, code: result.code };
          const { data, shapes, texts, skipped } = result.value;
          const left = Object.entries(skipped).map(([type, n]) => `${type} × ${n.toLocaleString(locale)}`);
          const done = t("done", { shapes: shapes.toLocaleString(locale), texts: texts.toLocaleString(locale) });
          return {
            kind: "file",
            name: renameExtension(file.name, dxfExtension[target]),
            blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: dxfMime[target] }),
            message: { ok: true, text: left.length ? `${done} ${t("skipped", { list: list.format(left) })}` : done },
          };
        });
      }}
    />
  );
}
