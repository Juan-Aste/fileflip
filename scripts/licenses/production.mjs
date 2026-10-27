// Shared by `npm run licenses` (scripts/licenses/generate.mjs) and the
// credits test: which third-party packages ship with the app, where they run
// and whether their license is acceptable.

/** The deploy target (Docker node:22-bookworm-slim on Railway). */
export const TARGET = { os: "linux", cpu: "x64", libc: "glibc" };

/** GPL/AGPL packages the owner approved (none so far; see docs/dependencies.md). */
export const APPROVED_COPYLEFT = [];

/** For dual-licensed packages, the alternative we use (see docs/dependencies.md). */
export const PREFERRED_LICENSE = { dompurify: "Apache-2.0" };

/** Licenses a production package may use without a human looking at it first. */
export const KNOWN_LICENSES = [
  "MIT", "MIT-0", "ISC", "0BSD", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "Zlib",
  "MPL-2.0", "LGPL-2.0", "LGPL-2.1", "LGPL-3.0", "LGPL-2.1-or-later", "LGPL-3.0-or-later",
  "LGPL-2.0-or-later", "LGPL-2.0-only", "LGPL-2.1-only", "LGPL-3.0-only",
  "OFL-1.1", "BigScience-OpenRAIL-M", "CC-BY-4.0", "CC0-1.0", "BlueOak-1.0.0", "Python-2.0", "Unlicense", "IJG", "bzip2-1.0.6", "MPL-1.1",
];

const isStrongCopyleft = (id) => /^(A?GPL|GPL)-/.test(id);

/**
 * Picks the license we use a package under from its SPDX expression: for
 * "A OR B" the first alternative without GPL/AGPL; "A AND B" needs all.
 * Returns { license, ok, reason }.
 */
export function chooseLicense(expression, name = "") {
  const expr = String(expression ?? "").trim().replace(/^\((.*)\)$/, "$1");
  if (!expr) return { license: "UNKNOWN", ok: false, reason: "no license field" };
  const options = expr.split(/\s+OR\s+/).map((o) => o.trim().replace(/^\((.*)\)$/, "$1"));
  const preferred = PREFERRED_LICENSE[name];
  if (preferred && options.includes(preferred)) options.unshift(preferred);
  for (const option of options) {
    const ids = option.split(/\s+AND\s+/).map((s) => s.trim());
    const copyleft = ids.filter(isStrongCopyleft);
    if (copyleft.length && !APPROVED_COPYLEFT.includes(name)) continue;
    const unknown = ids.filter((id) => !KNOWN_LICENSES.includes(id) && !APPROVED_COPYLEFT.includes(name));
    if (unknown.length) return { license: option, ok: false, reason: `unknown license ${unknown.join(", ")}` };
    return { license: option, ok: true };
  }
  return { license: expr, ok: false, reason: "GPL/AGPL not approved by the owner" };
}

function matches(list, value) {
  if (!list) return true;
  const allowed = list.filter((v) => !v.startsWith("!"));
  if (list.includes(`!${value}`)) return false;
  return allowed.length === 0 || allowed.includes(value);
}

/** Whether an (often optional, platform-specific) package is installed on the target. */
export function runsOnTarget(entry, path) {
  if (!matches(entry.os, TARGET.os) || !matches(entry.cpu, TARGET.cpu)) return false;
  if (entry.libc && !matches(entry.libc, TARGET.libc)) return false;
  // Older lockfiles omit "libc": musl builds say so in their name.
  return !/musl/.test(path);
}

/** "node_modules/a/node_modules/@s/b" → "@s/b". */
export const nameFromPath = (path) => path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);

/** Node's resolution over the lockfile's flat "packages" map. */
function resolveFrom(packages, from, dep) {
  let base = from;
  for (;;) {
    const candidate = `${base ? `${base}/` : ""}node_modules/${dep}`;
    if (packages[candidate]) return candidate;
    if (!base) return undefined;
    const i = base.lastIndexOf("/node_modules/");
    base = i === -1 ? "" : base.slice(0, i);
  }
}

/**
 * Every package reachable from package.json "dependencies" on the target
 * platform, with the places it runs ("browser"/"server") inherited from the
 * direct dependencies that pull it in (`whereOf(name)` for direct ones).
 */
export function productionPackages(lock, whereOf) {
  const packages = lock.packages;
  const root = packages[""];
  const found = new Map(); // path → { name, version, license, where:Set, direct }
  const queue = [];
  const visit = (path, where, direct) => {
    const entry = packages[path];
    if (!entry || entry.dev || !runsOnTarget(entry, path)) return;
    let item = found.get(path);
    if (!item) {
      item = { path, name: entry.name ?? nameFromPath(path), version: entry.version, license: entry.license, where: new Set(), direct };
      found.set(path, item);
    }
    const before = item.where.size;
    where.forEach((w) => item.where.add(w));
    if (item.where.size !== before || before === 0) queue.push(path);
  };
  for (const dep of Object.keys(root.dependencies ?? {})) {
    visit(`node_modules/${dep}`, whereOf(dep), true);
  }
  while (queue.length) {
    const path = queue.shift();
    const entry = packages[path];
    const item = found.get(path);
    const deps = { ...entry.peerDependencies, ...entry.optionalDependencies, ...entry.dependencies };
    for (const dep of Object.keys(deps)) {
      const target = resolveFrom(packages, path, dep);
      if (target) visit(target, item.where, false);
    }
  }
  return [...found.values()]
    .map((p) => ({ ...p, where: [...p.where].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

/** Expands the first cell of a docs/dependencies.md row into package names. */
export function namesFromCell(cell) {
  const names = [];
  let text = cell.replace(/^└\s*/, "").replace(/`/g, "");
  // "a (+ b)": b is a separate, unscoped package.
  text = text.replace(/\(\+\s*([^)]+)\)/g, (_, extra) => {
    names.push(...extra.split(",").map((s) => s.trim()).filter(Boolean));
    return "";
  });
  // "@s/{a,b}" → "@s/a, @s/b"; other notes in parentheses are dropped.
  text = text
    .replace(/(\S*)\{([^}]+)\}/g, (_, prefix, list) => list.split(",").map((b) => prefix + b.trim()).join(", "))
    .replace(/\([^)]*\)/g, "");
  let scope = "";
  const own = [];
  for (const part of text.split(",").map((s) => s.trim().split(/\s/)[0]).filter(Boolean)) {
    if (part.startsWith("@")) scope = part.split("/")[0];
    // "@jsquash/jpeg, png": the scope carries over.
    own.push(scope && !part.includes("/") && own.length ? `${scope}/${part}` : part);
  }
  return [...own, ...names];
}

/** @typedef {{ names: string[], license: string, use: string, where: ("browser"|"server")[] }} DocumentedRow */

/**
 * Rows of the "Producción" table of docs/dependencies.md.
 * @param {string} markdown
 * @returns {DocumentedRow[]}
 */
export function documentedDependencies(markdown) {
  const section = markdown.split(/^## /m).find((s) => s.startsWith("Producción"));
  if (!section) throw new Error("docs/dependencies.md has no \"Producción\" section");
  return section
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|\s*(Paquete|---)/.test(line))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      const [first, , license, use, place = ""] = cells;
      /** @type {DocumentedRow["where"]} */
      const where = [];
      if (/\bN\b/.test(place)) where.push("browser");
      if (/\bS\b/.test(place)) where.push("server");
      // Paths like "/ocr/" or "public/bg/" are served to the browser.
      if (!where.length && /\//.test(place)) where.push("browser");
      return { names: namesFromCell(first), license, use, where };
    });
}
