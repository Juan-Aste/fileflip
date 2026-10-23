// Phase 6A: everything visible can be clicked. Walks every published page
// (and the signed-in account and admin pages) at desktop, tablet and phone
// sizes, light and dark, and checks with document.elementFromPoint that each
// link, button and form control receives its own clicks (see hit-test.ts).
// A failure lists "page → kind: element (detail)"; JSON reports land in
// test-results/hit-test/ for the bug log.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { longtailPages } from "../../src/content/longtail";
import { sitemapEntries } from "../../src/lib/seo";
import { hitTestPage, signInAsAdmin, type HitIssue } from "./hit-test";
import { expect, test } from "./support";

const paths = [
  ...new Set([
    ...sitemapEntries("")
      .map((e) => e.url)
      .filter((u) => u.startsWith("/es") || /^\/(en|pt|fr|zh)$/.test(u)),
    // Long-tail pages exist in their own language only.
    ...longtailPages.map((p) => `/${p.locale}/${p.slug}`),
    "/es/login",
    "/es/login/verify",
  ]),
];
const signedIn = ["/es/account", "/es/admin"];
const signedInBaseURL = `http://localhost:${Number(process.env.E2E_PORT ?? 3100) + 1}`;

const viewports = [
  { name: "desktop", width: 1280, height: 800, touch: false },
  { name: "tablet", width: 768, height: 1024, touch: true },
  { name: "phone", width: 390, height: 844, touch: true },
] as const;
const schemes = ["light", "dark"] as const;
const chunk = 16;

const outDir = join(__dirname, "..", "..", "test-results", "hit-test");

for (const vp of viewports) {
  for (const scheme of schemes) {
    test.describe(`${vp.name} ${vp.width}×${vp.height} ${scheme}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height }, colorScheme: scheme, hasTouch: vp.touch, isMobile: vp.name === "phone" });

      const groups: string[][] = [];
      for (let i = 0; i < paths.length; i += chunk) groups.push(paths.slice(i, i + chunk));
      if (!process.env.BASE_URL) groups.push(signedIn);

      groups.forEach((group, index) => {
        test(`pages ${index + 1}/${groups.length}`, async ({ page, baseURL }) => {
          test.setTimeout(group.length * 15_000 + 30_000);
          const report: Record<string, HitIssue[]> = {};
          // The signed-in pages live on the second e2e server (playwright.config.ts).
          const base = group === signedIn ? signedInBaseURL : baseURL!;
          if (group === signedIn) await signInAsAdmin(page, base);
          for (const path of group) {
            const res = await page.goto(base + path, { waitUntil: "networkidle" });
            expect(res?.status(), path).toBeLessThan(400);
            await page.evaluate(() => document.fonts.ready);
            const issues = await hitTestPage(page, { touch: vp.touch });
            if (issues.length) report[path] = issues;
          }
          mkdirSync(outDir, { recursive: true });
          writeFileSync(join(outDir, `${vp.name}-${scheme}-${index + 1}.json`), JSON.stringify(report, null, 2));
          const lines = Object.entries(report).flatMap(([path, issues]) =>
            issues.map((i) => `${path} → ${i.kind}: ${i.target} (${i.detail})`),
          );
          expect(lines).toEqual([]);
        });
      });
    });
  }
}

// The detector itself: an invisible decorative layer over the hero (the bug the
// owner found in production) and a crowded tiny button must be reported.
test("hit test reports an invisible layer and crowded small targets", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/es", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;z-index:5";
    document.querySelector("main")!.style.position = "relative";
    document.querySelector("main")!.append(layer);
    const box = document.createElement("div");
    box.innerHTML = '<button style="width:16px;height:16px">a</button><button style="width:16px;height:16px">b</button>';
    box.style.cssText = "position:relative;z-index:10";
    document.body.prepend(box);
  });
  const issues = await hitTestPage(page, { touch: true });
  expect(issues.some((i) => i.kind === "covered" && i.detail.startsWith("covered by div"))).toBe(true);
  expect(issues.filter((i) => i.kind === "small" && /^button "[ab]"/.test(i.target))).toHaveLength(2);
});
