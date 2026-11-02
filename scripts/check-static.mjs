// After `next build`: every public page in the sitemap must be prerendered
// (SSG), except the ones that are dynamic on purpose. Guards against a change
// that silently turns the conversion / long-tail / legal pages dynamic.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DYNAMIC_ON_PURPOSE = [/^\/[a-z]{2}\/pricing$/]; // prices depend on the country

const manifest = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8"));
const sitemap = readFileSync(".next/server/app/sitemap.xml.body", "utf8");
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeURI(new URL(m[1]).pathname));
const missing = paths.filter(
  (p) => !manifest.routes[p] && !manifest.routes[encodeURI(p)] && !DYNAMIC_ON_PURPOSE.some((re) => re.test(p)),
);
if (paths.length === 0) {
  console.error("check-static: no URLs found in the sitemap");
  process.exit(1);
}
if (missing.length > 0) {
  console.error(`check-static: ${missing.length} sitemap pages are not static:\n  ${missing.slice(0, 20).join("\n  ")}`);
  process.exit(1);
}
console.log(`check-static: ${paths.length} sitemap pages, all static except pricing`);

// The cloud voice's key and provider code are server-only (task 13.3): no
// browser file may mention them.
const leaks = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(js|css|html|json)$/.test(entry.name) && /GOOGLE_TTS_API_KEY|X-Goog-Api-Key|texttospeech\.googleapis\.com/.test(readFileSync(file, "utf8"))) leaks.push(file);
  }
};
walk(".next/static");
if (leaks.length > 0) {
  console.error(`check-static: server-only TTS code in browser files:\n  ${leaks.join("\n  ")}`);
  process.exit(1);
}
console.log("check-static: no cloud TTS key or provider code in .next/static");
