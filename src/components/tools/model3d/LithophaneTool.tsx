"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import { lithophaneDetails, lithophaneThickness, lithophaneWidths } from "@/lib/model3d/lithophane";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const tool = tools["image-to-lithophane"];
const engine = () => import("@/lib/model3d/client");

type Detail = keyof typeof lithophaneDetails;
type Thickness = keyof typeof lithophaneThickness;

/** A photo → a lithophane plate (STL) to 3D print: thicker where the picture is darker. */
export default function LithophaneTool() {
  const t = useTranslations("LithophaneTool");
  const tt = useTranslations("Tools.image-to-lithophane");
  const locale = useLocale() as Locale;
  const [width, setWidth] = useState("100");
  const [detail, setDetail] = useState<Detail>("normal");
  const [thickness, setThickness] = useState<Thickness>("standard");
  const [border, setBorder] = useState(true);
  const mm = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 });

  return (
    <ToolShell
      input={{ kind: "files", extensions: tool.inputs.flatMap((f) => (f === "jpg" ? ["jpg", "jpeg"] : [f])), multiple: false, maxFileBytes: tool.limits.maxFileBytes }}
      actionLabel={tt("action")}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("width")} value={width} onChange={setWidth} options={lithophaneWidths.map((w) => ({ value: String(w), label: `${w} mm` }))} />
          <ChoiceGroup legend={t("detail")} value={detail} onChange={setDetail} options={(Object.keys(lithophaneDetails) as Detail[]).map((d) => ({ value: d, label: t(`details.${d}`) }))} />
          <ChoiceGroup
            legend={t("thickness")}
            value={thickness}
            onChange={setThickness}
            options={(Object.keys(lithophaneThickness) as Thickness[]).map((k) => ({ value: k, label: t(`thicknesses.${k}`, { min: mm(lithophaneThickness[k][0]), max: mm(lithophaneThickness[k][1]) }) }))}
          />
          <Checkbox checked={border} onChange={setBorder} label={t("border")} />
          <p className="text-sm text-muted">{t("note")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }): Promise<ShellOutput[]> => {
        const file = files[0]!;
        const [minMm, maxMm] = lithophaneThickness[thickness];
        const out = await trackTool(
          "image-to-lithophane",
          { from: (formatFromExtension(file.name) ?? "png") as FormatId, to: "stl", files: [file] },
          async () =>
            (await engine()).lithophaneInWorker(
              file,
              { plateMm: Number(width), pixelMm: lithophaneDetails[detail], minMm, maxMm, border },
              { signal, onProgress, timeoutMs: tool.limits.timeoutMs },
            ),
          (o) => o.data.length,
        );
        return [
          {
            kind: "file",
            name: renameExtension(file.name, "stl").replace(/\.stl$/, `-${t("suffix")}.stl`),
            blob: new Blob([out.data as Uint8Array<ArrayBuffer>], { type: "model/stl" }),
            message: { ok: true, text: t("done", { width: mm(out.widthMm), height: mm(out.heightMm), min: mm(minMm), max: mm(maxMm), triangles: out.triangles.toLocaleString(locale) }) },
          },
        ];
      }}
    />
  );
}
