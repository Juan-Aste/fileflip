// The favicon pack: which files, at which sizes, plus the web app manifest
// and the <head> tags that reference them.

export interface FaviconFile {
  name: string;
  size: number;
  /** Apple and Android home-screen icons get a solid background (iOS fills transparency with black). */
  opaque: boolean;
}

export const faviconPngs: readonly FaviconFile[] = [
  { name: "favicon-16x16.png", size: 16, opaque: false },
  { name: "favicon-32x32.png", size: 32, opaque: false },
  { name: "apple-touch-icon.png", size: 180, opaque: true },
  { name: "android-chrome-192x192.png", size: 192, opaque: false },
  { name: "android-chrome-512x512.png", size: 512, opaque: false },
];

/** Sizes inside favicon.ico. */
export const faviconIcoSizes = [16, 32, 48] as const;

/** Side of the square master every file is scaled down from. */
export const FAVICON_MASTER = 512;

export const MAX_APP_NAME = 60;

export type FaviconFit = "contain" | "cover";

/** Where the source goes on the square master: whole (with margins) or cropped to the center. */
export function squarePlan(width: number, height: number, fit: FaviconFit, side = FAVICON_MASTER) {
  if (fit === "cover") {
    const crop = Math.min(width, height);
    return {
      source: { x: (width - crop) / 2, y: (height - crop) / 2, width: crop, height: crop },
      target: { x: 0, y: 0, width: side, height: side },
    };
  }
  const scale = side / Math.max(width, height);
  const w = width * scale;
  const h = height * scale;
  return {
    source: { x: 0, y: 0, width, height },
    target: { x: (side - w) / 2, y: (side - h) / 2, width: w, height: h },
  };
}

export function webManifest(name: string, color: string | null) {
  const clean = name.trim().slice(0, MAX_APP_NAME);
  const manifest = {
    name: clean,
    short_name: clean,
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: color ?? "#ffffff",
    background_color: color ?? "#ffffff",
    display: "standalone",
  };
  return JSON.stringify(manifest, null, 2) + "\n";
}

/** Tags for the site's <head>, assuming the files sit at the site root. */
export const headSnippet = [
  '<link rel="icon" href="/favicon.ico" sizes="48x48">',
  '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
  '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
  '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
  '<link rel="manifest" href="/site.webmanifest">',
].join("\n") + "\n";
