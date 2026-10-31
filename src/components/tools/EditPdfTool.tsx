"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ArrowUpRight,
  Highlighter,
  ImagePlus,
  Minus,
  MousePointer2,
  PenLine,
  Redo2,
  Square,
  SquareDashed,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { buttonSecondary, field } from "@/components/ui/styles";
import type { ApiErrorCode } from "@/lib/api-errors";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { ASCENT, HIGHLIGHT_OPACITY, LINE_HEIGHT, MAX_EDIT_ITEMS, MAX_TEXT_LENGTH, strokePath, type EditFont, type EditItem, type Rgb } from "@/lib/pdf/edit";
import { editPdfFile, rasterizePdfPages } from "@/lib/pdf/client";
import { canvasToBlob, openPdf, pageThumbnail, renderPage } from "@/lib/pdf/render";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "./Checkbox";
import PrimaryButton from "./PrimaryButton";
import SinglePdfInput from "./SinglePdfInput";
import ToolAlert from "./ToolAlert";
import ToolResult from "./ToolResult";
import { useSinglePdf } from "./useSinglePdf";

type Tool = "select" | "text" | "highlight" | "ink" | "rect" | "line" | "arrow" | "whiteout" | "image";
type Item = EditItem & { id: number; url?: string };
type Size = { width: number; height: number };

const TOOLS: { id: Tool; icon: typeof Type }[] = [
  { id: "select", icon: MousePointer2 },
  { id: "text", icon: Type },
  { id: "highlight", icon: Highlighter },
  { id: "ink", icon: PenLine },
  { id: "rect", icon: Square },
  { id: "line", icon: Minus },
  { id: "arrow", icon: ArrowUpRight },
  { id: "whiteout", icon: SquareDashed },
  { id: "image", icon: ImagePlus },
];
const COLORS = { black: "#111111", red: "#d32f2f", blue: "#1d3f9e", green: "#2e7d32", orange: "#ef6c00", yellow: "#ffd600" } as const;
const FONTS: EditFont[] = ["helvetica", "helvetica-bold", "times", "courier"];
const CSS_FONT: Record<EditFont, string> = {
  helvetica: "Helvetica, Arial, 'Liberation Sans', sans-serif",
  "helvetica-bold": "Helvetica, Arial, 'Liberation Sans', sans-serif",
  times: "'Times New Roman', Times, 'Liberation Serif', serif",
  courier: "'Courier New', Courier, 'Liberation Mono', monospace",
};
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Pages to rasterize are rendered at 2× (144 DPI): sharp on screen and in print. */
const RASTER_SCALE = 2;

const toRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
const toHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;

let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string, font: EditFont, size: number) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * size * 0.5;
  measureCtx.font = `${font === "helvetica-bold" ? "bold " : ""}${size}px ${CSS_FONT[font]}`;
  return measureCtx.measureText(text).width;
}

/** Bounding box in page points (origin top-left). */
function bounds(item: Item) {
  switch (item.kind) {
    case "text": {
      const lines = (item.text || " ").split("\n");
      return { x: item.x, y: item.y, width: Math.max(item.size, ...lines.map((l) => textWidth(l, item.font, item.size))), height: lines.length * item.size * LINE_HEIGHT };
    }
    case "ink": {
      const xs = item.points.filter((_, i) => i % 2 === 0);
      const ys = item.points.filter((_, i) => i % 2 === 1);
      const pad = item.width / 2;
      return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, width: Math.max(...xs) - Math.min(...xs) + item.width, height: Math.max(...ys) - Math.min(...ys) + item.width };
    }
    case "rect":
    case "line":
    case "arrow": {
      const pad = Math.max(item.width, 6);
      return { x: Math.min(item.x1, item.x2) - pad, y: Math.min(item.y1, item.y2) - pad, width: Math.abs(item.x2 - item.x1) + pad * 2, height: Math.abs(item.y2 - item.y1) + pad * 2 };
    }
    default:
      return { x: item.x, y: item.y, width: item.width, height: item.height };
  }
}

function moved(item: Item, dx: number, dy: number): Item {
  switch (item.kind) {
    case "ink":
      return { ...item, points: item.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) };
    case "rect":
    case "line":
    case "arrow":
      return { ...item, x1: item.x1 + dx, y1: item.y1 + dy, x2: item.x2 + dx, y2: item.y2 + dy };
    default:
      return { ...item, x: item.x + dx, y: item.y + dy };
  }
}

function ItemShape({ item, labels }: { item: Item; labels: { white: string; redacted: string } }) {
  switch (item.kind) {
    case "text":
      return (
        <text
          x={item.x}
          y={item.y}
          fill={toHex(item.color)}
          fontSize={item.size}
          fontFamily={CSS_FONT[item.font]}
          fontWeight={item.font === "helvetica-bold" ? 700 : 400}
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
        >
          {item.text.split("\n").map((line, i) => (
            <tspan key={i} x={item.x} y={item.y + item.size * ASCENT[item.font] + i * item.size * LINE_HEIGHT}>
              {line || " "}
            </tspan>
          ))}
        </text>
      );
    case "highlight":
      return <rect x={item.x} y={item.y} width={item.width} height={item.height} fill={toHex(item.color)} fillOpacity={HIGHLIGHT_OPACITY} style={{ mixBlendMode: "multiply" }} />;
    case "whiteout":
      return (
        <rect x={item.x} y={item.y} width={item.width} height={item.height} fill="#ffffff" stroke={item.redact ? "#d32f2f" : "#9e9e9e"} strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke">
          <title>{item.redact ? labels.redacted : labels.white}</title>
        </rect>
      );
    case "image":
      return <image href={item.url} x={item.x} y={item.y} width={item.width} height={item.height} preserveAspectRatio="none" />;
    default:
      return <path d={strokePath(item)} fill="none" stroke={toHex(item.color)} strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" />;
  }
}

export default function EditPdfTool() {
  const t = useTranslations("EditPdf");
  const tu = useTranslations("ToolUi");
  const te = useTranslations("ApiErrors");
  const ids = { color: useId(), width: useId(), font: useId(), size: useId(), text: useId(), hint: useId() };
  const pdf = useSinglePdf();
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [thumbs, setThumbs] = useState<(string | null)[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>("select");
  // Each tool remembers its own color: yellow highlights, black text, red shapes...
  const [colors, setColors] = useState<Record<Tool, string>>({
    select: COLORS.black,
    text: COLORS.black,
    highlight: COLORS.yellow,
    ink: COLORS.blue,
    rect: COLORS.red,
    line: COLORS.red,
    arrow: COLORS.red,
    whiteout: "#ffffff",
    image: COLORS.black,
  });
  const color = colors[tool];
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [font, setFont] = useState<EditFont>("helvetica");
  const [fontSize, setFontSize] = useState(14);
  const [items, setItems] = useState<Item[]>([]);
  const [past, setPast] = useState<Item[][]>([]);
  const [future, setFuture] = useState<Item[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraftState] = useState<Item | null>(null);
  // Read on pointerup, which can come before React renders the last pointermove.
  const draftRef = useRef<Item | null>(null);
  const setDraft = (next: Item | null | ((d: Item | null) => Item | null)) => {
    draftRef.current = typeof next === "function" ? next(draftRef.current) : next;
    setDraftState(draftRef.current);
  };
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const surface = useRef<SVGSVGElement>(null);
  const textBox = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const gesture = useRef<{ start: [number, number]; before: Item[]; moving?: number; resizing?: number } | null>(null);
  const nextId = useRef(1);
  const container = useRef<HTMLDivElement>(null);

  // Items while one is dragged or resized (committed to the history on pointerup).
  const liveRef = useRef<Item[] | null>(null);
  const setLive = (next: Item[]) => {
    liveRef.current = next;
    setItems(next);
  };

  const size = sizes[pageIndex];
  const selectedItem = items.find((i) => i.id === selected) ?? null;

  // Open the document once per file: page sizes as seen (with /Rotate) and thumbnails.
  useEffect(() => {
    setDoc(null);
    setSizes([]);
    setThumbs([]);
    setItems([]);
    setPast([]);
    setFuture([]);
    setSelected(null);
    setPageIndex(0);
    setError(null);
    if (!pdf.file || !pdf.pages) return;
    let cancelled = false;
    let opened: PDFDocumentProxy | null = null;
    const urls: string[] = [];
    (async () => {
      opened = await openPdf(pdf.file!);
      const list: Size[] = [];
      for (let i = 1; i <= opened.numPages; i++) {
        const viewport = (await opened.getPage(i)).getViewport({ scale: 1 });
        list.push({ width: viewport.width, height: viewport.height });
      }
      if (cancelled) return;
      setDoc(opened);
      setSizes(list);
      setThumbs(list.map(() => null));
      for (let i = 0; i < list.length && !cancelled; i++) {
        const url = await pageThumbnail(opened, i, 120);
        urls.push(url);
        if (!cancelled) setThumbs((prev) => prev.map((u, j) => (j === i ? url : u)));
      }
    })().catch((e) => !cancelled && setError(e instanceof ConversionError ? e.code : "fileDamaged"));
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
      if (opened) void opened.loadingTask.destroy();
    };
  }, [pdf.file, pdf.pages]);

  // The current page, rendered sharp for the zoom and the screen.
  useEffect(() => {
    if (!doc || !size) return;
    let cancelled = false;
    let url = "";
    const timer = setTimeout(async () => {
      try {
        const cssWidth = (container.current?.clientWidth ?? 800) * zoom;
        const scale = Math.min(4, (cssWidth * (window.devicePixelRatio || 1)) / size.width);
        const canvas = await renderPage(doc, pageIndex, { scale, maxSide: 5000 });
        url = URL.createObjectURL(await canvasToBlob(canvas, "image/png"));
        if (cancelled) URL.revokeObjectURL(url);
        else setPageImage(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof ConversionError ? e.code : "fileDamaged");
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc, size, pageIndex, zoom]);
  useEffect(() => setPageImage(null), [pageIndex, doc]);

  // Blob URLs of placed images live as long as the editor.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((i) => i.url && URL.revokeObjectURL(i.url)), []);

  const commit = useCallback(
    (next: Item[], before: Item[] = items) => {
      setPast((p) => [...p.slice(-99), before]);
      setFuture([]);
      setItems(next);
    },
    [items],
  );

  /** A text box left empty is dropped when another item (or none) is selected. */
  const select = useCallback(
    (id: number | null) => {
      if (id !== selected) setItems((list) => list.filter((i) => i.kind !== "text" || i.text.trim() !== "" || i.id === id));
      setSelected(id);
    },
    [selected],
  );

  const undo = useCallback(() => {
    if (!past.length) return;
    setFuture((f) => [items, ...f]);
    setItems(past[past.length - 1]!);
    setPast((p) => p.slice(0, -1));
    setSelected(null);
  }, [past, items]);
  const redo = useCallback(() => {
    if (!future.length) return;
    setPast((p) => [...p, items]);
    setItems(future[0]!);
    setFuture((f) => f.slice(1));
    setSelected(null);
  }, [future, items]);

  const update = (id: number, change: (item: Item) => Item, history = true) => {
    const next = items.map((i) => (i.id === id ? change(i) : i));
    if (history) commit(next);
    else setItems(next);
  };
  const remove = (id: number) => {
    commit(items.filter((i) => i.id !== id));
    setSelected(null);
  };

  // Keyboard: undo/redo, delete and nudge the selected item.
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("textarea, input, select")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (selected !== null && (e.key === "Delete" || e.key === "Backspace") && target.closest("[data-editor]")) {
        e.preventDefault();
        remove(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toPoint = (e: { clientX: number; clientY: number }): [number, number] => {
    const rect = surface.current!.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * size!.width, ((e.clientY - rect.top) / rect.height) * size!.height];
  };

  const style = () => ({ color: toRgb(color), page: pageIndex });

  function addText(x: number, y: number) {
    const item: Item = { id: nextId.current++, kind: "text", x, y, text: "", font, size: fontSize, ...style() };
    commit([...items, item]);
    setSelected(item.id);
    setTool("select");
    requestAnimationFrame(() => textBox.current?.focus());
  }

  async function addImage(file: File | undefined) {
    if (!file || !size) return;
    setError(null);
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > MAX_IMAGE_BYTES) return setError(file.size > MAX_IMAGE_BYTES ? "fileTooLarge" : "unsupportedFormat");
    let width = 1;
    let height = 1;
    try {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
    } catch {
      return setError("fileDamaged");
    }
    // A third of the page width at most, centered.
    const w = Math.min(size.width / 3, width);
    const h = (w * height) / width;
    const item: Item = {
      id: nextId.current++,
      kind: "image",
      page: pageIndex,
      x: (size.width - w) / 2,
      y: (size.height - h) / 2,
      width: w,
      height: h,
      data: new Uint8Array(await file.arrayBuffer()),
      url: URL.createObjectURL(file),
    };
    commit([...items, item]);
    setSelected(item.id);
    setTool("select");
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!size || e.button > 0) return;
    // No text selection or native drag: a drag starting over selected text would cancel the pointer.
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    const [x, y] = toPoint(e);
    if (tool === "image") return imageInput.current?.click();
    if (tool === "text") return addText(x, y);
    const handle = (e.target as Element).closest("[data-resize]");
    const hit = (e.target as Element).closest("[data-item]");
    if (tool === "select") {
      const id = handle ? Number(handle.getAttribute("data-resize")) : hit ? Number(hit.getAttribute("data-item")) : null;
      select(id);
      if (id === null) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      gesture.current = { start: [x, y], before: items, ...(handle ? { resizing: id } : { moving: id }) };
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { start: [x, y], before: items };
    const id = nextId.current++;
    const base = { id, ...style() };
    if (tool === "ink") setDraft({ ...base, kind: "ink", points: [x, y], width: strokeWidth });
    else if (tool === "highlight" || tool === "whiteout") setDraft({ ...base, kind: tool, x, y, width: 0, height: 0 });
    else setDraft({ ...base, kind: tool, x1: x, y1: y, x2: x, y2: y, width: strokeWidth });
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const g = gesture.current;
    if (!g || !size) return;
    const [x, y] = toPoint(e);
    const cx = Math.min(Math.max(x, 0), size.width);
    const cy = Math.min(Math.max(y, 0), size.height);
    if (g.moving !== undefined) {
      const original = g.before.find((i) => i.id === g.moving);
      if (original) setLive(g.before.map((i) => (i.id === g.moving ? moved(original, x - g.start[0], y - g.start[1]) : i)));
      return;
    }
    if (g.resizing !== undefined) {
      setLive(
        g.before.map((i) => {
          if (i.id !== g.resizing || (i.kind !== "image" && i.kind !== "highlight" && i.kind !== "whiteout")) return i;
          const width = Math.max(4, cx - i.x);
          // Images keep their proportions.
          const height = i.kind === "image" ? (width * i.height) / i.width : Math.max(4, cy - i.y);
          return { ...i, width, height };
        }),
      );
      return;
    }
    setDraft((d) => {
      if (!d) return d;
      if (d.kind === "ink") return { ...d, points: [...d.points, cx, cy] };
      if (d.kind === "highlight" || d.kind === "whiteout") {
        const [sx, sy] = g.start;
        return { ...d, x: Math.min(sx, cx), y: Math.min(sy, cy), width: Math.abs(cx - sx), height: Math.abs(cy - sy) };
      }
      if (d.kind === "rect" || d.kind === "line" || d.kind === "arrow") return { ...d, x2: cx, y2: cy };
      return d;
    });
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    // Browsers may coalesce the last moves into the up event: it carries the end point.
    if (gesture.current && e.type === "pointerup") onPointerMove(e);
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.moving !== undefined || g.resizing !== undefined) {
      if (liveRef.current && liveRef.current !== g.before) commit(liveRef.current, g.before);
      liveRef.current = null;
      return;
    }
    const d = draftRef.current;
    setDraft(null);
    if (!d) return;
    const box = bounds(d);
    // A click without dragging: boxes get a default size, lines are dropped.
    const tiny = box.width < 3 && box.height < 3;
    let item: Item | null = d;
    if (tiny && (d.kind === "highlight" || d.kind === "whiteout")) item = { ...d, width: 120, height: d.kind === "highlight" ? 18 : 30 };
    else if (tiny && d.kind !== "ink") item = null;
    if (!item) return;
    if (items.length >= MAX_EDIT_ITEMS) return setError("invalidRequest");
    commit([...items, item]);
  }

  async function save() {
    if (!pdf.file || items.length === 0) return;
    const file = pdf.file;
    setWorking(true);
    setError(null);
    try {
      const list: EditItem[] = items.filter((i) => i.kind !== "text" || i.text.trim()).map((i) => {
        const item: Partial<Item> = { ...i };
        delete item.id;
        delete item.url;
        return item as EditItem;
      });
      const redact = [...new Set(items.filter((i) => i.kind === "whiteout" && i.redact).map((i) => i.page))];
      const out = await trackTool(
        "edit-pdf",
        { from: "pdf", to: "pdf", files: [file] },
        async () => {
          let edited = await editPdfFile(file, list);
          if (redact.length) {
            const editedDoc = await openPdf(edited);
            const pages = [];
            for (const index of redact) {
              const canvas = await renderPage(editedDoc, index, { scale: RASTER_SCALE, maxSide: 5000 });
              pages.push({ index, jpeg: new Uint8Array(await (await canvasToBlob(canvas, "image/jpeg", 0.9)).arrayBuffer()) });
            }
            void editedDoc.loadingTask.destroy();
            edited = await rasterizePdfPages(edited, pages);
          }
          return edited;
        },
        (b) => b.size,
      );
      setResult(out);
    } catch (e) {
      console.error(e);
      setError(errorCode(e));
    } finally {
      setWorking(false);
    }
  }

  if (result && pdf.file) {
    return (
      <ToolResult
        blob={result}
        filename={pdf.file.name.replace(/(\.pdf)?$/i, "-edited.pdf")}
        onReset={() => {
          setResult(null);
          pdf.clear();
        }}
      />
    );
  }

  const pageItems = items.filter((i) => i.page === pageIndex);
  const showsStroke = ["ink", "rect", "line", "arrow"].includes(selectedItem?.kind ?? tool);
  const showsText = (selectedItem?.kind ?? tool) === "text";
  const showsColor = !["whiteout", "image", "select"].includes(selectedItem?.kind ?? tool) || (tool === "select" && selectedItem && !["whiteout", "image"].includes(selectedItem.kind));
  const currentColor = selectedItem && "color" in selectedItem ? toHex(selectedItem.color) : color;
  const setItemColor = (hex: string) => {
    setColors((c) => ({ ...c, [selectedItem?.kind ?? tool]: hex }));
    if (selectedItem && "color" in selectedItem) update(selectedItem.id, (i) => ({ ...i, color: toRgb(hex) }) as Item);
  };
  const editedPages = new Set(items.map((i) => i.page));
  const hasWhiteout = items.some((i) => i.kind === "whiteout");

  return (
    <div className="flex flex-col gap-4">
      <SinglePdfInput pdf={pdf} />
      {pdf.file && pdf.pages !== null && (
        <div data-editor className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-3 shadow-card sm:p-5">
          <div role="toolbar" aria-label={t("toolbar")} className="flex flex-wrap items-center gap-1">
            {TOOLS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={tool === id}
                title={t(`tools.${id}`)}
                onClick={() => {
                  setTool(id);
                  if (id !== "select") select(null);
                  if (id === "image") imageInput.current?.click();
                }}
                className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-semibold transition ${tool === id ? "border-brand-solid bg-brand-solid text-white" : "border-border-strong bg-surface hover:border-brand hover:text-brand"}`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">{t(`tools.${id}`)}</span>
              </button>
            ))}
            <input
              ref={imageInput}
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                void addImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
            <button type="button" onClick={undo} disabled={!past.length} title={t("undo")} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-strong hover:border-brand disabled:opacity-40">
              <Undo2 aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">{t("undo")}</span>
            </button>
            <button type="button" onClick={redo} disabled={!future.length} title={t("redo")} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-strong hover:border-brand disabled:opacity-40">
              <Redo2 aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">{t("redo")}</span>
            </button>
            <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
            <button type="button" onClick={() => setZoom((z) => ZOOMS[Math.max(0, ZOOMS.indexOf(z) - 1)]!)} disabled={zoom === ZOOMS[0]} title={t("zoomOut")} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-strong hover:border-brand disabled:opacity-40">
              <ZoomOut aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">{t("zoomOut")}</span>
            </button>
            <span className="w-12 text-center text-sm tabular-nums" aria-live="polite">
              {Math.round(zoom * 100)} %
            </span>
            <button type="button" onClick={() => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + 1)]!)} disabled={zoom === ZOOMS[ZOOMS.length - 1]} title={t("zoomIn")} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-strong hover:border-brand disabled:opacity-40">
              <ZoomIn aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">{t("zoomIn")}</span>
            </button>
          </div>

          <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-3 sm:flex-row sm:flex-wrap sm:items-end">
            {showsColor && (
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 text-sm font-medium">{t("color")}</legend>
                <div className="flex flex-wrap items-center gap-1.5">
                  {Object.entries(COLORS).map(([name, hex]) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={currentColor === hex}
                      onClick={() => setItemColor(hex)}
                      className={`h-8 w-8 rounded-full border-2 ${currentColor === hex ? "border-brand ring-2 ring-brand/40" : "border-border-strong"}`}
                      style={{ background: hex }}
                    >
                      <span className="sr-only">{t(`colors.${name as keyof typeof COLORS}`)}</span>
                    </button>
                  ))}
                  <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border-2 border-border-strong" title={t("otherColor")}>
                    <span className="sr-only">{t("otherColor")}</span>
                    <input id={ids.color} type="color" value={currentColor} onChange={(e) => setItemColor(e.target.value)} className="absolute -inset-2 h-12 w-12 cursor-pointer" />
                  </label>
                </div>
              </fieldset>
            )}
            {showsStroke && (
              <div className="flex flex-col gap-1">
                <label htmlFor={ids.width} className="text-sm font-medium">
                  {t("width", { value: selectedItem && "width" in selectedItem && selectedItem.kind !== "image" && selectedItem.kind !== "highlight" && selectedItem.kind !== "whiteout" ? selectedItem.width : strokeWidth })}
                </label>
                <input
                  id={ids.width}
                  type="range"
                  min={1}
                  max={20}
                  value={selectedItem && (selectedItem.kind === "ink" || selectedItem.kind === "rect" || selectedItem.kind === "line" || selectedItem.kind === "arrow") ? selectedItem.width : strokeWidth}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setStrokeWidth(value);
                    if (selectedItem && (selectedItem.kind === "ink" || selectedItem.kind === "rect" || selectedItem.kind === "line" || selectedItem.kind === "arrow")) update(selectedItem.id, (i) => ({ ...i, width: value }) as Item, false);
                  }}
                  className="w-40 accent-[var(--brand-solid)]"
                />
              </div>
            )}
            {showsText && (
              <>
                <div className="flex flex-col gap-1">
                  <label htmlFor={ids.font} className="text-sm font-medium">
                    {t("font")}
                  </label>
                  <select
                    id={ids.font}
                    value={selectedItem?.kind === "text" ? selectedItem.font : font}
                    onChange={(e) => {
                      const value = e.target.value as EditFont;
                      setFont(value);
                      if (selectedItem?.kind === "text") update(selectedItem.id, (i) => ({ ...i, font: value }) as Item);
                    }}
                    className={`h-10 ${field}`}
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>
                        {t(`fonts.${f}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={ids.size} className="text-sm font-medium">
                    {t("fontSize")}
                  </label>
                  <input
                    id={ids.size}
                    type="number"
                    min={4}
                    max={144}
                    value={selectedItem?.kind === "text" ? selectedItem.size : fontSize}
                    onChange={(e) => {
                      const value = Math.min(144, Math.max(4, Number(e.target.value) || 4));
                      setFontSize(value);
                      if (selectedItem?.kind === "text") update(selectedItem.id, (i) => ({ ...i, size: value }) as Item, false);
                    }}
                    className={`h-10 w-24 ${field}`}
                  />
                </div>
              </>
            )}
            {selectedItem?.kind === "text" && (
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-64">
                <label htmlFor={ids.text} className="text-sm font-medium">
                  {t("text")}
                </label>
                <textarea
                  ref={textBox}
                  id={ids.text}
                  rows={2}
                  maxLength={MAX_TEXT_LENGTH}
                  value={selectedItem.text}
                  placeholder={t("textPlaceholder")}
                  onChange={(e) => update(selectedItem.id, (i) => ({ ...i, text: e.target.value }) as Item, false)}
                  className={`py-2 ${field}`}
                />
              </div>
            )}
            {selectedItem?.kind === "whiteout" && (
              <div className="flex max-w-xl flex-col gap-1">
                <Checkbox checked={!!selectedItem.redact} onChange={(value) => update(selectedItem.id, (i) => ({ ...i, redact: value }) as Item)} label={t("redact")} />
                <p className="text-xs text-muted">{t("redactNote")}</p>
              </div>
            )}
            {selectedItem && (
              <button type="button" onClick={() => remove(selectedItem.id)} className={`${buttonSecondary} sm:ml-auto`}>
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                {t("delete")}
              </button>
            )}
            {!selectedItem && tool === "select" && <p className="text-sm text-muted">{t("hintSelect")}</p>}
          </div>

          {hasWhiteout && (
            <p role="note" className="rounded-xl bg-warning-soft px-3 py-2 text-sm">
              {t("whiteoutNote")}
            </p>
          )}

          <div className="flex flex-col gap-3 md:flex-row">
            <nav aria-label={t("pages")} className="order-2 md:order-1 md:w-28 md:shrink-0">
              <ol className="flex gap-2 overflow-x-auto pb-1 md:max-h-[70vh] md:flex-col md:overflow-y-auto md:overflow-x-visible">
                {sizes.map((s, i) => (
                  <li key={i} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        select(null);
                        setPageIndex(i);
                      }}
                      aria-current={i === pageIndex ? "page" : undefined}
                      className={`relative block w-20 overflow-hidden rounded-md border-2 bg-white md:w-24 ${i === pageIndex ? "border-brand" : "border-border hover:border-brand/60"}`}
                      style={{ aspectRatio: `${s.width} / ${s.height}` }}
                    >
                      {thumbs[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local blob URL
                        <img src={thumbs[i]!} alt="" className="h-full w-full object-contain" />
                      ) : null}
                      <span className="absolute bottom-0.5 left-0.5 rounded bg-foreground/75 px-1 text-xs text-background">
                        <span className="sr-only">{tu("pageLabel", { n: i + 1 })}</span>
                        <span aria-hidden="true">{i + 1}</span>
                        {editedPages.has(i) && <span className="sr-only"> · {t("pageEdited")}</span>}
                      </span>
                      {editedPages.has(i) && <span aria-hidden="true" className="pointer-events-none absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-brand-solid" />}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            <div ref={container} className="order-1 min-w-0 flex-1 overflow-auto rounded-lg bg-surface-2 p-2 md:order-2" style={{ maxHeight: "75vh" }}>
              {size ? (
                <div className="relative mx-auto select-none bg-white shadow" onDragStart={(e) => e.preventDefault()} style={{ width: `${zoom * 100}%`, aspectRatio: `${size.width} / ${size.height}` }}>
                  {pageImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local blob URL
                    <img src={pageImage} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-sm text-muted">{tu("loadingPages")}</span>
                  )}
                  <svg
                    ref={surface}
                    data-testid="edit-surface"
                    role="img"
                    aria-label={t("surface", { n: pageIndex + 1, count: pageItems.length })}
                    aria-describedby={ids.hint}
                    viewBox={`0 0 ${size.width} ${size.height}`}
                    preserveAspectRatio="none"
                    className={`absolute inset-0 h-full w-full ${tool === "select" ? (selectedItem ? "touch-none" : "") : "cursor-crosshair touch-none"}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  >
                    {[...pageItems, ...(draft ? [draft] : [])].map((item) => (
                      <g key={item.id} data-item={item.id} className={tool === "select" ? "cursor-move" : undefined}>
                        <ItemShape item={item} labels={{ white: t("whiteBox"), redacted: t("redactedBox") }} />
                        {/* A wider invisible target makes thin lines easy to grab. */}
                        {(item.kind === "ink" || item.kind === "line" || item.kind === "arrow" || item.kind === "rect") && (
                          <path d={strokePath(item)} fill="none" stroke="transparent" strokeWidth={Math.max(item.width, 14)} />
                        )}
                        {item.kind === "text" && <rect {...bounds(item)} fill="transparent" />}
                      </g>
                    ))}
                    {selectedItem && selectedItem.page === pageIndex && (
                      <g pointerEvents="none">
                        <rect {...bounds(selectedItem)} fill="none" stroke="#0f766e" strokeWidth={1.5} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
                      </g>
                    )}
                    {selectedItem && selectedItem.page === pageIndex && (selectedItem.kind === "image" || selectedItem.kind === "highlight" || selectedItem.kind === "whiteout") && (
                      <rect
                        data-resize={selectedItem.id}
                        x={selectedItem.x + selectedItem.width - 6}
                        y={selectedItem.y + selectedItem.height - 6}
                        width={12}
                        height={12}
                        fill="#0f766e"
                        className="cursor-nwse-resize"
                      />
                    )}
                  </svg>
                </div>
              ) : (
                <p className="p-6 text-center text-sm text-muted">{tu("loadingPages")}</p>
              )}
            </div>
          </div>
          <p id={ids.hint} className="text-sm text-muted">
            {t(`hints.${tool}`)}
          </p>
          {error && <ToolAlert>{te(error)}</ToolAlert>}
          <PrimaryButton onClick={save} disabled={working || items.length === 0}>
            {working ? tu("working") : t("save")}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
