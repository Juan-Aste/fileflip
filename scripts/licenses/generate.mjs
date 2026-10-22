// `npm run licenses`: regenerates the credits page data
// (src/content/credits.json) and the downloadable third-party notices
// (public/third-party-notices.txt) from package-lock.json, the installed
// packages in node_modules and docs/dependencies.md. Run it after adding,
// removing or updating a production dependency; tests/licenses.test.ts
// fails while the data is out of date.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { embedded, LICENSE_TEXTS } from "./embedded.mjs";
import { chooseLicense, documentedDependencies, productionPackages } from "./production.mjs";

const root = new URL("../../", import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), "utf8");

const lock = JSON.parse(read("package-lock.json"));
const documented = documentedDependencies(read("docs/dependencies.md"));
const whereByName = new Map();
for (const row of documented) for (const name of row.names) whereByName.set(name, row.where);

function personName(person) {
  if (!person) return undefined;
  const raw = typeof person === "string" ? person : person.name;
  return raw?.replace(/<[^>]*>|\([^)]*\)/g, "").trim() || undefined;
}

function projectUrl(pkg) {
  const repo = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
  let url = pkg.homepage || repo;
  if (!url) return `https://www.npmjs.com/package/${pkg.name}`;
  url = url
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^ssh:\/\/git@/, "https://")
    .replace(/^git@([^:]+):/, "https://$1/")
    .replace(/^github:/, "https://github.com/")
    .replace(/\.git(#.*)?$/, "");
  // "owner/repo" (or "owner/repo/packages/x") is GitHub shorthand.
  const shorthand = url.match(/^([\w.-]+\/[\w.-]+)(\/|$)/);
  if (shorthand && !url.includes(":")) url = `https://github.com/${shorthand[1]}`;
  return url.replace(/^http:\/\//, "https://");
}

const NOTICE_FILE = /^(licen[cs]e|copying|notice|copyright|authors|third[-_]party)/i;

function noticeFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((f) => f.isFile() && NOTICE_FILE.test(f.name))
    .map((f) => f.name)
    .sort();
}

/** Canonical texts (SPDX) for packages that ship no license file. */
function canonicalText(license, author = "") {
  const ids = license.split(/\s+AND\s+/);
  // The LGPL-3.0 is a set of permissions on top of the GPL-3.0.
  if (ids.some((id) => id.startsWith("LGPL-3.0"))) ids.push("GPL-3.0");
  return ids
    .map((id) => {
      const file = join(root, "scripts/licenses/texts", `${id.replace(/-(only|or-later)$/, "")}${/^L?GPL/.test(id) ? "-only" : ""}.txt`);
      if (!existsSync(file)) throw new Error(`No canonical text for ${id} in scripts/licenses/texts/`);
      const text = readFileSync(file, "utf8").trimEnd();
      return author ? text.replace(/^Copyright \(c\) <year> <[^>]+>\.?$/im, `Copyright (c) ${author}`) : text;
    })
    .join("\n\n");
}

const problems = [];
const packages = productionPackages(lock, (name) => {
  const where = whereByName.get(name);
  if (!where) problems.push(`${name}: direct dependency missing from docs/dependencies.md`);
  return where ?? [];
});

const credits = [];
const missingFiles = [];
const notices = [];
for (const p of packages) {
  const dir = join(root, p.path);
  if (!existsSync(join(dir, "package.json"))) {
    problems.push(`${p.name}@${p.version}: not installed (run npm ci)`);
    continue;
  }
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const declared = pkg.license ?? pkg.licenses?.map((l) => l.type ?? l).join(" OR ") ?? p.license;
  const chosen = chooseLicense(declared, p.name);
  if (!chosen.ok) problems.push(`${p.name}@${p.version}: ${declared} (${chosen.reason})`);
  const author = personName(pkg.author) ?? personName(pkg.contributors?.[0]) ?? personName(pkg.maintainers?.[0]);
  const holder = author ?? `the ${p.name} authors`;
  const url = projectUrl(pkg);
  const files = noticeFiles(dir);
  credits.push({
    name: p.name,
    version: p.version,
    license: chosen.license,
    ...(chosen.license !== declared ? { declared } : {}),
    ...(author ? { author } : {}),
    url,
    where: p.where,
    direct: p.direct,
  });
  const header = [`${p.name} ${p.version}`, `License: ${chosen.license}${chosen.license !== declared ? ` (declared: ${declared})` : ""}`, `Project: ${url}`];
  if (author) header.push(`Author: ${author}`);
  const body = files.length
    ? files.map((f) => `--- ${f} ---\n${readFileSync(join(dir, f), "utf8").replace(/\r\n?/g, "\n").trimEnd()}`).join("\n\n")
    : `The package ships no license file; its package.json declares "${declared}". Standard text:\n\n${canonicalText(chosen.license, holder)}`;
  if (!files.length) missingFiles.push(`${p.name}@${p.version}`);
  notices.push(`${"=".repeat(78)}\n${header.join("\n")}\n${"=".repeat(78)}\n\n${body}\n`);
}

// Engines and data inside packages, our own builds and server services.
const embeddedNotices = embedded.map((e) => {
  const header = [`${e.name} ${e.version}`, `License: ${e.license}`, `Project: ${e.homepage}`];
  if (e.partOf) header.push(`Included in: ${e.partOf}`);
  if (e.source) header.push(`Source code${e.exactSource === false ? " (exact commit not recorded by the build)" : ""}: ${e.source}`);
  if (e.build) header.push(`Build: ${e.build}`);
  const lgpl = e.lgpl
    ? `Used unmodified under the ${e.license}, as a separate, replaceable file (WASM module or shared library). License text: /licenses/${e.licenseText}.txt`
    : "";
  const text = e.kind === "service" ? "Runs as a separate service; not distributed with Fileflect." : lgpl || canonicalText(e.licenseText, `the ${e.name} authors`);
  return `${"=".repeat(78)}\n${header.join("\n")}\n${"=".repeat(78)}\n\n${text}\n`;
});

if (problems.length) {
  console.error(`Licenses: ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

writeFileSync(join(root, "src/content/credits.json"), `${JSON.stringify({ packages: credits, embedded }, null, 2)}\n`);
const licensesDir = join(root, "public/licenses");
mkdirSync(licensesDir, { recursive: true });
for (const id of LICENSE_TEXTS) writeFileSync(join(licensesDir, `${id}.txt`), `${canonicalText(id)}\n`);
// Our libarchive WASM (BSD): how it is built, for anyone who wants to rebuild it.
writeFileSync(
  join(licensesDir, "libarchive-build.txt"),
  ["build.sh", "glue.c", "read_memory.c"]
    .map((f) => `===== scripts/libarchive/${f} =====\n\n${read(`scripts/libarchive/${f}`).trimEnd()}\n`)
    .join("\n"),
);
writeFileSync(
  join(root, "public/third-party-notices.txt"),
  [
    "Fileflect — third-party software notices",
    "",
    "Fileflect includes or uses the following third-party software. Each entry",
    "names the component, its version, the license we use it under and the",
    "license, copyright and NOTICE files shipped with it. Generated by",
    "`npm run licenses` (scripts/licenses/generate.mjs).",
    "",
    "",
    notices.join("\n\n"),
    "",
    "",
    "Components inside the packages above, our own builds and server services",
    "",
    "",
    embeddedNotices.join("\n\n"),
  ].join("\n"),
);
console.log(`Licenses: ${credits.length} packages; without a license file (standard text used): ${missingFiles.join(", ") || "none"}.`);
