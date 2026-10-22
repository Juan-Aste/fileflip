import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import credits from "@/content/credits.json";
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
const documentedNames = new Set(documented.flatMap((row: { names: string[] }) => row.names));
const notices = read("public/third-party-notices.txt");

describe("license helpers", () => {
  it("chooses a non-GPL alternative and rejects GPL/AGPL", () => {
    expect(chooseLicense("(MIT OR GPL-3.0-or-later)")).toEqual({ license: "MIT", ok: true });
    expect(chooseLicense("(MPL-2.0 OR Apache-2.0)", "dompurify").license).toBe("Apache-2.0");
    expect(chooseLicense("LGPL-3.0-or-later").ok).toBe(true);
    expect(chooseLicense("GPL-2.0-or-later").ok).toBe(false);
    expect(chooseLicense("AGPL-3.0").ok).toBe(false);
    expect(chooseLicense("MIT AND GPL-3.0-only").ok).toBe(false);
    expect(chooseLicense("SSPL-1.0").ok).toBe(false);
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

  it("uses no GPL/AGPL package without the owner's approval", () => {
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
