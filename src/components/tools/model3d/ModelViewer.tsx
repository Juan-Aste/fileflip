"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buttonSecondary } from "@/components/ui/styles";
import type { Locale } from "@/i18n/routing";
import type { ApiErrorCode } from "@/lib/api-errors";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { modelFormat } from "@/lib/model3d/options";
import type { ModelViewer as Viewer } from "@/lib/model3d/viewer";
import ToolAlert from "../ToolAlert";

const engine = () => import("@/lib/model3d/viewer");

/** Larger models are converted but not previewed: parsing them would freeze the page for a while. */
const MAX_PREVIEW_BYTES = 50 * 1024 * 1024;
const STEP = Math.PI / 12;

type State = { status: "loading" } | { status: "ready"; viewer: Viewer } | { status: "error"; code: ApiErrorCode } | { status: "tooLarge" };

/** Interactive preview of one model: drag to orbit, wheel or pinch to zoom, buttons and arrow keys too. */
export default function ModelViewer({ file }: { file: File }) {
  const t = useTranslations("ModelViewer");
  const te = useTranslations("ApiErrors");
  const locale = useLocale() as Locale;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let viewer: Viewer | null = null;
    let cancelled = false;
    const format = modelFormat(file.name);
    if (file.size > MAX_PREVIEW_BYTES) {
      setState({ status: "tooLarge" });
      return;
    }
    setState({ status: "loading" });
    (async () => {
      if (!format) throw new ConversionError("unsupportedFormat");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const created = await (await engine()).createViewer(canvas.current!, bytes, format);
      if (cancelled) return created.dispose();
      viewer = created;
      setState({ status: "ready", viewer: created });
    })().catch((error: unknown) => !cancelled && setState({ status: "error", code: errorCode(error) }));
    return () => {
      cancelled = true;
      viewer?.dispose();
    };
  }, [file]);

  const viewer = state.status === "ready" ? state.viewer : null;
  const number = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });
  const onKey = (e: KeyboardEvent) => {
    if (!viewer) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => viewer.orbit(-STEP, 0),
      ArrowRight: () => viewer.orbit(STEP, 0),
      ArrowUp: () => viewer.orbit(0, STEP),
      ArrowDown: () => viewer.orbit(0, -STEP),
      "+": () => viewer.zoom(0.8),
      "=": () => viewer.zoom(0.8),
      "-": () => viewer.zoom(1.25),
      "0": () => viewer.reset(),
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  };
  const control = (label: string, onClick: () => void, text: string) => (
    <button type="button" className={`${buttonSecondary} h-9 min-w-9 px-2 text-sm`} aria-label={label} title={label} disabled={!viewer} onClick={onClick}>
      {text}
    </button>
  );

  if (state.status === "tooLarge") return <p className="text-sm text-muted">{t("tooLarge")}</p>;
  if (state.status === "error") return <ToolAlert>{te(state.code)}</ToolAlert>;
  const description = viewer
    ? t("summary", { name: file.name, triangles: number(viewer.stats.triangles), x: number(viewer.size[0]), y: number(viewer.size[1]), z: number(viewer.size[2]) })
    : t("loading");
  return (
    <figure className="flex flex-col gap-2">
      <canvas
        ref={canvas}
        tabIndex={0}
        role="img"
        aria-label={`${t("label", { name: file.name })} ${t("keys")}`}
        onKeyDown={onKey}
        className="aspect-[4/3] max-h-[26rem] w-full touch-none rounded-lg border border-border bg-surface-2 outline-offset-2 focus-visible:outline-2 focus-visible:outline-brand"
      />
      <div className="flex flex-wrap items-center gap-2">
        {control(t("rotateLeft"), () => viewer?.orbit(-STEP, 0), "⟲")}
        {control(t("rotateRight"), () => viewer?.orbit(STEP, 0), "⟳")}
        {control(t("zoomIn"), () => viewer?.zoom(0.8), "+")}
        {control(t("zoomOut"), () => viewer?.zoom(1.25), "−")}
        {control(t("reset"), () => viewer?.reset(), t("resetShort"))}
      </div>
      <figcaption className="text-sm text-muted" aria-live="polite">
        {description}
      </figcaption>
    </figure>
  );
}
