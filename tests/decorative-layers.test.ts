// Phase 6A guard: a decorative layer (aria-hidden) positioned absolute or
// fixed must not take clicks. In production an invisible hero glow extended
// over the links below it and swallowed their clicks (fix ae9572c); this test
// fails if a new aria-hidden absolute/fixed element lacks pointer-events-none.
// Elements with their own pointer handlers (crop handles) are interactive on
// purpose and are skipped. The browser test tests/e2e/clickable.spec.ts
// checks the rendered pages.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

interface Layer {
  where: string;
  className: string;
}

/** aria-hidden JSX elements whose class list positions them absolute or fixed. */
function decorativeLayers(file: string, source: string): (Layer & { interactive: boolean })[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: (Layer & { interactive: boolean })[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
      const attr = (name: string) => attrs.find((a) => a.name.getText(sf) === name);
      const hidden = attr("aria-hidden");
      const hiddenValue = hidden?.initializer?.getText(sf);
      const isHidden = hidden && (hiddenValue === undefined || /^\{?\s*["']?true["']?\s*\}?$/.test(hiddenValue));
      const className = attr("className")?.initializer?.getText(sf) ?? "";
      if (isHidden && /(^|[\s"'`])(absolute|fixed)([\s"'`]|$)/.test(className)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        found.push({
          where: `${file}:${line + 1}`,
          className,
          interactive: attrs.some((a) => /^on[A-Z]/.test(a.name.getText(sf))),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

describe("decorative layers", () => {
  it("finds the hero glow pattern, with and without the fix", () => {
    const bad = `export const A = () => <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ width: \`\${1}%\` }} />;`;
    const good = `export const A = () => <div aria-hidden className={\`pointer-events-none absolute \${x}\`} />;`;
    expect(decorativeLayers("a.tsx", bad)).toMatchObject([{ className: '"absolute inset-0 -z-10"', interactive: false }]);
    expect(decorativeLayers("b.tsx", good)[0].className).toContain("pointer-events-none");
    expect(decorativeLayers("c.tsx", `const B = () => <span aria-hidden="false" className="absolute" />;`)).toEqual([]);
  });

  it("every aria-hidden absolute/fixed element in src ignores the pointer", () => {
    const files = readdirSync("src", { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => join("src", f));
    const offenders = files
      .flatMap((f) => decorativeLayers(f, readFileSync(f, "utf8")))
      .filter((l) => !l.interactive && !l.className.includes("pointer-events-none"))
      .map((l) => `${l.where} ${l.className}`);
    expect(offenders).toEqual([]);
  });
});
