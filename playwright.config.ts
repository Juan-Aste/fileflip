import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Browser tests (tests/e2e): each one uploads a fixture to a real page,
// runs the tool and checks the downloaded file with an independent reader.
// They run against `next start`, so build first: `npm run build && npm run test:e2e`.
// CHROME_PATH picks the browser; by default the Chromium of the cloud image is
// used when present, else Playwright's own (`npx playwright install chromium`).
const systemChromium = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = process.env.CHROME_PATH ?? (existsSync(systemChromium) ? systemChromium : undefined);
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "es-ES",
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 },
    launchOptions: { executablePath },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${port}`,
        url: `${baseURL}/es`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
