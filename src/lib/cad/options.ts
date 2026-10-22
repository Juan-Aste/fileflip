// "Convert DXF": outputs and limits. No dxf-parser import: the page and the tests read these without the engine.

export const dxfTargets = ["svg"] as const;
export type DxfTarget = (typeof dxfTargets)[number];

export const dxfExtension: Record<DxfTarget, string> = { svg: "svg" };
export const dxfMime: Record<DxfTarget, string> = { svg: "image/svg+xml" };

/** Flattened points kept at once (arcs and splines become many): ~80 MB of coordinates. */
export const MAX_DXF_POINTS = 5_000_000;
/** Blocks inside blocks. */
export const MAX_DXF_BLOCK_DEPTH = 16;
/** Copies in one arrayed INSERT (rows × columns). */
export const MAX_DXF_ARRAY = 10_000;
