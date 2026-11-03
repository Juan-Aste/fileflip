import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import credits from "@/content/credits.json";
import { embedded } from "../scripts/licenses/embedded.mjs";
import {
  chooseLicense,
  documentedDependencies,
  namesFromCell,
  productionPackages,
} from "../scripts/licenses/production.mjs";

// The credits page lists every production package (scripts/licenses/generate.mjs,
// `npm run licenses`). The lockfile's production closure on the deploy target
// is a superset of what the build ships, so checking it covers the build.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const lock = JSON.parse(read("package-lock.json"));
const pkg = JSON.parse(read("package.json"));
const documented = documentedDependencies(read("docs/dependencies.md"));
const documentedNames = new Set(documented.flatMap((row) => row.names));
const notices = read("public/third-party-notices.txt");

describe("license helpers", () => {
  it("prefers a permissive alternative and accepts AGPL-compatible copyleft", () => {
    expect(chooseLicense("(MIT OR GPL-3.0-or-later)")).toEqual({ license: "MIT", ok: true });
    expect(chooseLicense("(GPL-3.0-or-later OR MIT)")).toEqual({ license: "MIT", ok: true });
    expect(chooseLicense("(MPL-2.0 OR Apache-2.0)", "dompurify").license).toBe("Apache-2.0");
    expect(chooseLicense("LGPL-3.0-or-later").ok).toBe(true);
    for (const id of ["GPL-3.0", "GPL-3.0-only", "GPL-3.0-or-later", "AGPL-3.0", "AGPL-3.0-only", "AGPL-3.0-or-later", "GPL-2.0-or-later"]) {
      expect(chooseLicense(id), id).toEqual({ license: id, ok: true });
    }
    expect(chooseLicense("MIT AND GPL-3.0-only").ok).toBe(true);
    expect(chooseLicense("(GPL-2.0-only OR GPL-3.0-only)").license).toBe("GPL-3.0-only");
  });

  it("rejects GPL-2.0-only, non-commercial, SSPL and unknown licenses", () => {
    for (const id of ["GPL-2.0", "GPL-2.0-only", "GPL-1.0-or-later", "SSPL-1.0", "CC-BY-NC-4.0", "CC-BY-NC-SA-4.0", "CC-BY-NC-ND-3.0", "BUSL-1.1", "PolyForm-Noncommercial-1.0.0"]) {
      expect(chooseLicense(id).ok, id).toBe(false);
    }
    expect(chooseLicense("MIT AND GPL-2.0-only").ok).toBe(false);
    expect(chooseLicense("Apache-2.0 AND CC-BY-NC-4.0").ok).toBe(false);
    expect(chooseLicense("Proprietary").ok).toBe(false);
    expect(chooseLicense(undefined).ok).toBe(false);
  });

  it("reads package names from docs/dependencies.md cells", () => {
    expect(namesFromCell("@jsquash/jpeg, png, webp, avif")).toEqual([
      "@jsquash/jpeg",
      "@jsquash/png",
      "@jsquash/webp",
      "@jsquash/avif",
    ]);
    expect(namesFromCell("@jsquash/oxipng (+ wasm-feature-detect)")).toEqual(["@jsquash/oxipng", "wasm-feature-detect"]);
    expect(namesFromCell("@tesseract.js-data/{eng,spa}")).toEqual(["@tesseract.js-data/eng", "@tesseract.js-data/spa"]);
    expect(namesFromCell("xlsx (SheetJS CE)")).toEqual(["xlsx"]);
  });
});

describe("credits", () => {
  const production = productionPackages(lock, (name: string) => (documentedNames.has(name) ? ["browser"] : []));

  it("documents every direct production dependency in docs/dependencies.md", () => {
    const undocumented = Object.keys(pkg.dependencies).filter((name) => !documentedNames.has(name));
    expect(undocumented).toEqual([]);
  });

  it("has an entry for every production package (run `npm run licenses` after changing dependencies)", () => {
    const listed = new Set(credits.packages.map((c) => `${c.name}@${c.version}`));
    const expected = new Set(production.map((p) => `${p.name}@${p.version}`));
    expect([...expected].filter((id) => !listed.has(id))).toEqual([]);
    expect([...listed].filter((id) => !expected.has(id))).toEqual([]);
  });

  it("uses only AGPL-compatible licenses", () => {
    const rejected = production
      .map((p) => ({ id: `${p.name}@${p.version}`, ...chooseLicense(p.license, p.name) }))
      .filter((p) => !p.ok);
    expect(rejected).toEqual([]);
    for (const c of credits.packages) expect(chooseLicense(c.license, c.name).ok, c.name).toBe(true);
  });

  it("gives each entry a project link, a place and its notices", () => {
    for (const c of credits.packages) {
      expect(c.url, c.name).toMatch(/^https:\/\//);
      expect(c.where.length, c.name).toBeGreaterThan(0);
      expect(notices).toContain(`\n${c.name} ${c.version}\nLicense: ${c.license}`);
    }
  });
});

describe("embedded components", () => {
  const packageNames = new Set(credits.packages.map((c) => c.name));

  it("are in the credits data, inside packages we ship", () => {
    expect(credits.embedded).toEqual(embedded);
    for (const e of embedded) {
      if (e.partOf && !e.partOf.endsWith("/*")) expect(packageNames.has(e.partOf), e.id).toBe(true);
      if (e.kind !== "service") expect(chooseLicense(e.license, e.id).ok, e.id).toBe(true);
      expect(notices).toContain(`\n${e.name} ${e.version}\nLicense: ${e.license}`);
    }
  });

  it("give every LGPL component its license text, source and build", () => {
    const lgpl = embedded.filter((e) => e.lgpl);
    for (const id of ["lame", "ffmpeg-aac", "libheif", "libde265", "libvips"]) {
      expect(lgpl.map((e) => e.id)).toContain(id);
    }
    for (const e of lgpl) {
      expect(e.license, e.id).toMatch(/LGPL/);
      expect(existsSync(new URL(`../public/licenses/${e.licenseText}.txt`, import.meta.url)), e.id).toBe(true);
      expect(e.source, e.id).toMatch(/^https:\/\//);
      expect(e.build, e.id).toMatch(/^(https:\/\/|\/licenses\/)/);
    }
    // LAME asks for a link to its home page.
    expect(embedded.find((e) => e.id === "lame")?.homepage).toBe("https://lame.sourceforge.io");
  });

  it("give every GPL/AGPL component its license text, exact source and build", () => {
    const gpl = embedded.filter((e) => e.gpl);
    for (const e of gpl) {
      expect(e.license, e.id).toMatch(/(^|\s)A?GPL-/);
      expect(existsSync(new URL(`../public/licenses/${e.licenseText}.txt`, import.meta.url)), e.id).toBe(true);
      expect(e.source, e.id).toMatch(/^https:\/\//);
      expect(e.build, e.id).toMatch(/^(https:\/\/|\/licenses\/)/);
    }
    // Every GPL/AGPL npm package we ship has such an entry.
    for (const c of credits.packages.filter((p) => /(^|\s)A?GPL-/.test(p.license))) {
      expect(gpl.some((e) => e.partOf === c.name || e.id === c.name), c.name).toBe(true);
    }
  });

  it("covers every package of docs/dependencies.md that bundles an LGPL engine", () => {
    const lgplRows = documented.filter((row) => /LGPL/.test(row.license) || /LGPL/.test(row.use));
    const lgplPackages = new Set(embedded.filter((e) => e.lgpl).map((e) => e.partOf));
    for (const row of lgplRows) {
      const names = row.names.map((n) => (n.endsWith("*") ? "@img/sharp-libvips-linux-x64" : n));
      expect(names.some((n) => lgplPackages.has(n)), names.join(", ")).toBe(true);
    }
  });
});
