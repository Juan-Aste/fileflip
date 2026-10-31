// Read-only smoke test of a deployed site (6D.3 in PLAN.md):
//   node scripts/smoke-production.mjs [https://fileflect.com]
// About 14 page requests (a few seconds apart) plus two browser page loads
// that run one image and one PDF tool locally (the conversion API is blocked).
// It never signs in, asks for login emails, starts payments or converts on
// the server. Prints a JSON report.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const base = (process.argv[2] ?? "https://fileflect.com").replace(/\/+$/, "");
const pause = () => new Promise((r) => setTimeout(r, 3000));
const fixture = (name) => join(import.meta.dirname, "..", "tests", "fixtures", name);
const securityHeaders = [
  "content-security-policy",
  "x-content-type-options",
  "referrer-policy",
  "x-frame-options",
  "permissions-policy",
  "strict-transport-security",
];

const pages = [
  "/api/health",
  "/es",
  "/en",
  "/es/herramientas",
  "/en/merge-pdf",
  "/es/comprimir-imagen",
  "/en/word-to-pdf",
  "/en/json-to-csv",
  "/pt/ferramentas",
  "/en/credits",
  "/robots.txt",
  "/sitemap.xml",
];

const report = { base, at: new Date().toISOString(), pages: [], browser: [] };

for (const path of pages) {
  const res = await fetch(base + path, { redirect: "manual" });
  const body = await res.text();
  report.pages.push({
    path,
    status: res.status,
    type: res.headers.get("content-type"),
    bytes: body.length,
    missingHeaders: securityHeaders.filter((h) => !res.headers.has(h)),
    canonical: body.match(/<link rel="canonical" href="([^"]+)"/)?.[1],
    sitemapHost: path === "/sitemap.xml" ? body.match(/<loc>(https?:\/\/[^/<]+)/)?.[1] : undefined,
    robotsSitemap: path === "/robots.txt" ? body.match(/Sitemap: (\S+)/i)?.[1] : undefined,
    health: path === "/api/health" ? body : undefined,
  });
  await pause();
}

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ proxy });

/** Opens a tool, picks files, runs it and reports the download plus console errors and failed requests. */
async function runTool(path, files, action) {
  const page = await browser.newPage({ acceptDownloads: true });
  const entry = { path, consoleErrors: [], failedRequests: [], serverCalls: [] };
  page.on("console", (m) => m.type() === "error" && entry.consoleErrors.push(m.text().slice(0, 300)));
  page.on("pageerror", (e) => entry.consoleErrors.push(`pageerror: ${e.message.slice(0, 300)}`));
  page.on("response", (r) => r.status() >= 400 && entry.failedRequests.push(`${r.status()} ${r.url()}`));
  // Browser tools must not need the server; never convert there in production.
  await page.route("**/api/convert/**", (route) => {
    entry.serverCalls.push(route.request().url());
    return route.abort();
  });
  try {
    await page.goto(base + path, { waitUntil: "networkidle", timeout: 60_000 });
    await page.locator("input[type=file]").first().setInputFiles(files.map(fixture));
    await page.getByRole("button", { name: action }).first().click();
    const link = page.locator("main a[download]").first();
    await link.waitFor({ timeout: 60_000 });
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 20_000 }), link.click()]);
    entry.download = download.suggestedFilename();
    entry.bytes = readFileSync(await download.path()).length;
  } catch (error) {
    entry.error = String(error).slice(0, 500);
    entry.alert = await page.locator("[role=alert]").allInnerTexts().catch(() => []);
  }
  await page.close();
  report.browser.push(entry);
}

await runTool("/es/comprimir-imagen", ["photo.jpg"], /Comprimir/);
await pause();
await runTool("/es/unir-pdf", ["document.pdf", "document-1page.pdf"], /Unir PDF/);
await browser.close();

console.log(JSON.stringify(report, null, 2));
