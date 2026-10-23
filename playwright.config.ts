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
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 }, launchOptions: { executablePath } } },
    // Other engines run a representative sample, one test per tool family,
    // tagged @xb (`npx playwright install --with-deps firefox webkit`). One
    // retry in CI: "Download all" sometimes yields no download in Firefox
    // under load (B-06, docs/bug-audit.md); a retry shows it as flaky.
    { name: "firefox", grep: /@xb/, retries: process.env.CI ? 1 : 0, use: { ...devices["Desktop Firefox"], viewport: { width: 1280, height: 900 } } },
    { name: "webkit", grep: /@xb/, retries: process.env.CI ? 1 : 0, use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 900 } } },
    // Phone emulation (touch, mobile viewport and user agent) with the same sample.
    { name: "iphone", grep: /@xb/, retries: process.env.CI ? 1 : 0, use: { ...devices["iPhone 13"] } },
    { name: "android", grep: /@xb/, retries: process.env.CI ? 1 : 0, use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : [
        {
          command: `npx next start -p ${port}`,
          url: `${baseURL}/es`,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
          // Show both sign-in methods; login.spec.ts stubs the Auth.js endpoints.
          // Magic links need a database (B-01): an unreachable one is enough, since
          // signed-out requests never query it.
          env: { AUTH_SECRET: "e2e-only-not-a-real-secret", AUTH_EMAIL_LOG_LINKS: "true", MONGODB_URI: "mongodb://127.0.0.1:9/e2e", AUTH_GOOGLE_ID: "e2e", AUTH_GOOGLE_SECRET: "e2e" },
        },
        {
          // Signed-in pages (clickable.spec.ts signs in as this admin with a JWT
          // session, see hit-test.ts). No email provider here: without MongoDB
          // it makes every Auth.js call fail (bug B-01 in docs/bug-audit.md).
          command: `npx next start -p ${port + 1}`,
          url: `http://localhost:${port + 1}/es`,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
          // PAYMENTS_MOCK shows the checkout button (billing-states.spec.ts stubs its API).
          env: { AUTH_SECRET: "e2e-only-not-a-real-secret", AUTH_GOOGLE_ID: "e2e", AUTH_GOOGLE_SECRET: "e2e", ADMIN_EMAILS: "admin@e2e.test", PAYMENTS_MOCK: "true" },
        },
      ],
});
