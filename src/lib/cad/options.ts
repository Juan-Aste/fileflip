// "Convert DXF": outputs and limits. No dxf-parser import: the page and the tests read these without the engine.

export const dxfTargets = ["svg", "png", "pdf"] as const;
export type DxfTarget = (typeof dxfTargets)[number];

export const dxfExtension: Record<DxfTarget, string> = { svg: "svg", png: "png", pdf: "pdf" };
export const dxfMime: Record<DxfTarget, string> = { svg: "image/svg+xml", png: "image/png", pdf: "application/pdf" };

/** PNG: pixels on the drawing's longest side. */
export const dxfPngWidths = [1000, 2000, 4000] as const;
export type DxfPngWidth = (typeof dxfPngWidths)[number];

/** PDF: one page, turned to match the drawing, with the drawing fitted inside a 10 mm margin. */
export const dxfPages = { a4: [595.28, 841.89], a3: [841.89, 1190.55] } as const;
export type DxfPage = keyof typeof dxfPages;
export const DXF_PDF_MARGIN = (10 / 25.4) * 72;

/** Flattened points kept at once (arcs and splines become many): ~80 MB of coordinates. */
export const MAX_DXF_POINTS = 5_000_000;
/** Blocks inside blocks. */
export const MAX_DXF_BLOCK_DEPTH = 16;
/** Copies in one arrayed INSERT (rows × columns). */
export const MAX_DXF_ARRAY = 10_000;
