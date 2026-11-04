"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Redo2, Undo2 } from "lucide-react";
import { buttonSecondary } from "@/components/ui/styles";
import { formats, formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import type { ApiErrorCode } from "@/lib/api-errors";
import { cutPerson, cutPhoto, exportPhoto, preparePhoto, type Prepared } from "@/lib/bg-remove/cutout-client";
import { parseHexColor, type Background } from "@/lib/bg-remove/cutout";
import { initialRect, scaleEdit, type Edit } from "@/lib/bg-remove/edit";
import { hasPerson } from "@/lib/bg-remove/people";
import { MEDIAPIPE_WASM_BYTES, SELFIE_MODEL_BYTES } from "@/lib/bg-remove/people-assets";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolAlert from "../ToolAlert";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import CropEditor from "./CropEditor";
import BgEditor, { type EditorTool, type ViewBackground } from "./BgEditor";
import FakeBgNotice from "@/components/converter/FakeBgNotice";
import { fakeBgOutput } from "@/lib/image/fake-bg-shared";
import { buttonPrimarySmall } from "@/components/ui/styles";
import { Download } from "lucide-react";

const info = tools["remove-background"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);

type BackgroundKind = "transparent" | "white" | "color";
type Output = "png" | "webp" | "jpg";
/** "people": MediaPipe finds the person; "rect": the user frames the subject (GrabCut only). */
type Method = "people" | "rect";
type Mode = "rect" | EditorTool;
/** Starting brush radius as a share of the photo's longest side. */
const BRUSH_SHARE = 0.025;

type Photo = { status: "loading" } | { status: "error"; code: ApiErrorCode } | { status: "ready"; from: FormatId; prepared: Prepared; url: string };
/** The person probability of the current photo (people mode). */
type Person = { status: "loading" } | { status: "error"; noWebgl: boolean } | { status: "ready"; prob: Uint8Array; found: boolean };
/** What the "people" mode downloads the first time, in MB (WASM gzip-compressed + model). */
const PEOPLE_DOWNLOAD_MB = Math.round(((MEDIAPIPE_WASM_BYTES * 0.3 + SELFIE_MODEL_BYTES) / 1e6) * 10) / 10;

/**
 * Two ways to cut: "people" (MediaPipe Selfie Segmenter finds the person and
 * its mask seeds GrabCut) or "rect" (the user frames the subject with a
 * rectangle). Both are fixed with "keep" and "remove" brushes. GrabCut (our
 * own code) runs in a worker on a reduced copy; the download is made at full
 * size. MediaPipe is only downloaded when a photo is opened in "people" mode.
 */
export default function RemoveBackgroundTool() {
  const t = useTranslations("RemoveBackgroundTool");
  const tt = useTranslations("Tools.remove-background");
  const te = useTranslations("ApiErrors");
  const tc = useTranslations("Common");
  const colorId = useId();
  const helpId = useId();
  const sizeId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [history, setHistory] = useState<{ edits: Edit[]; index: number }>({ edits: [], index: 0 });
  /** The cut, with the GrabCut inputs it was computed from. */
  const [mask, setMask] = useState<{ rect: Edit["rect"]; strokes: Edit["strokes"]; data: Uint8Array } | null>(null);
  const [method, setMethod] = useState<Method>("people");
  const [person, setPerson] = useState<Person | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [radius, setRadius] = useState(10);
  const [soft, setSoft] = useState(true);
  const [viewBg, setViewBg] = useState<ViewBackground>("result");
  const [kind, setKind] = useState<BackgroundKind>("transparent");
  const [color, setColor] = useState("#4f8ff7");
  const [output, setOutput] = useState<Output>("png");
  const lastRectChange = useRef(0);
  /** The drawn checkerboard background of the photo, if it has one, and its fix. */
  const [fake, setFake] = useState<
    null | { status: "none" | "found" | "working" } | { status: "done"; url: string; name: string } | { status: "error"; code: ApiErrorCode }
  >(null);

  const edit = history.edits[history.index] ?? null;
  const brushMode = mode === "keep" || mode === "remove" || mode === "erase" || mode === "restore";
  const ready = photo?.status === "ready" ? photo : null;

  // A new file: the worker decodes it and returns the reduced copy to work on.
  useEffect(() => {
    if (!file) {
      setPhoto(null);
      return;
    }
    const abort = new AbortController();
    let url: string | null = null;
    setPhoto({ status: "loading" });
    setMask(null);
    setHistory({ edits: [], index: 0 });
    const from = formatFromExtension(file.name);
    (from && info.inputs.includes(from)
      ? preparePhoto(file, from, { signal: abort.signal, timeoutMs: info.limits.timeoutMs })
      : Promise.reject(new ConversionError("unsupportedFormat"))
    )
      .then(async (prepared) => {
        if (abort.signal.aborted || !from) return;
        url = await previewUrl(prepared);
        if (abort.signal.aborted) return URL.revokeObjectURL(url);
        setPhoto({ status: "ready", from, prepared, url });
        setHistory({ edits: [{ rect: initialRect(prepared), strokes: [], paint: [] }], index: 0 });
        setRadius(defaultRadius(prepared));
      })
      .catch((error) => !abort.signal.aborted && setPhoto({ status: "error", code: errorCode(error) }));
    return () => {
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  // A drawn checkerboard background (checked in its own worker, loaded only now).
  useEffect(() => {
    setFake(null);
    const from = file && formatFromExtension(file.name);
    if (!file || !from || !info.inputs.includes(from)) return;
    const abort = new AbortController();
    import("@/lib/image/fake-bg-client")
      .then(({ detectFakeBackground }) => detectFakeBackground(file, from, { signal: abort.signal }))
      .then(({ found }) => !abort.signal.aborted && setFake(found ? { status: "found" } : { status: "none" }))
      .catch(() => undefined);
    return () => abort.abort();
  }, [file]);
  useEffect(() => () => {
    if (fake?.status === "done") URL.revokeObjectURL(fake.url);
  }, [fake]);

  async function fixFake() {
    const from = file && formatFromExtension(file.name);
    if (!file || !from) return;
    const to = fakeBgOutput(output);
    setFake({ status: "working" });
    try {
      const { removeFakeBackground } = await import("@/lib/image/fake-bg-client");
      const { buffer } = await trackTool("remove-background", { from, to, files: [file] }, () => removeFakeBackground(file, from, to), (o) => o.buffer.byteLength);
      const url = URL.createObjectURL(new Blob([buffer], { type: formats[to].mime }));
      setFake({ status: "done", url, name: renameExtension(file.name, to).replace(new RegExp(`\\.${to}$`), `-${t("suffix")}.${to}`) });
    } catch (error) {
      setFake({ status: "error", code: errorCode(error) });
    }
  }

  // People mode: find the person once per photo (the first time also downloads MediaPipe).
  useEffect(() => {
    setPerson(null);
    if (!ready || method !== "people") return;
    const abort = new AbortController();
    setPerson({ status: "loading" });
    import("@/lib/bg-remove/people-client")
      .then(({ findPerson }) => findPerson(ready.prepared, { signal: abort.signal, timeoutMs: info.limits.timeoutMs }))
      .then(({ prob }) => {
        if (abort.signal.aborted) return;
        const data = new Uint8Array(prob);
        setPerson({ status: "ready", prob: data, found: hasPerson(data) });
      })
      .catch((error) => !abort.signal.aborted && setPerson({ status: "error", noWebgl: error instanceof Error && error.name === "NoWebglError" }));
    return () => abort.abort();
  }, [ready, method]);

  const prob = method === "people" && person?.status === "ready" ? person.prob : null;

  // Each change of the GrabCut marks recomputes the cut (only the latest one when they come fast);
  // erase/restore strokes do not: they are painted over it.
  const rect = edit?.rect;
  const strokes = edit?.strokes;
  useEffect(() => {
    if (!ready || !rect || !strokes) return;
    if (method === "people" && !prob) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      const work = scaleEdit({ rect, strokes }, ready.prepared.workWidth / ready.prepared.width);
      (prob ? cutPerson(ready.prepared, prob, work.strokes, { signal: abort.signal }) : cutPhoto(ready.prepared, work.rect, work.strokes, { signal: abort.signal }))
        .then(({ mask: data }) => !abort.signal.aborted && setMask({ rect, strokes, data: new Uint8Array(data) }))
        .catch(() => undefined);
    }, 120);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [ready, rect, strokes, method, prob]);

  /** Switching between "people" and "rectangle" starts the marks over. */
  function chooseMethod(next: Method) {
    if (next === method) return;
    setMethod(next);
    setMode(next === "rect" ? "rect" : "view");
    setMask(null);
    if (ready) setHistory({ edits: [{ rect: initialRect(ready.prepared), strokes: [], paint: [] }], index: 0 });
  }

  const commit = useCallback((next: Edit, coalesce = false) => {
    setHistory(({ edits, index }) => {
      // Dragging the rectangle is one step, not one per pointer move.
      const base = coalesce ? index : index + 1;
      const kept = edits.slice(0, base);
      return { edits: [...kept, next], index: kept.length };
    });
  }, []);

  function changeRect(rect: Edit["rect"]) {
    if (!edit) return;
    const now = Date.now();
    commit({ ...edit, rect }, now - lastRectChange.current < 600);
    lastRectChange.current = now;
  }

  const canUndo = history.index > 0;
  const canRedo = history.index < history.edits.length - 1;
  const undo = () => canUndo && setHistory((h) => ({ ...h, index: h.index - 1 }));
  const redo = () => canRedo && setHistory((h) => ({ ...h, index: h.index + 1 }));
  const maxRadius = ready ? Math.max(20, Math.round(Math.max(ready.prepared.width, ready.prepared.height) / 4)) : 20;
  function shortcuts(event: KeyboardEvent) {
    // [ and ] change the brush size (like image editors).
    if ((event.key === "[" || event.key === "]") && !event.ctrlKey && !event.metaKey && !(event.target instanceof HTMLInputElement && event.target.type !== "radio")) {
      setRadius((r) => (event.key === "]" ? Math.min(maxRadius, Math.max(r + 1, Math.round(r * 1.25))) : Math.max(1, Math.min(r - 1, Math.round(r / 1.25)))));
      event.preventDefault();
      return;
    }
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "z" && !event.shiftKey) undo();
    else if (key === "y" || (key === "z" && event.shiftKey)) redo();
    else return;
    event.preventDefault();
  }

  const background: Background =
    kind === "transparent" ? { kind: "transparent" } : { kind: "color", rgb: kind === "white" ? [255, 255, 255] : parseHexColor(color) };
  const upToDate = !!mask && !!edit && mask.rect === edit.rect && mask.strokes === edit.strokes && (method === "rect" || !!prob);

  function chooseOutput(next: Output) {
    setOutput(next);
    if (next === "jpg" && kind === "transparent") setKind("white");
  }
  function chooseKind(next: BackgroundKind) {
    setKind(next);
    if (next === "transparent" && output === "jpg") setOutput("png");
  }

  async function process(signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    if (!file || !ready || !mask) throw new ConversionError("invalidRequest");
    const out = await trackTool(
      "remove-background",
      { from: ready.from, to: output, files: [file] },
      () => exportPhoto(file, ready.from, mask.data, ready.prepared, background, output, edit?.paint ?? [], { signal, onProgress, timeoutMs: info.limits.timeoutMs }),
      (o) => o.buffer.byteLength,
    );
    const name = renameExtension(file.name, output).replace(new RegExp(`\\.${output}$`), `-${t("suffix")}.${output}`);
    return [
      {
        kind: "file",
        name,
        blob: new Blob([out.buffer], { type: formats[output].mime }),
        message: { ok: true, text: t("done", { pixels: `${out.width} × ${out.height}` }) },
      },
    ];
  }

  const kept = mask ? Math.round((mask.data.reduce((a, v) => a + v, 0) / (255 * mask.data.length)) * 100) : null;

  return (
    <div className="flex flex-col gap-4" data-fake={fake?.status}>
      {/* Chosen before the photo: the "people" mode downloads MediaPipe only when a photo is opened in it. */}
      <ChoiceGroup
        legend={t("method")}
        value={method}
        onChange={chooseMethod}
        options={[
          { value: "people", label: t("methodPeople") },
          { value: "rect", label: t("methodRect") },
        ]}
      />
      <p className="text-sm text-muted">{method === "people" ? t("notePeople", { size: PEOPLE_DOWNLOAD_MB }) : t("note")}</p>
      <ToolShell
      input={{ kind: "files", extensions, multiple: false, maxFileBytes: info.limits.maxFileBytes, ready: !!ready && upToDate }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setFile(files[0] ?? null)}
      process={(_, { signal, onProgress }) => process(signal, onProgress)}
      options={
        <div className="flex flex-col gap-4">
          {photo?.status === "loading" && <p className="text-sm text-muted">{t("loading")}</p>}
          {photo?.status === "error" && <ToolAlert>{te(photo.code)}</ToolAlert>}
          {(fake?.status === "found" || fake?.status === "working") && <FakeBgNotice picked={output} onFix={fixFake} busy={fake.status === "working"} />}
          {fake?.status === "error" && <ToolAlert>{te(fake.code)}</ToolAlert>}
          {fake?.status === "done" && (
            <p role="status" className="flex flex-wrap items-center gap-2 text-sm">
              <a href={fake.url} download={fake.name} className={`${buttonPrimarySmall} min-h-11 sm:min-h-0`} data-testid="fake-bg-download">
                <Download aria-hidden="true" className="h-4 w-4" />
                {tc("download")}
                <span className="sr-only"> {fake.name}</span>
              </a>
              <span className="text-muted">{fake.name}</span>
            </p>
          )}
          {ready && edit && (
            <div className="flex flex-col gap-4" onKeyDown={shortcuts}>
              {method === "people" && person?.status === "loading" && <p className="text-sm text-muted">{t("findingPerson", { size: PEOPLE_DOWNLOAD_MB })}</p>}
              {method === "people" && (person?.status === "error" || (person?.status === "ready" && !person.found)) && (
                <ToolAlert>
                  {t(person.status === "error" ? (person.noWebgl ? "peopleNoWebgl" : "peopleFailed") : "noPerson")}{" "}
                  <button type="button" className="font-medium underline" onClick={() => chooseMethod("rect")}>
                    {t("useRect")}
                  </button>
                </ToolAlert>
              )}
              <ol id={helpId} className="list-decimal space-y-1 pl-5 text-sm text-muted">
                <li>{t(method === "people" ? "peopleStep1" : "step1")}</li>
                <li>{t(method === "people" ? "peopleStep2" : "step2")}</li>
                <li>{t("step3")}</li>
              </ol>
              <div className="flex flex-wrap items-end gap-4">
                <ChoiceGroup
                  legend={t("mode")}
                  value={mode}
                  onChange={setMode}
                  options={[
                    method === "rect" ? { value: "rect" as const, label: t("modeRect") } : { value: "view" as const, label: t("modeView") },
                    { value: "keep" as const, label: t("modeKeep") },
                    { value: "remove" as const, label: t("modeRemove") },
                    { value: "erase" as const, label: t("modeErase") },
                    { value: "restore" as const, label: t("modeRestore") },
                    { value: "hand" as const, label: t("modeHand") },
                  ]}
                />
                {brushMode && (
                  <div className="flex flex-col gap-1">
                    <label htmlFor={sizeId} className="text-sm font-medium">
                      {t("brushSize")}: <span className="tabular-nums">{radius} px</span>
                    </label>
                    <input
                      id={sizeId}
                      type="range"
                      min={0}
                      max={1000}
                      value={Math.round((Math.log(radius) / Math.log(maxRadius)) * 1000)}
                      onChange={(e) => setRadius(Math.max(1, Math.round(Math.exp((Number(e.target.value) / 1000) * Math.log(maxRadius)))))}
                      aria-valuetext={`${radius} px`}
                      aria-keyshortcuts="[ ]"
                      className="h-11 w-48 accent-brand-solid sm:h-9"
                    />
                  </div>
                )}
                {(mode === "erase" || mode === "restore") && (
                  <ChoiceGroup
                    legend={t("brushEdge")}
                    value={soft ? "soft" : "hard"}
                    onChange={(v) => setSoft(v === "soft")}
                    options={[
                      { value: "soft", label: t("edgeSoft") },
                      { value: "hard", label: t("edgeHard") },
                    ]}
                  />
                )}
                <div className="flex gap-2">
                  <button type="button" className={buttonSecondary} onClick={undo} disabled={!canUndo} aria-keyshortcuts="Control+Z">
                    <Undo2 aria-hidden="true" className="h-4 w-4" />
                    {t("undo")}
                  </button>
                  <button type="button" className={buttonSecondary} onClick={redo} disabled={!canRedo} aria-keyshortcuts="Control+Y">
                    <Redo2 aria-hidden="true" className="h-4 w-4" />
                    {t("redo")}
                  </button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {mode === "rect" && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium">{t("original")}</h3>
                    <CropEditor
                      src={ready.url}
                      image={{ width: ready.prepared.width, height: ready.prepared.height }}
                      rect={edit.rect}
                      ratio={null}
                      onChange={changeRect}
                    />
                  </div>
                )}
                <div className={`flex flex-col gap-2 ${mode === "rect" ? "" : "md:col-span-2"}`}>
                  <h3 className="text-sm font-medium">{t("result")}</h3>
                  <BgEditor
                    prepared={ready.prepared}
                    mask={mask?.data ?? null}
                    hints={edit.strokes}
                    paint={edit.paint}
                    background={kind === "transparent" ? null : background.kind === "color" ? background.rgb : null}
                    viewBackground={viewBg}
                    tool={mode === "rect" ? "view" : mode}
                    radius={radius}
                    soft={soft}
                    onHint={(stroke) => commit({ ...edit, strokes: [...edit.strokes, stroke] })}
                    onPaint={(stroke) => commit({ ...edit, paint: [...edit.paint, stroke] })}
                    label={t("previewLabel")}
                  />
                  <ChoiceGroup
                    legend={t("viewOn")}
                    value={viewBg}
                    onChange={setViewBg}
                    options={[
                      { value: "result", label: t("viewResult") },
                      { value: "checker", label: t("viewChecker") },
                      { value: "black", label: t("viewBlack") },
                      { value: "magenta", label: t("viewMagenta") },
                    ]}
                  />
                  {(mode === "keep" || mode === "remove") && <p className="text-sm text-muted">{t("brushHint")}</p>}
                  {(mode === "erase" || mode === "restore") && <p className="text-sm text-muted">{t("paintHint")}</p>}
                  <p className="text-sm text-muted">{t("zoomHint")}</p>
                </div>
              </div>
              <p className="text-sm font-medium" role="status" aria-live="polite">
                {upToDate && kept !== null ? t("status", { percent: kept }) : t("cutting")}
              </p>
            </div>
          )}
          {ready && (
            <div className="flex flex-wrap items-end gap-4">
              <ChoiceGroup
                legend={t("background")}
                value={kind}
                onChange={chooseKind}
                options={[
                  { value: "transparent", label: t("transparent") },
                  { value: "white", label: t("white") },
                  { value: "color", label: t("color") },
                ]}
              />
              {kind === "color" && (
                <div className="flex flex-col gap-1">
                  <label htmlFor={colorId} className="text-sm font-medium">
                    {t("colorLabel")}
                  </label>
                  <input
                    id={colorId}
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-surface p-1"
                  />
                </div>
              )}
              <ChoiceGroup
                legend={t("format")}
                value={output}
                onChange={chooseOutput}
                options={[
                  { value: "png", label: "PNG" },
                  { value: "webp", label: "WEBP" },
                  { value: "jpg", label: "JPG" },
                ]}
              />
            </div>
          )}
          {ready && output === "jpg" && <p className="text-sm text-muted">{t("jpgNoAlpha")}</p>}
        </div>
      }
      />
    </div>
  );
}

/** The reduced copy as an image URL (for the rectangle editor). */
async function previewUrl(p: Prepared): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = p.workWidth;
  canvas.height = p.workHeight;
  canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(p.work.slice(0)), p.workWidth, p.workHeight), 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No preview");
  return URL.createObjectURL(blob);
}

/** A brush about 2.5 % of the photo's longest side. */
function defaultRadius(p: Prepared) {
  return Math.max(2, Math.round(BRUSH_SHARE * Math.max(p.width, p.height)));
}
