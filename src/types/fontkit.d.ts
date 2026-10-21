// fontkit (dev dependency, used by tests as an independent font reader) ships no types.
declare module "fontkit" {
  export interface Glyph {
    name?: string;
    advanceWidth: number;
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
    path: { commands: unknown[] };
  }
  export interface Font {
    familyName: string;
    numGlyphs: number;
    unitsPerEm: number;
    glyphForCodePoint(codePoint: number): Glyph;
    hasGlyphForCodePoint(codePoint: number): boolean;
  }
  export function create(buffer: Uint8Array): Font;
  export function openSync(path: string): Font;
}
