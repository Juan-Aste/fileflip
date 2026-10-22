// DXF fixtures written group by group (no DXF library, so the tests check the
// engine against independent files): `node scripts/fixtures/cad.mjs`.
// `plan.dxf` (millimeters) holds one of each entity we draw, with known
// positions and colors; the corrupt ones cover each error.
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "../../tests/fixtures");
const corrupt = join(dir, "corrupt");

/** [code, value] pairs → DXF text (code and value on their own lines). */
const groups = (pairs) => pairs.map(([c, v]) => `${String(c).padStart(3, " ")}\n${v}`).join("\n") + "\n";
const point = (x, y, base = 10) => [[base, x], [base + 10, y], [base + 20, 0]];
const section = (name, body) => [[0, "SECTION"], [2, name], ...body, [0, "ENDSEC"]];
const layer = (name, color, flags = 0) => [[0, "LAYER"], [2, name], [70, flags], [62, color], [6, "CONTINUOUS"]];

const header = section("HEADER", [[9, "$ACADVER"], [1, "AC1015"], [9, "$INSUNITS"], [70, 4]]);
const tables = section("TABLES", [
  [0, "TABLE"], [2, "LAYER"], [70, 4],
  ...layer("0", 7),
  ...layer("RED", 1),
  // A negative color means the layer is off; flag 1 means frozen.
  ...layer("HIDDEN", -3),
  ...layer("FROZEN", 5, 1),
  [0, "ENDTAB"],
]);

// A bolt symbol: a circle of radius 2 (by layer: black) and a line across it whose color comes from the INSERT (by block).
const blocks = section("BLOCKS", [
  [0, "BLOCK"], [8, "0"], [2, "BOLT"], [70, 0], ...point(0, 0), [3, "BOLT"],
  [0, "CIRCLE"], [8, "0"], ...point(0, 0), [40, 2],
  [0, "LINE"], [8, "0"], [62, 0], ...point(-3, 0), ...point(3, 0, 11),
  [0, "ENDBLK"], [8, "0"],
]);

const entities = (extra = []) =>
  section("ENTITIES", [
    // Black baseline 0..100 on layer 0 (color 7: black on paper).
    [0, "LINE"], [8, "0"], ...point(0, 0), ...point(100, 0, 11),
    // Red closed rectangle 0..100 × 0..50 (color by layer).
    [0, "LWPOLYLINE"], [8, "RED"], [90, 4], [70, 1], [10, 0], [20, 0], [10, 100], [20, 0], [10, 100], [20, 50], [10, 0], [20, 50],
    // Half circle from (10,10) to (30,10) through (20,0): bulge 1 = 180° counter-clockwise.
    [0, "LWPOLYLINE"], [8, "0"], [90, 2], [70, 0], [10, 10], [20, 10], [42, 1], [10, 30], [20, 10],
    // Blue circle (explicit color 5) at (50,25), radius 10.
    [0, "CIRCLE"], [8, "0"], [62, 5], ...point(50, 25), [40, 10],
    // Quarter arc at (80,25), radius 5, 0° → 90°.
    [0, "ARC"], [8, "0"], ...point(80, 25), [40, 5], [50, 0], [51, 90],
    // Ellipse at (20,40): major axis 8 on X, ratio 0.5 → x 12..28, y 36..44.
    [0, "ELLIPSE"], [8, "0"], ...point(20, 40), ...point(8, 0, 11), [40, 0.5], [41, 0], [42, 2 * Math.PI],
    // Cubic Bézier as a spline: from (60,40) to (80,40).
    [0, "SPLINE"], [8, "0"], [70, 8], [71, 3], [72, 8], [73, 4], [74, 0],
    ...[0, 0, 0, 0, 1, 1, 1, 1].map((k) => [40, k]),
    ...[[60, 40], [65, 48], [75, 32], [80, 40]].flatMap(([x, y]) => [[10, x], [20, y], [30, 0]]),
    [0, "TEXT"], [8, "0"], ...point(5, 55), [40, 3], [1, "Fileflect plan"],
    [0, "MTEXT"], [8, "0"], ...point(60, 60), [40, 2.5], [71, 1], [1, "L\\U+00EDnea 1\\P{\\fArial|b1;Línea 2} %%c10"],
    // The bolt, twice as big and turned 90°, at (120,10); green (3) line from the INSERT.
    [0, "INSERT"], [8, "0"], [62, 3], [2, "BOLT"], ...point(120, 10), [41, 2], [42, 2], [50, 90],
    // An array of 3 × 2 bolts from (140,0), 10 apart.
    [0, "INSERT"], [8, "0"], [62, 3], [2, "BOLT"], ...point(140, 0), [70, 3], [71, 2], [44, 10], [45, 10],
    // Filled square 0..10 × 60..70 (a SOLID lists its corners as a "Z").
    [0, "SOLID"], [8, "0"], ...point(0, 60), ...point(10, 60, 11), ...point(0, 70, 12), ...point(10, 70, 13),
    // Extrusion −Z: the circle stored at (10,90) is drawn at (−10,90).
    [0, "CIRCLE"], [8, "0"], ...point(10, 90), [40, 3], [210, 0], [220, 0], [230, -1],
    // Not drawn: lines on an off layer and a frozen one, far away.
    [0, "LINE"], [8, "HIDDEN"], ...point(0, -100), ...point(0, -200, 11),
    [0, "LINE"], [8, "FROZEN"], ...point(500, 500), ...point(600, 600, 11),
    // A hatch (not supported): counted and reported.
    [0, "HATCH"], [8, "0"], ...point(0, 0), [2, "SOLID"], [70, 1], [71, 0], [91, 0],
    ...extra,
  ]);

const dxf = (body) => groups([...body, [0, "EOF"]]);
const plan = dxf([...header, ...tables, ...blocks, ...entities()]);
writeFileSync(join(dir, "plan.dxf"), plan);

writeFileSync(join(corrupt, "truncated.dxf"), plan.slice(0, Math.floor(plan.length / 2)));
writeFileSync(join(corrupt, "binary.dxf"), Buffer.concat([Buffer.from("AutoCAD Binary DXF\r\n\x1a\0", "latin1"), Buffer.alloc(64, 0x41)]));
writeFileSync(join(corrupt, "not-a-dxf.dxf"), "This is plain text with a .dxf name, not a drawing.\n".repeat(10));
// Everything on the off layer: nothing to draw.
writeFileSync(join(corrupt, "hidden.dxf"), dxf([...tables, ...section("ENTITIES", [[0, "LINE"], [8, "HIDDEN"], ...point(0, 0), ...point(10, 10, 11)])]));
// A block that inserts itself.
writeFileSync(
  join(corrupt, "self-insert.dxf"),
  dxf([
    ...section("BLOCKS", [[0, "BLOCK"], [8, "0"], [2, "LOOP"], [70, 0], ...point(0, 0), [3, "LOOP"], [0, "LINE"], [8, "0"], ...point(0, 0), ...point(1, 1, 11), [0, "INSERT"], [8, "0"], [2, "LOOP"], ...point(1, 0), [0, "ENDBLK"], [8, "0"]]),
    ...section("ENTITIES", [[0, "INSERT"], [8, "0"], [2, "LOOP"], ...point(0, 0)]),
  ]),
);
