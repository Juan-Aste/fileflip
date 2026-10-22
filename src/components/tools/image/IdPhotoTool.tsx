"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formats, formatFromExtension } from "@/config/formats";
import { tools } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import type { ApiErrorCode } from "@/lib/api-errors";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { fitAspect, type Rect, type Size } from "@/lib/image/crop-rect";
import { idPhotoPresets, type IdPhotoPreset } from "@/lib/image/id-photo";
import { idPhotoFile, previewImageFile } from "@/lib/image/tools-client";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolAlert from "../ToolAlert";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import CropEditor from "./CropEditor";

const info = tools["id-photo"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);
const presets = Object.keys(idPhotoPresets) as IdPhotoPreset[];
const ratioOf = (p: IdPhotoPreset) => idPhotoPresets[p].width / idPhotoPresets[p].height;

/** Longest side of the framing preview. */
const PREVIEW_SIDE = 1600;

type Preview = { status: "loading" } | { status: "ready"; url: string; image: Size } | { status: "error"; code: ApiErrorCode };

/**
 * Where the head goes: an oval from the crown (12 % from the top) to the chin
 * (about 72 % of the photo's height, the middle of the 70–80 % passports ask
 * for), and a line for the eyes.
 */
function FaceGuide() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* A dark outline under the white dashes keeps the oval visible on light and dark photos alike. */}
      <ellipse cx="50" cy="48" rx="25" ry="36" fill="none" stroke="black" strokeOpacity="0.45" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      <ellipse cx="50" cy="48" rx="25" ry="36" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
      <line x1="20" x2="80" y1="42" y2="42" stroke="white" strokeOpacity="0.7" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      <line x1="50" x2="50" y1="0" y2="100" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A photo framed to a document size: the photo at 600 dpi and a 10 × 15 cm print with copies. */
export default function IdPhotoTool() {
  const t = useTranslations("IdPhotoTool");
  const tt = useTranslations("Tools.id-photo");
  const te = useTranslations("ApiErrors");
  const locale = useLocale() as Locale;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [preset, setPreset] = useState<IdPhotoPreset>("35x45");
  const [rect, setRect] = useState<Rect | null>(null);
  const job = useRef<AbortController | null>(null);
  const presetNow = useRef(preset);
  useEffect(() => {
    presetNow.current = preset;
  }, [preset]);

  useEffect(() => {
    job.current?.abort();
    if (!file) {
      setPreview(null);
      return;
    }
    const from = formatFromExtension(file.name);
    const abort = new AbortController();
    job.current = abort;
    let url: string | null = null;
    setPreview({ status: "loading" });
    setRect(null);
    (from ? previewImageFile({ input: file, from, maxSide: PREVIEW_SIDE }, { signal: abort.signal }) : Promise.reject(new ConversionError("unsupportedFormat")))
      .then((p) => {
        if (abort.signal.aborted) return;
        url = URL.createObjectURL(p.blob);
        const image = { width: p.width, height: p.height };
        setPreview({ status: "ready", url, image });
        setRect(fitAspect(image, ratioOf(presetNow.current)));
      })
      .catch((error) => !abort.signal.aborted && setPreview({ status: "error", code: errorCode(error) }));
    return () => {
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  const ready = preview?.status === "ready" ? preview : null;
  const mm = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 });

  function choosePreset(p: IdPhotoPreset) {
    setPreset(p);
    if (ready) setRect(fitAspect(ready.image, ratioOf(p)));
  }

  async function process(signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    if (!file || !rect) throw new ConversionError("invalidRequest");
    const from = formatFromExtension(file.name);
    if (!from || !info.inputs.includes(from)) throw new ConversionError("unsupportedFormat");
    const out = await trackTool(
      "id-photo",
      { from, to: "jpg", files: [file] },
      () => idPhotoFile({ input: file, from, rect, preset }, { signal, onProgress, timeoutMs: info.limits.timeoutMs }),
      (o) => o.photo.byteLength + o.sheet.byteLength,
    );
    const { width, height } = idPhotoPresets[preset];
    const size = `${mm(width / 10)} × ${mm(height / 10)} cm`;
    const soft = out.lowResolution ? ` ${t("lowResolution")}` : "";
    return [
      {
        kind: "file",
        name: renameExtension(file.name, "jpg").replace(/\.jpg$/, `-${preset}.jpg`),
        blob: new Blob([out.photo], { type: "image/jpeg" }),
        message: { ok: !out.lowResolution, text: t("donePhoto", { size, pixels: `${out.width} × ${out.height}` }) + soft },
      },
      {
        kind: "file",
        name: renameExtension(file.name, "jpg").replace(/\.jpg$/, `-${preset}-${t("sheetSuffix")}.jpg`),
        blob: new Blob([out.sheet], { type: "image/jpeg" }),
        message: { ok: true, text: t("doneSheet", { copies: out.copies }) },
      },
    ];
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: false, maxFileBytes: info.limits.maxFileBytes, ready: !!ready && !!rect }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setFile(files[0] ?? null)}
      process={(_, { signal, onProgress }) => process(signal, onProgress)}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("size")}
            value={preset}
            onChange={choosePreset}
            options={presets.map((p) => ({
              value: p,
              label: t(`presets.${p}`, { width: mm(idPhotoPresets[p].width / 10), height: mm(idPhotoPresets[p].height / 10) }),
            }))}
          />
          <p className="text-sm text-muted">{t("check")}</p>
          {preview?.status === "loading" && <p className="text-sm text-muted">{t("loading")}</p>}
          {preview?.status === "error" && <ToolAlert>{te(preview.code)}</ToolAlert>}
          {ready && rect && (
            <>
              <p className="text-sm">{t("frameHint")}</p>
              <CropEditor src={ready.url} image={ready.image} rect={rect} ratio={ratioOf(preset)} onChange={setRect} guide={<FaceGuide />} />
            </>
          )}
        </div>
      }
    />
  );
}
