"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Dropzone from "@/components/converter/Dropzone";
import { buttonSecondary } from "@/components/ui/styles";
import type { ApiErrorCode } from "@/lib/api-errors";
import { signPdfFile } from "@/lib/pdf/client";
import { canvasToBlob, openPdf, renderPage } from "@/lib/pdf/render";
import { trimSignature } from "@/lib/pdf/sign";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "./Checkbox";
import ChoiceGroup from "./ChoiceGroup";
import PrimaryButton from "./PrimaryButton";
import SignaturePad from "./SignaturePad";
import SinglePdfInput from "./SinglePdfInput";
import ToolAlert from "./ToolAlert";
import ToolResult from "./ToolResult";
import { useSinglePdf } from "./useSinglePdf";

type Source = "draw" | "image";
const INKS = { black: "#111111", blue: "#1d3f9e" } as const;
/** Signature photos bigger than this are scaled down before trimming. */
const MAX_IMAGE_SIDE = 1600;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Trimmed transparent PNG of the drawn or uploaded signature; null when there is no ink. */
async function signaturePng(source: CanvasImageSource, width: number, height: number, removeWhite: boolean): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height);
  const box = trimSignature(data.data, width, height, { removeWhite });
  if (!box) return null;
  ctx.putImageData(data, 0, 0);
  const out = document.createElement("canvas");
  out.width = box.width;
  out.height = box.height;
  out.getContext("2d")!.drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
  return canvasToBlob(out, "image/png");
}

export default function SignPdfTool() {
  const t = useTranslations("SignPdf");
  const tu = useTranslations("ToolUi");
  const tt = useTranslations("Tools.sign-pdf");
  const te = useTranslations("ApiErrors");
  const ids = { size: useId(), page: useId() };
  const pdf = useSinglePdf();
  const padRef = useRef<HTMLCanvasElement | null>(null);
  const [source, setSource] = useState<Source>("draw");
  const [ink, setInk] = useState<keyof typeof INKS>("blue");
  const [hasInk, setHasInk] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [removeWhite, setRemoveWhite] = useState(true);
  const [signature, setSignature] = useState<{ blob: Blob; url: string; ratio: number } | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [preview, setPreview] = useState<{ url: string; ratio: number } | null>(null);
  const [place, setPlace] = useState({ x: 0.7, y: 0.85 });
  const [size, setSize] = useState(30);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<ApiErrorCode | "noSignature" | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const dragging = useRef(false);

  const pages = pdf.pages ?? 0;
  useEffect(() => setPageIndex(0), [pdf.file]);

  // Preview of the chosen page.
  useEffect(() => {
    setPreview(null);
    if (!pdf.file || !pages) return;
    let cancelled = false;
    let url = "";
    (async () => {
      const doc = await openPdf(pdf.file!);
      const canvas = await renderPage(doc, pageIndex, { scale: 1.2, maxSide: 1400 });
      void doc.loadingTask.destroy();
      url = URL.createObjectURL(await canvasToBlob(canvas, "image/jpeg", 0.8));
      if (cancelled) URL.revokeObjectURL(url);
      else setPreview({ url, ratio: canvas.width / canvas.height });
    })().catch(() => !cancelled && setError("fileDamaged"));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [pdf.file, pages, pageIndex]);

  useEffect(
    () => () => {
      if (signature) URL.revokeObjectURL(signature.url);
    },
    [signature],
  );

  async function prepareSignature(): Promise<boolean> {
    setError(null);
    let blob: Blob | null = null;
    if (source === "draw") {
      const pad = padRef.current;
      if (pad && hasInk) blob = await signaturePng(pad, pad.width, pad.height, false);
    } else if (photo) {
      try {
        const bitmap = await createImageBitmap(photo);
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
        blob = await signaturePng(bitmap, Math.round(bitmap.width * scale), Math.round(bitmap.height * scale), removeWhite);
        bitmap.close();
      } catch {
        setError("fileDamaged");
        return false;
      }
    }
    if (!blob) {
      setError("noSignature");
      return false;
    }
    const bitmap = await createImageBitmap(blob);
    setSignature({ blob, url: URL.createObjectURL(blob), ratio: bitmap.width / bitmap.height });
    bitmap.close();
    return true;
  }

  async function sign() {
    if (!pdf.file || !signature) return;
    const file = pdf.file;
    setWorking(true);
    setError(null);
    try {
      setResult(
        await trackTool(
          "sign-pdf",
          { from: "pdf", to: "pdf", files: [file] },
          () => signPdfFile(file, signature.blob, [{ page: pageIndex, x: place.x, y: place.y, width: size / 100 }]),
          (b) => b.size,
        ),
      );
    } catch (e) {
      console.error(e);
      setError("conversionFailed");
    } finally {
      setWorking(false);
    }
  }

  if (result && pdf.file) {
    return (
      <ToolResult
        blob={result}
        filename={pdf.file.name.replace(/(\.pdf)?$/i, "-signed.pdf")}
        onReset={() => {
          setResult(null);
          setSignature(null);
          pdf.clear();
        }}
      />
    );
  }

  const moveTo = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPlace({ x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)) });
  };
  const nudge = (dx: number, dy: number) => setPlace((p) => ({ x: Math.min(1, Math.max(0, p.x + dx)), y: Math.min(1, Math.max(0, p.y + dy)) }));
  const sigHeight = signature && preview ? ((size / 100) * preview.ratio) / signature.ratio : 0;

  return (
    <div className="flex flex-col gap-4">
      <SinglePdfInput pdf={pdf} />
      {pages > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">{t("notCertified")}</p>
          {!signature ? (
            <>
              <ChoiceGroup
                legend={t("source")}
                value={source}
                onChange={setSource}
                options={[
                  { value: "draw", label: t("draw") },
                  { value: "image", label: t("upload") },
                ]}
              />
              {source === "draw" ? (
                <>
                  <ChoiceGroup
                    legend={t("ink")}
                    value={ink}
                    onChange={setInk}
                    options={[
                      { value: "blue", label: t("inkBlue") },
                      { value: "black", label: t("inkBlack") },
                    ]}
                  />
                  <SignaturePad color={INKS[ink]} onChange={setHasInk} canvasRef={padRef} />
                </>
              ) : (
                <>
                  <Dropzone
                    onFiles={(files) => {
                      const file = files[0];
                      const problem = !file ? null : !/\.(png|jpe?g|webp)$/i.test(file.name) ? "unsupportedFormat" : file.size > MAX_IMAGE_BYTES ? "fileTooLarge" : null;
                      setPhoto(file && !problem ? file : null);
                      setError(problem);
                    }}
                    compact={!!photo}
                    accept=".png,.jpg,.jpeg,.webp"
                    multiple={false}
                  />
                  {photo && <p className="text-sm">{photo.name}</p>}
                  <p className="text-xs text-muted">{t("uploadHint")}</p>
                  <Checkbox checked={removeWhite} onChange={setRemoveWhite} label={t("removeWhite")} />
                </>
              )}
              {error && <ToolAlert>{error === "noSignature" ? t("noSignature") : te(error)}</ToolAlert>}
              <PrimaryButton onClick={prepareSignature} disabled={source === "draw" ? !hasInk : !photo}>
                {t("useSignature")}
              </PrimaryButton>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className={buttonSecondary} disabled={pageIndex === 0} onClick={() => setPageIndex((i) => i - 1)} aria-label={t("prevPage")}>
                  ←
                </button>
                <span id={ids.page} className="text-sm font-medium tabular-nums">
                  {t("pageOf", { n: pageIndex + 1, total: pages })}
                </span>
                <button type="button" className={buttonSecondary} disabled={pageIndex >= pages - 1} onClick={() => setPageIndex((i) => i + 1)} aria-label={t("nextPage")}>
                  →
                </button>
                <button type="button" className={`${buttonSecondary} ml-auto`} onClick={() => setSignature(null)}>
                  {t("changeSignature")}
                </button>
              </div>
              <p className="text-sm text-muted">{t("placeHint")}</p>
              <div
                data-testid="sign-preview"
                className="relative mx-auto w-full max-w-xl cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-border bg-white shadow"
                style={{ aspectRatio: preview ? String(preview.ratio) : "3 / 4" }}
                onPointerDown={(e) => {
                  dragging.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  moveTo(e);
                }}
                onPointerMove={(e) => dragging.current && moveTo(e)}
                onPointerUp={() => (dragging.current = false)}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob URL
                  <img src={preview.url} alt={tu("pageLabel", { n: pageIndex + 1 })} draggable={false} className="absolute inset-0 h-full w-full" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-sm text-muted">{tu("loadingPages")}</span>
                )}
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label={t("signatureHandle")}
                  aria-describedby={ids.page}
                  aria-valuetext={t("positionValue", { x: Math.round(place.x * 100), y: Math.round(place.y * 100) })}
                  aria-valuenow={Math.round(place.x * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 0.05 : 0.01;
                    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
                    const move = moves[e.key];
                    if (move) {
                      e.preventDefault();
                      nudge(...move);
                    }
                  }}
                  className="absolute rounded outline-2 outline-offset-2 outline-brand/60 focus-visible:outline"
                  style={{ left: `${(place.x - size / 200) * 100}%`, top: `${(place.y - sigHeight / 2) * 100}%`, width: `${size}%`, height: `${sigHeight * 100}%` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
                  <img src={signature.url} alt="" draggable={false} className="pointer-events-none h-full w-full" />
                </div>
              </div>
              <div className="flex max-w-sm flex-col gap-1">
                <label htmlFor={ids.size} className="text-sm font-medium">
                  {t("size", { value: size })}
                </label>
                <input
                  id={ids.size}
                  type="range"
                  min={5}
                  max={80}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="accent-[var(--brand-solid)]"
                />
              </div>
              {error && <ToolAlert>{te(error === "noSignature" ? "conversionFailed" : error)}</ToolAlert>}
              <PrimaryButton onClick={sign} disabled={working || !preview}>
                {working ? tu("working") : tt("action")}
              </PrimaryButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}
