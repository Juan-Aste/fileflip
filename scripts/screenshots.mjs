// Full-page screenshots at 360 px and 1280 px, light and dark, against a
// running `next start`. Usage:
//   node scripts/screenshots.mjs [outDir] [path ...]
// BASE_URL defaults to http://localhost:3000; CHROME_PATH defaults to the
// Playwright Chromium preinstalled in the cloud environment. SESSION_TOKEN, if
// set, is sent as the Auth.js session cookie (for pages behind login).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const [outDir = "docs/screenshots", ...args] = process.argv.slice(2);
const paths = args.length ? args : ["/es"];
const executablePath =
  process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath });
for (const scheme of ["light", "dark"]) {
  for (const width of [360, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: width < 768 ? 780 : 900 },
      colorScheme: scheme,
      deviceScaleFactor: 1,
    });
    if (process.env.SESSION_TOKEN) {
      await context.addCookies([{ name: "authjs.session-token", value: process.env.SESSION_TOKEN, url: base }]);
    }
    const page = await context.newPage();
    for (const path of paths) {
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const name = (path.replace(/^\//, "").replace(/\//g, "_") || "root") + `-${width}-${scheme}.png`;
      await page.screenshot({ path: `${outDir}/${name}`, fullPage: true });
      console.log(name);
    }
    await context.close();
  }
}
await browser.close();
