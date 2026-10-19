import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // next-intl imports "next/server" without an extension, which Node ESM
    // cannot resolve; inlining lets Vite resolve it.
    server: { deps: { inline: ["next-intl"] } },
  },
});
