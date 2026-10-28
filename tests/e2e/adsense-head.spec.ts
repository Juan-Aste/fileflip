// AdSense code on every page (phase 9 in PLAN.md): AdSense rejected the site
// because the code was not on all pages. With NEXT_PUBLIC_ADSENSE_CLIENT in
// the build, the HTML sent by the server (not the hydrated DOM) carries one
// `google-adsense-account` meta and one adsbygoogle.js loader in the <head>
// of every page; without it, none. The pages with ad slots load it once.
// scripts/check-adsense.mjs checks every prerendered page after the build.
// Not the 404s of unknown tool slugs: Next sends them as its error shell,
// whose <head> is filled in on the client (noindex, not reviewed by AdSense).
// Run it both ways: `npm run build && npx playwright test adsense-head`, and
// again with NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-0000000000000000 for both.
import { expect, test } from "./support";

const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const loader = /<script[^>]*src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=([^"&]*)"[^>]*>/g;
const meta = /<meta name="google-adsense-account" content="([^"]*)"/g;

const pages: Record<string, string[]> = {
  es: ["", "/png-a-jpg", "/herramientas-de-imagen", "/terms", "/privacy", "/contact", "/creditos"],
  en: ["", "/png-to-jpg", "/image-tools", "/terms", "/privacy", "/contact", "/credits"],
  pt: ["", "/png-para-jpg", "/ferramentas-de-imagem", "/terms", "/privacy", "/contact", "/creditos"],
  fr: ["", "/png-en-jpg", "/outils-image", "/terms", "/privacy", "/contact", "/credits"],
  zh: ["", "/png-to-jpg", "/image-tools", "/terms", "/privacy", "/contact", "/credits"],
};

for (const [locale, paths] of Object.entries(pages)) {
  test(`AdSense code in the server HTML <head> (${locale})`, async ({ request }) => {
    for (const path of paths) {
      const url = `/${locale}${path}`;
      const res = await request.get(url);
      expect(res.status(), url).toBe(200);
      const html = await res.text();
      const end = html.indexOf("</head>");
      expect(end, `${url} has a <head>`).toBeGreaterThan(0);
      const head = html.slice(0, end);
      const body = html.slice(end);
      const metas = [...head.matchAll(meta)].map((m) => m[1]);
      const loaders = [...head.matchAll(loader)].map((m) => m[1]);
      expect(metas, `${url} account meta`).toEqual(client ? [client] : []);
      expect(loaders, `${url} loader`).toEqual(client ? [client] : []);
      expect(head.match(loader)?.[0] ?? "", `${url} loader is async and anonymous`).toMatch(client ? /async.*crossorigin="anonymous"/ : /^$/);
      expect(body, `${url} no loader in the body`).not.toMatch(/<script[^>]*adsbygoogle\.js/);
    }
  });
}

test("the loader runs once on a page with ad slots", async ({ page, context }) => {
  const requests: string[] = [];
  // Never reach Google from the tests.
  await context.route(/googlesyndication\.com/, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });
  await page.goto("/es/png-a-jpg", { waitUntil: "networkidle" });
  // The sidebar slot fills in once the session is known.
  await expect(page.locator(client ? "ins.adsbygoogle" : "aside[aria-label] .border-dashed").first()).toBeAttached();
  const scripts = await page.locator('script[src*="adsbygoogle.js"]').count();
  expect(scripts).toBe(client ? 1 : 0);
  expect(requests.filter((u) => u.includes("adsbygoogle.js"))).toHaveLength(client ? 1 : 0);
});

test("/ads.txt", async ({ request }) => {
  const res = await request.get("/ads.txt");
  // Without a client id there are no ads, so the file does not exist.
  expect(res.status()).toBe(client ? 200 : 404);
  if (client) expect(await res.text()).toBe(`google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`);
});

test("a slot hidden by CSS is not filled until it shows", async ({ page, context }) => {
  test.skip(!client, "needs a build with NEXT_PUBLIC_ADSENSE_CLIENT");
  // The stub leaves window.adsbygoogle a plain array, so pushes can be counted.
  await context.route(/googlesyndication\.com/, (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  const pushes = () => page.evaluate(() => (window as { adsbygoogle?: unknown[] }).adsbygoogle?.length ?? 0);
  // Below xl the sidebar is display:none: AdSense would throw "No slot size
  // for availableWidth=0" on a push.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/es", { waitUntil: "networkidle" });
  await expect(page.locator("ins.adsbygoogle")).toBeAttached();
  expect(await pushes()).toBe(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(pushes).toBe(1);
});
