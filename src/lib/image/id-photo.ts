// "ID photo": common document photo sizes, and the layout of copies on a
// 10 × 15 cm (4 × 6 in) print. Pure geometry, shared by the page and the worker.

export const idPhotoPresets = {
  "30x40": { width: 30, height: 40 },
  "40x40": { width: 40, height: 40 },
  "35x45": { width: 35, height: 45 },
  "25x30": { width: 25, height: 30 },
  "51x51": { width: 51, height: 51 },
} as const;
export type IdPhotoPreset = keyof typeof idPhotoPresets;

/** Print resolution of the single photo and of the sheet. */
export const ID_PHOTO_DPI = 600;
export const ID_SHEET_DPI = 300;
/** A 10 × 15 cm photo print (the 4 × 6 in size labs and kiosks print). */
export const ID_SHEET_MM = { width: 101.6, height: 152.4 };
/** Space between copies (for cutting) and around them. */
const GAP_MM = 2;
const MARGIN_MM = 3;

export const mmToPx = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);

export interface SheetLayout {
  /** Sheet size in mm (portrait or landscape, whichever holds more copies). */
  width: number;
  height: number;
  /** Top-left corner of each copy, in mm. */
  copies: { x: number; y: number }[];
}

function grid(sheet: { width: number; height: number }, photo: { width: number; height: number }): SheetLayout {
  const fit = (side: number, size: number) => Math.max(0, Math.floor((side - 2 * MARGIN_MM + GAP_MM) / (size + GAP_MM)));
  const cols = fit(sheet.width, photo.width);
  const rows = fit(sheet.height, photo.height);
  // The block of copies is centered on the sheet.
  const x0 = (sheet.width - (cols * photo.width + (cols - 1) * GAP_MM)) / 2;
  const y0 = (sheet.height - (rows * photo.height + (rows - 1) * GAP_MM)) / 2;
  const copies = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) copies.push({ x: x0 + c * (photo.width + GAP_MM), y: y0 + r * (photo.height + GAP_MM) });
  return { ...sheet, copies };
}

/** As many copies as fit on a 10 × 15 cm print, trying both orientations. */
export function sheetLayout(preset: IdPhotoPreset): SheetLayout {
  const photo = idPhotoPresets[preset];
  const portrait = grid(ID_SHEET_MM, photo);
  const landscape = grid({ width: ID_SHEET_MM.height, height: ID_SHEET_MM.width }, photo);
  return landscape.copies.length > portrait.copies.length ? landscape : portrait;
}

/** Pixels of the single photo at ID_PHOTO_DPI. */
export function photoPixels(preset: IdPhotoPreset) {
  const { width, height } = idPhotoPresets[preset];
  return { width: mmToPx(width, ID_PHOTO_DPI), height: mmToPx(height, ID_PHOTO_DPI) };
}

/**
 * Writes the print resolution into a JPEG's JFIF header (APP0), so printing
 * programs open the file at its real size. Returns the bytes unchanged when
 * the file doesn't start with a JFIF segment.
 */
export function setJpegDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  const isJfif = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes[3] === 0xe0 && String.fromCharCode(...bytes.subarray(6, 11)) === "JFIF\0";
  if (!isJfif) return bytes;
  const out = bytes.slice();
  out[13] = 1; // units: dots per inch
  out[14] = dpi >> 8;
  out[15] = dpi & 0xff;
  out[16] = dpi >> 8;
  out[17] = dpi & 0xff;
  return out;
}
