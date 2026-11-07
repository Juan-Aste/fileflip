// Search Console (2026-11-07) reported 339 URLs as 404: slugs of one language
// under another language's prefix (/es/jpg-to-pdf) or without a prefix
// (/csv-to-pdf). The cause was next-intl's `Link` hreflang header (it swapped
// only the prefix), off since 2026-10-31; the middleware now sends any known
// slug to its right page with one 301. These tests walk every reported URL,
// and check that the sitemap, every hreflang and every internal link answer
// 200 without a redirect.
import { readFileSync } from "node:fs";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "./support";

const locales = ["es", "en", "pt", "fr", "zh"];
// Price suffixes ("/mes", "/mo"…) taken from the page's JSON: no page, stay 404.
const junk = new Set(["/mes", "/mo", "/yr", "/ano", "/an", "/m%C3%AAs", "/mois", "/%E6%9C%88", "/%E5%B9%B4"]);

function gscPaths(file: string): string[] {
  return readFileSync(`docs/seo/gsc-2026-11-07/${file}`, "utf8")
    .split("\n")
    .slice(1)
    .map((line) => line.split(",")[0].trim())
    .filter(Boolean)
    .map((url) => new URL(url).pathname);
}

const toPath = (url: string) => {
  const u = new URL(url, "http://x");
  return u.pathname;
};

async function statusOf(request: APIRequestContext, path: string) {
  const res = await request.get(path, { maxRedirects: 0 });
  return { status: res.status(), location: res.headers()["location"] };
}

/** Runs `fn` over `items` with a few requests at a time. */
async function pool<T>(items: T[], fn: (item: T) => Promise<void>, size = 8) {
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
}

test.describe("Search Console URLs", () => {
  test.setTimeout(300_000);

  test("every reported 404 and redirect reaches a 200 page with one permanent redirect", async ({ request }) => {
    const paths = [...gscPaths("404.csv"), ...gscPaths("redireccion.csv")];
    expect(paths.length).toBe(384);
    const problems: string[] = [];
    await pool(paths, async (path) => {
      if (junk.has(path)) {
        // Without a prefix next-intl first adds the visitor's language, then 404.
        const final = (await request.get(path)).status();
        if (final !== 404) problems.push(`${path} → ${final} (expected 404)`);
        return;
      }
      const first = await statusOf(request, path);
      if (![301, 308].includes(first.status) || !first.location) {
        problems.push(`${path} → ${first.status}`);
        return;
      }
      const target = toPath(first.location);
      const second = await statusOf(request, target);
      if (second.status !== 200) problems.push(`${path} → ${target} → ${second.status}`);
    });
    expect(problems).toEqual([]);
  });

  test("unknown slugs still give a real 404 (not the home page)", async ({ request }) => {
    for (const path of ["/es/no-existe", "/en/jpg-to-nothing", "/no-such-page", "/zh/x/y"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("sitemap URLs, their hreflang, every page's alternates and internal links answer 200 without redirect", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const sitemap = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => toPath(m[1])));
    const alternates = new Set([...xml.matchAll(/hreflang="[^"]+"\s+href="([^"]+)"/g)].map((m) => toPath(m[1])));
    expect(sitemap.size).toBeGreaterThan(100);
    const linked = new Set<string>();
    const problems: string[] = [];
    await pool([...sitemap], async (path) => {
      const res = await request.get(path, { maxRedirects: 0 });
      if (res.status() !== 200) {
        problems.push(`sitemap ${path} → ${res.status()}`);
        return;
      }
      const html = await res.text();
      for (const m of html.matchAll(/<link rel="alternate" hrefLang="[^"]+" href="([^"]+)"/gi)) alternates.add(toPath(m[1]));
      for (const m of html.matchAll(/<link rel="canonical" href="([^"]+)"/gi)) alternates.add(toPath(m[1]));
      for (const m of html.matchAll(/<a [^>]*href="(\/[^"#?]*)/g)) linked.add(m[1]);
    });
    const checked = [...new Set([...alternates, ...linked])].filter((p) => !sitemap.has(p) && locales.some((l) => p === `/${l}` || p.startsWith(`/${l}/`)));
    await pool(checked, async (path) => {
      const { status } = await statusOf(request, path);
      // Pages behind a sign-in are linked but answer with their own redirect.
      if (status !== 200 && !/\/(account|login)$/.test(path)) problems.push(`${alternates.has(path) ? "hreflang" : "link"} ${path} → ${status}`);
    });
    expect(problems).toEqual([]);
  });
});
