import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
// `npm run analyze` writes interactive treemaps to .next/analyze/.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true", openAnalyzer: false });

/**
 * Security headers on every response (B-17 in docs/bug-audit.md). The CSP
 * only sets what can't break AdSense or the tools: no framing by other sites
 * (clickjacking), no plugins, no <base> hijacking, forms only to us and to
 * Google sign-in (a form's redirect counts). Scripts, styles, images and
 * connections stay open: AdSense loads from many Google domains, and the
 * tools use workers, blob: URLs and WebAssembly.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No tool uses the camera, microphone, location or USB; ad features are left to Google's defaults.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=()" },
  // Browsers ignore it over plain HTTP (local runs); Railway serves HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  // Standalone output for the Railway Docker image (see DEPLOY.md, milestone 8).
  output: "standalone",
  // Always put <title>/<meta> in the <head>, also on dynamic pages (pricing):
  // streamed metadata ends up in <body>, which some crawlers and tools miss.
  htmlLimitedBots: /.*/,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The OCR engine and models are served under versioned paths (src/lib/ocr/assets.ts).
      { source: "/ocr/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
  webpack(config, { webpack }) {
    // The multithreaded AVIF encoder only runs on cross-origin-isolated pages
    // (we are not) and its self-spawning pthread worker creates a circular
    // chunk that breaks webpack's build cache. Always use the single-threaded one.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /avif_enc_mt\.js$/,
        (resource: { request: string }) => {
          resource.request = resource.request.replace("avif_enc_mt.js", "avif_enc.js");
        },
      ),
    );
    // The Emscripten loaders of qpdf and libarchive require fs/path/crypto only when they run in
    // Node; the browser branch never reaches them.
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^(fs|path|crypto)$/, contextRegExp: /qpdf-wasm|libarchive-wasm/ }));
    // linkedom (and its CSSOM) try optional `require("canvas")` / `require("cssstyle")` inside
    // try/catch and fall back to shims; the DOM it gives the 3D worker never draws or styles.
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^(canvas|cssstyle)$/, contextRegExp: /linkedom|@acemir[\\/]cssom/ }));
    return config;
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
