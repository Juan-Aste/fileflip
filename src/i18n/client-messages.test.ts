import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AbstractIntlMessages } from "next-intl";
import esJson from "../../messages/es.json";
import { clientMessages, TOOL_ONLY, toolMessages } from "./client-messages";

// Arrays of strings (legal sections) are fine for next-intl but not for its type.
const es = esJson as unknown as AbstractIntlMessages & typeof esJson;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

describe("client messages", () => {
  it("leave the tool and legal texts out of every page", () => {
    const m = clientMessages(es);
    expect(m.Tools).toBeUndefined();
    expect(m.Legal).toBeUndefined();
    expect(m.ImageTools).toBeUndefined();
    expect(m.Common).toEqual(es.Common);
    expect(JSON.stringify(m).length).toBeLessThan(JSON.stringify(es).length / 2);
  });

  it("give a tool page its own texts and the tool namespaces", () => {
    const m = toolMessages(es, "merge-pdf");
    expect(m.Tools).toEqual({ "merge-pdf": es.Tools["merge-pdf"] });
    expect(m.PdfTools).toEqual(es.PdfTools);
  });

  it("every tool-only namespace exists and only tool components (src/components/tools) read it", () => {
    for (const ns of TOOL_ONLY) expect(es, ns).toHaveProperty(ns);
    const offenders = sources("src")
      .filter((f) => !f.startsWith(join("src", "components", "tools")))
      .flatMap((f) => {
        const code = readFileSync(f, "utf8");
        // Server components get every message; only client-side hooks matter.
        return TOOL_ONLY.filter((ns) => new RegExp(`useTranslations\\(["'\`]${ns}[".'\`]`).test(code)).map((ns) => `${f}: ${ns}`);
      });
    expect(offenders).toEqual([]);
  });

  it("client code outside the tools reads no Tools or Legal text", () => {
    const offenders = sources("src")
      .filter((f) => !f.startsWith(join("src", "components", "tools")))
      .filter((f) => /useTranslations\(["'`](Tools|Legal)[".'`]/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
