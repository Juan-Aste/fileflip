// After `next build`: every prerendered page must carry the AdSense code in
// its <head> (one account meta and one loader script) when the build has
// NEXT_PUBLIC_ADSENSE_CLIENT, and none of it when it does not. AdSense
// rejects the site if the code is missing from any page (phase 9, PLAN.md).
// adsense-head.spec.ts checks the HTML served by `next start` as well.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const root = ".next/server/app";

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return e.name.endsWith(".html") ? [p] : [];
  });
}

const count = (s, re) => (s.match(re) ?? []).length;
// Next's built-in noindex 404 outside [locale]: the middleware sends every
// path to a locale, so visitors never get it (they get [locale]/not-found).
const files = htmlFiles(root).filter((f) => !f.endsWith("_not-found.html"));
const bad = [];
for (const file of files) {
  const html = readFileSync(file, "utf8");
  const end = html.indexOf("</head>");
  const head = end === -1 ? "" : html.slice(0, end);
  const body = end === -1 ? html : html.slice(end);
  const metas = count(head, /<meta name="google-adsense-account" content="([^"]*)"/g);
  const scripts = count(head, /<script[^>]*src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=[^"]*"/g);
  const bodyScripts = count(body, /<script[^>]*src="[^"]*adsbygoogle\.js/g);
  const want = client ? 1 : 0;
  const rightClient = !client || (head.includes(`content="${client}"`) && head.includes(`adsbygoogle.js?client=${client}"`));
  if (metas !== want || scripts !== want || bodyScripts !== 0 || !rightClient) {
    bad.push(`${file}: meta ${metas}, head script ${scripts}, body script ${bodyScripts}`);
  }
}
if (files.length === 0) {
  console.error("check-adsense: no prerendered pages found; run `next build` first");
  process.exit(1);
}
if (bad.length > 0) {
  console.error(`check-adsense: ${bad.length} pages without the expected AdSense code (expected ${client ? "one of each" : "none"}):\n  ${bad.slice(0, 20).join("\n  ")}`);
  process.exit(1);
}
console.log(`check-adsense: ${files.length} pages, ${client ? "AdSense meta and loader in every <head>" : "no AdSense code (no client id)"}`);
