import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
// `npm run analyze` writes interactive treemaps to .next/analyze/.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true", openAnalyzer: false });

const nextConfig: NextConfig = {
  // Standalone output for the Railway Docker image (see DEPLOY.md, milestone 8).
  output: "standalone",
  // Always put <title>/<meta> in the <head>, also on dynamic pages (pricing):
  // streamed metadata ends up in <body>, which some crawlers and tools miss.
  htmlLimitedBots: /.*/,
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
    return config;
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
