import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { diffLines, diffStats, diffWords, unifiedPatch, wordStats } from "./diff";

const es = { mode: "line", locale: "es" } as const;
const text = (parts: { value: string; added?: boolean; removed?: boolean }[]) =>
  parts.map((p) => (p.removed ? `[-${p.value}-]` : p.added ? `{+${p.value}+}` : p.value)).join("");

describe("text comparison", () => {
  it("pairs changed lines and marks the changed words", () => {
    const a = "Uno\nDos tres cuatro\nCinco\nSeis\n";
    const b = "Uno\nDos TRES cuatro\nCinco\nSiete\nOcho";
    const lines = diffLines(a, b, es);
    expect(lines.map((l) => [l.kind, l.left, l.right, text(l.parts)])).toEqual([
      ["same", 1, 1, "Uno"],
      ["removed", 2, undefined, "Dos [-tres-] cuatro"],
      ["added", undefined, 2, "Dos {+TRES+} cuatro"],
      ["same", 3, 3, "Cinco"],
      ["removed", 4, undefined, "[-Seis-]"],
      ["added", undefined, 4, "{+Siete+}"],
      ["added", undefined, 5, "Ocho"],
    ]);
    expect(diffStats(lines)).toEqual({ added: 2, removed: 1, changed: 1, identical: false });
  });

  it("can ignore case and spacing", () => {
    const a = "Hola  mundo\nADIÓS ";
    const b = "hola mundo\nadiós";
    expect(diffStats(diffLines(a, b, es)).identical).toBe(false);
    expect(diffStats(diffLines(a, b, { ...es, ignoreCase: true, ignoreWhitespace: true })).identical).toBe(true);
    expect(diffStats(diffLines("a\r\nb\n", "a\nb", es)).identical).toBe(true);
  });

  it("compares words, also in Chinese without spaces", () => {
    const parts = diffWords("El gato negro duerme.", "El perro negro duerme mucho.", { mode: "word", locale: "es" });
    expect(text(parts)).toBe("El [-gato-]{+perro+} negro duerme {+mucho+}.");
    expect(wordStats(parts, "es")).toEqual({ added: 2, removed: 1 });
    // Moving a line break is not a change when comparing words.
    expect(diffWords("uno dos\ntres", "uno\ndos tres", { mode: "word", locale: "es" }).some((p) => p.added || p.removed)).toBe(false);
    const zh = diffWords("我们今天去北京。", "我们明天去上海。", { mode: "word", locale: "zh" });
    // ICU's dictionary decides where Chinese words break; the unchanged 天 may be shared.
    expect(text(zh)).toMatch(/^我们\[-今(天)?-\]\{\+明(天)?\+\}(天)?去\[-北京-\]\{\+上海\+\}。$/);
  });

  it("writes a unified diff that patch(1) applies", () => {
    const a = "uno\ndos\ntres\ncuatro\ncinco\nseis\nsiete\nocho\n";
    const b = "uno\nDOS\ntres\ncuatro\ncinco\nseis\nsiete\nocho\nnueve\n";
    const dir = mkdtempSync(join(tmpdir(), "diff-"));
    writeFileSync(join(dir, "a.txt"), a);
    writeFileSync(join(dir, "changes.diff"), unifiedPatch(a, b, ["a.txt", "b.txt"]));
    execFileSync("patch", ["-s", join(dir, "a.txt"), join(dir, "changes.diff")]);
    expect(readFileSync(join(dir, "a.txt"), "utf8")).toBe(b);
  });
});
