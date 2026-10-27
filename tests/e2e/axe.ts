// axe-core (WCAG 2 A/AA) run on the loaded page, shared by the specs.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

interface Violation {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[] }[];
}

/** Runs axe on the loaded page; returns violations as readable lines. */
export async function axeViolations(page: Page): Promise<string[]> {
  // Let finite CSS transitions end first: a button fading in from its disabled
  // opacity reads as low contrast if axe catches it halfway (seen in WebKit).
  await page.evaluate(async () => {
    // Two frames so a re-render that just enabled a control has started its transition.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => Number.isFinite(Number(a.effect?.getComputedTiming().endTime)))
        .map((a) => a.finished.catch(() => undefined)),
    );
  });
  await page.evaluate(axeSource);
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: Violation[] }> } }).axe;
    // Ads are third-party markup we do not control.
    const result = await axe.run(
      { exclude: [["ins.adsbygoogle"], ["[data-ad-slot]"]] },
      { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, resultTypes: ["violations"] },
    );
    return result.violations;
  });
  return violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`,
  );
}
