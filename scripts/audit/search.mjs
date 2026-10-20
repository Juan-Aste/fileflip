// Browser check of the catalog search (Ctrl+K, "/", arrows, Enter, Escape) at 360 and 1280 px.
// Usage: node scripts/audit/search.mjs  (against a running `next start` on :3000; CHROME_PATH as in browser.mjs)
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ok = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) process.exitCode = 1; };
for (const [w, scheme] of [[1280, "light"], [360, "dark"]]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 }, colorScheme: scheme });
  const reqs = []; p.on("request", (r) => reqs.push(r.url()));
  await p.goto((process.env.BASE_URL ?? "http://localhost:3000") + "/es", { waitUntil: "networkidle" });
  ok(!reqs.some((u) => u.includes("search-index")), `${w}: index not loaded on page load`);
  await p.keyboard.press("Control+k");
  const box = p.getByRole("combobox", { name: "Buscar herramientas" });
  await box.waitFor();
  await box.fill("heic jpg");
  await p.getByRole("listbox", { name: "Buscar herramientas" }).getByRole("option").first().waitFor();
  ok((await p.locator("dialog [role=status]").textContent()).includes("resultado"), `${w}: status announces results`);
  await p.keyboard.press("Enter");
  await p.waitForURL("**/es/heic-a-jpg");
  ok(true, `${w}: Enter navigates to /es/heic-a-jpg`);
  await p.keyboard.press("/");
  await box.waitFor();
  await box.fill("zzzz");
  ok((await p.locator("dialog [role=status]").textContent()).includes("No encontramos"), `${w}: no results message`);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(200);
  ok(!(await box.isVisible()), `${w}: Escape closes`);
  await p.getByRole("button", { name: "Buscar herramientas" }).click();
  await box.fill("unir");
  await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowUp"); await p.keyboard.press("Enter");
  await p.waitForURL("**/es/unir-pdf");
  ok(true, `${w}: button + arrows + Enter → /es/unir-pdf`);
  await p.close();
}
await b.close();
