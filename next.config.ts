import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Railway Docker image (see DEPLOY.md, milestone 8).
  output: "standalone",
};

export default nextConfig;
