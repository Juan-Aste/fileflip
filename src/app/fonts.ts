import localFont from "next/font/local";

// Self-hosted (from @fontsource-variable) so builds never depend on Google
// Fonts being reachable. Latin subset only: Chinese falls back to system fonts.
export const bodyFont = localFont({
  src: "../../node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2",
  weight: "300 900",
  display: "swap",
  variable: "--font-body",
  fallback: ["ui-sans-serif", "system-ui", "Arial"],
});

export const headingFont = localFont({
  src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  // Not preloaded: it would compete with the CSS/JS for the first paint on slow
  // connections; the h1 renders with the fallback and swaps in.
  preload: false,
  variable: "--font-heading",
  fallback: ["ui-sans-serif", "system-ui", "Arial"],
});
