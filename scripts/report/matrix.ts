// Compatibility matrix of the catalog, generated from the registry and the
// test files (never written by hand). Usage:
//   npx vite-node scripts/report/matrix.ts > docs/report-phase3-matrix.md
// A tool counts as tested in the browser when a spec in tests/e2e opens its
// Spanish page; converter pairs are listed from formats.ts with the audit
// script that checks them.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { conversions, formats, type FormatId } from "../../src/config/formats";
import { conversionPages } from "../../src/config/conversion-pages";
import { availableTools, toolCategories, tools } from "../../src/config/tools";

const root = join(__dirname, "..", "..");
const e2eDir = join(root, "tests", "e2e");
const specs = readdirSync(e2eDir)
  .filter((f) => f.endsWith(".spec.ts") && f !== "a11y.spec.ts")
  .map((f) => ({ name: f, text: readFileSync(join(e2eDir, f), "utf8") }));

/** Specs that open the tool's page (by its Spanish or English slug). */
function specsFor(id: (typeof availableTools)[number]): string[] {
  const { es, en } = tools[id].slugs;
  const re = new RegExp(`["'\`/](es/${es}|en/${en})["'\`?#]`);
  return specs.filter((s) => re.test(s.text)).map((s) => s.name.replace(".spec.ts", ""));
}

const label = (f: FormatId) => formats[f].label;
const list = (fs: readonly FormatId[]) => fs.map(label).join(", ");

const verified = availableTools.map((id) => tools[id]);
const inputs = new Set(verified.flatMap((t) => t.inputs).concat(conversions.map((c) => c.from)));
const outputs = new Set(verified.flatMap((t) => t.outputs).concat(conversions.map((c) => c.to)));
const pairs = new Set<string>();
for (const t of verified) for (const i of t.inputs) for (const o of t.outputs) pairs.add(`${i}>${o}`);
for (const c of conversions) pairs.add(`${c.from}>${c.to}`);

const out: string[] = [];
out.push("# Matriz de compatibilidad (generada)");
out.push("");
out.push("Generada con `npx vite-node scripts/report/matrix.ts` desde el registro (`src/config/tools.ts`, `src/config/formats.ts`) y las pruebas de navegador (`tests/e2e`). No editar a mano.");
out.push("");
out.push("## Totales");
out.push("");
out.push(`- Herramientas publicadas (estado \`verified\`): **${verified.length}** + el conversor de formatos.`);
out.push(`- Páginas de conversión entre formatos: **${conversionPages.length}**.`);
out.push(`- Formatos de entrada distintos: **${inputs.size}**; de salida: **${outputs.size}**.`);
out.push(`- Pares entrada → salida declarados (herramientas + conversor): **${pairs.size}**.`);
const untested = verified.filter((t) => specsFor(t.id).length === 0);
out.push(`- Herramientas con prueba de navegador que abre su página y valida la salida: **${verified.length - untested.length}/${verified.length}**${untested.length ? ` (sin prueba: ${untested.map((t) => t.id).join(", ")})` : ""}.`);
out.push(`- Dónde corren: ${verified.filter((t) => t.engine === "browser").length} en el navegador, ${verified.filter((t) => t.engine === "server").length} en el servidor (Gotenberg).`);
out.push("");
out.push("Formatos de entrada: " + [...inputs].map(label).sort().join(", ") + ".");
out.push("");
out.push("Formatos de salida: " + [...outputs].map(label).sort().join(", ") + ".");
out.push("");
out.push("## Herramientas por categoría");
for (const category of toolCategories) {
  const rows = verified.filter((t) => t.category === category);
  if (!rows.length) continue;
  out.push("");
  out.push(`### ${category} (${rows.length})`);
  out.push("");
  out.push("| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |");
  out.push("|---|---|---|---|---|---|");
  for (const t of rows) {
    const s = specsFor(t.id);
    out.push(`| \`${t.id}\` (/es/${t.slugs.es}) | ${list(t.inputs)} | ${list(t.outputs)} | ${t.engine === "browser" ? "navegador" : "servidor"} | ${t.libraries.join(", ")} | ${s.length ? s.join(", ") : "—"} |`);
  }
}
out.push("");
out.push("## Conversor de formatos (pares)");
out.push("");
out.push("Imágenes y PDF → imagen en el navegador (`converter.spec.ts` y `scripts/audit`), documentos de oficina → PDF y PDF → Word en el servidor (`src/lib/server/*.test.ts`, inventario 3A.2).");
out.push("");
const targets = [...new Set(conversions.map((c) => c.to))];
out.push(`| Desde \\ a | ${targets.map(label).join(" | ")} |`);
out.push(`|---|${targets.map(() => "---").join("|")}|`);
for (const from of [...new Set(conversions.map((c) => c.from))]) {
  const cells = targets.map((to) => {
    const c = conversions.find((x) => x.from === from && x.to === to);
    return c ? (c.engine === "browser" ? "N" : "S") : "";
  });
  out.push(`| ${label(from)} | ${cells.join(" | ")} |`);
}
out.push("");
out.push("N = navegador, S = servidor.");
console.log(out.join("\n"));
