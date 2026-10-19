import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Standalone output for the Railway Docker image (see DEPLOY.md, milestone 8).
  output: "standalone",
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

export default withNextIntl(nextConfig);
