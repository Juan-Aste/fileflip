import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { availableTools } from "@/config/tools";

// Every published tool needs a browser test: a `test.describe("tool: <id>")`
// block in tests/e2e that runs it on a fixture and checks the output file.
describe("browser test coverage", () => {
  const dir = join(__dirname, "e2e");
  const specs = readdirSync(dir)
    .filter((f) => f.endsWith(".spec.ts"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
  const covered = new Set([...specs.matchAll(/test\.describe\("tool: ([\w-]+)"/g)].map((m) => m[1]));

  it.each([...availableTools, "converter"])("%s has a browser test", (id) => {
    expect(covered.has(id)).toBe(true);
  });
});
