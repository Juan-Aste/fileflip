// "Convert 3D model": every output is read back with the small parsers below,
// written from the format specs (not with three.js, which made the file).
import { readFileSync } from "node:fs";
import { expect, fileOf, openWithFiles, runTool, test, unzipEntries } from "./support";

interface Mesh {
  triangles: number;
  vertices: number;
  /** [minX, minY, minZ, maxX, maxY, maxZ], rounded to 3 decimals. */
  box: number[];
  /** RGB (0–1) of each vertex, when the file has colors. */
  colors?: number[][];
}

const round = (v: number) => Math.round(v * 1000) / 1000;
function box(points: number[][]): number[] {
  const min = [0, 1, 2].map((a) => Math.min(...points.map((p) => p[a]!)));
  const max = [0, 1, 2].map((a) => Math.max(...points.map((p) => p[a]!)));
  return [...min, ...max].map(round);
}

/** Binary STL: 80-byte header, triangle count, 50 bytes per triangle. */
function readStl(buf: Buffer): Mesh {
  const count = buf.readUInt32LE(80);
  expect(buf.length, "binary STL size").toBe(84 + count * 50);
  const points: number[][] = [];
  for (let i = 0; i < count; i++) for (let v = 0; v < 3; v++) points.push([0, 1, 2].map((a) => buf.readFloatLE(84 + i * 50 + 12 + v * 12 + a * 4)));
  return { triangles: count, vertices: points.length, box: box(points) };
}

function readObj(buf: Buffer): Mesh {
  const lines = buf.toString("utf8").split("\n");
  const points = lines.filter((l) => l.startsWith("v ")).map((l) => l.split(/\s+/).slice(1, 4).map(Number));
  const triangles = lines.filter((l) => l.startsWith("f ")).reduce((sum, l) => sum + l.trim().split(/\s+/).length - 3, 0);
  return { triangles, vertices: points.length, box: box(points) };
}

/** PLY, binary little-endian with float/uchar vertex properties and a uchar+int face list (what the converter writes). */
function readPly(buf: Buffer): Mesh {
  const end = buf.indexOf("end_header\n") + "end_header\n".length;
  const header = buf.subarray(0, end).toString("ascii").split("\n");
  expect(header[1]).toBe("format binary_little_endian 1.0");
  const vertices = Number(header.find((l) => l.startsWith("element vertex"))!.split(" ")[2]);
  const faces = Number(header.find((l) => l.startsWith("element face"))!.split(" ")[2]);
  const props = header.filter((l, i) => l.startsWith("property ") && i < header.findIndex((h) => h.startsWith("element face"))).map((l) => l.split(" "));
  const size = (type: string) => ({ float: 4, uchar: 1, int: 4 })[type]!;
  const stride = props.reduce((sum, p) => sum + size(p[1]!), 0);
  const points: number[][] = [];
  const colors: number[][] = [];
  for (let i = 0; i < vertices; i++) {
    let o = end + i * stride;
    const values: Record<string, number> = {};
    for (const [, type, name] of props) {
      values[name!] = type === "float" ? buf.readFloatLE(o) : buf.readUInt8(o) / 255;
      o += size(type!);
    }
    points.push([values.x!, values.y!, values.z!]);
    if ("red" in values) colors.push([values.red!, values.green!, values.blue!].map(round));
  }
  let o = end + vertices * stride;
  for (let i = 0; i < faces; i++) {
    const n = buf.readUInt8(o);
    expect(n, "triangle faces").toBe(3);
    for (let v = 0; v < n; v++) expect(buf.readInt32LE(o + 1 + v * 4)).toBeLessThan(vertices);
    o += 1 + n * 4;
  }
  expect(o, "PLY body size").toBe(buf.length);
  return { triangles: faces, vertices, box: box(points), ...(colors.length ? { colors } : {}) };
}

type Mat = number[]; // 4×4, column-major like glTF
const multiply = (a: Mat, b: Mat): Mat => Array.from({ length: 16 }, (_, i) => [0, 1, 2, 3].reduce((sum, k) => sum + a[k * 4 + (i % 4)]! * b[(i >> 2) * 4 + k]!, 0));
/** A node's local matrix: `matrix`, or translation × rotation (quaternion) × scale. */
function localMatrix(node: { matrix?: Mat; translation?: number[]; rotation?: number[]; scale?: number[] }): Mat {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y! * y! + z! * z!)) * sx!, 2 * (x! * y! + z! * w!) * sx!, 2 * (x! * z! - y! * w!) * sx!, 0,
    2 * (x! * y! - z! * w!) * sy!, (1 - 2 * (x! * x! + z! * z!)) * sy!, 2 * (y! * z! + x! * w!) * sy!, 0,
    2 * (x! * z! + y! * w!) * sz!, 2 * (y! * z! - x! * w!) * sz!, (1 - 2 * (x! * x! + y! * y!)) * sz!, 0,
    tx!, ty!, tz!, 1,
  ];
}
const apply = (m: Mat, [x, y, z]: number[]) => [0, 1, 2].map((r) => m[r]! * x! + m[4 + r]! * y! + m[8 + r]! * z! + m[12 + r]!);

/**
 * GLB: header, JSON chunk, BIN chunk. Walks the scene's nodes (a mesh used by two
 * nodes counts twice); the box comes from the accessors' bounds moved by each
 * node's world matrix, colors from COLOR_0.
 */
function readGlb(buf: Buffer): Mesh {
  expect(buf.readUInt32LE(0), "glTF magic").toBe(0x46546c67);
  expect(buf.readUInt32LE(4), "glTF version").toBe(2);
  expect(buf.readUInt32LE(8), "GLB length").toBe(buf.length);
  const jsonLength = buf.readUInt32LE(12);
  expect(buf.readUInt32LE(16)).toBe(0x4e4f534a);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLength).toString("utf8"));
  const binStart = 20 + jsonLength + 8;
  expect(buf.readUInt32LE(20 + jsonLength + 4)).toBe(0x004e4942);
  let triangles = 0;
  let vertices = 0;
  const corners: number[][] = [];
  let colors: number[][] | undefined;
  const visit = (index: number, parent: Mat) => {
    const node = json.nodes[index];
    const world = multiply(parent, localMatrix(node));
    if (node.mesh !== undefined) {
      for (const prim of json.meshes[node.mesh].primitives) {
        const pos = json.accessors[prim.attributes.POSITION];
        vertices += pos.count;
        for (let c = 0; c < 8; c++) corners.push(apply(world, [0, 1, 2].map((a) => ((c >> a) & 1 ? pos.max : pos.min)[a])));
        triangles += (prim.indices !== undefined ? json.accessors[prim.indices].count : pos.count) / 3;
        if (prim.attributes.COLOR_0 !== undefined) {
          const acc = json.accessors[prim.attributes.COLOR_0];
          const view = json.bufferViews[acc.bufferView];
          // Float, or normalized unsigned byte/short.
          const [bytes, read] = ({
            5126: [4, (o: number) => buf.readFloatLE(o)],
            5121: [1, (o: number) => buf.readUInt8(o) / 255],
            5123: [2, (o: number) => buf.readUInt16LE(o) / 65535],
          } as Record<number, [number, (o: number) => number]>)[acc.componentType]!;
          if (acc.componentType !== 5126) expect(acc.normalized, "normalized colors").toBe(true);
          const width = acc.type === "VEC4" ? 4 : 3;
          const start = binStart + (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
          const stride = view.byteStride ?? width * bytes;
          colors = Array.from({ length: acc.count }, (_, i) => [0, 1, 2].map((c) => round(read(start + i * stride + c * bytes))));
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const root of json.scenes[json.scene ?? 0].nodes) visit(root, identity);
  return { triangles, vertices, box: box(corners), ...(colors ? { colors } : {}) };
}

const CUBE = [0, 0, 0, 10, 10, 10];
const PYRAMID = [0, 0, 0, 20, 15, 20];
const TETRA = [0, 0, 0, 30, 30, 30];
const TETRA_COLORS = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]];

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "the 3D converter must not call the server").toEqual([]);
});

test.describe("tool: model-converter", () => {
  test("STL (binary and ASCII), OBJ, PLY, GLB and embedded glTF → GLB: shapes, sizes and colors intact", async ({ page }) => {
    await openWithFiles(page, "/en/3d-model-converter", ["cube.stl", "cube-ascii.stl", "pyramid.obj", "tetra.ply", "tetra.glb", "tetra.gltf"]);
    await page.getByText("GLB (binary glTF)", { exact: true }).click();
    await page.getByRole("button", { name: "Convert model", exact: true }).click();
    await expect(page.locator("main").getByText("12 triangles.")).toHaveCount(2, { timeout: 30_000 });
    await expect(page.locator("main").getByText("4 triangles.")).toHaveCount(3);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Download all/ }).click()]);
    const entries = unzipEntries(readFileSync((await download.path())!));
    expect(entries.map((e) => e.name).sort()).toEqual(["cube-ascii.glb", "cube.glb", "pyramid.glb", "tetra (1).glb", "tetra (2).glb", "tetra.glb"].sort());
    for (const entry of entries) {
      const mesh = readGlb(entry.data);
      if (entry.name.startsWith("cube")) expect(mesh, entry.name).toMatchObject({ triangles: 12, box: CUBE });
      else if (entry.name.startsWith("pyramid")) expect(mesh, entry.name).toMatchObject({ triangles: 6, box: PYRAMID });
      else expect(mesh, entry.name).toMatchObject({ triangles: 4, vertices: 4, box: TETRA, colors: TETRA_COLORS });
    }
  });

  test("GLB → PLY keeps the colors; OBJ → STL and STL → OBJ keep the geometry", async ({ page }) => {
    const cases = [
      { file: "tetra.glb", label: "PLY", out: "tetra.ply", read: readPly, expected: { triangles: 4, vertices: 4, box: TETRA, colors: TETRA_COLORS } },
      { file: "pyramid.obj", label: "STL", out: "pyramid.stl", read: readStl, expected: { triangles: 6, box: PYRAMID } },
      { file: "cube.stl", label: "OBJ", out: "cube.obj", read: readObj, expected: { triangles: 12, box: CUBE } },
      { file: "cube-ascii.stl", label: "STL", out: "cube-ascii.stl", read: readStl, expected: { triangles: 12, box: CUBE } },
    ];
    for (const [i, c] of cases.entries()) {
      if (i === 0) await openWithFiles(page, "/en/3d-model-converter", [c.file]);
      else {
        await page.getByRole("button", { name: "Start over" }).click();
        await page.locator('input[type="file"]').first().setInputFiles(`${__dirname}/../fixtures/${c.file}`);
      }
      await page.getByText(c.label, { exact: true }).click();
      const out = fileOf(await runTool(page, "Convert model"));
      expect(out.name).toBe(c.out);
      expect(c.read(out.buf), `${c.file} → ${c.label}`).toMatchObject(c.expected);
    }
  });

  test("damaged, external, compressed, point-cloud and fake files fail with clear messages while a good one converts", async ({ page }) => {
    await openWithFiles(page, "/es/convertir-modelo-3d", [
      "cube.stl",
      "corrupt/cube-truncated.stl",
      "corrupt/external.gltf",
      "corrupt/draco.gltf",
      "corrupt/points.ply",
      "corrupt/not-a-model.obj",
      "corrupt/bad-magic.glb",
    ]);
    await page.getByRole("button", { name: "Convertir modelo", exact: true }).click();
    const main = page.locator("main");
    await expect(main.getByText("12 triángulos.")).toBeVisible({ timeout: 30_000 });
    await expect(main.getByText("dañado o incompleto")).toHaveCount(2);
    await expect(main).toContainText("usa archivos aparte");
    await expect(main).toContainText("comprimido con Draco");
    await expect(main).toContainText("nube de puntos");
    await expect(main).toContainText("no se puede convertir");
  });
});

test.describe("tool: model-converter (read-only 3MF, COLLADA and FBX)", () => {
  test("3MF, COLLADA and FBX → STL, PLY and GLB: parts, positions and colors read in the worker", async ({ page }) => {
    await openWithFiles(page, "/en/3d-model-converter", ["cubes.3mf", "tetra.dae", "pyramid.fbx"]);
    await page.getByText("GLB (binary glTF)", { exact: true }).click();
    await page.getByRole("button", { name: "Convert model", exact: true }).click();
    await expect(page.locator("main").getByText("24 triangles.")).toBeVisible({ timeout: 30_000 });
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Download all/ }).click()]);
    const entries = unzipEntries(readFileSync((await download.path())!));
    expect(entries.map((e) => e.name).sort()).toEqual(["cubes.glb", "pyramid.glb", "tetra.glb"]);
    const glb = Object.fromEntries(entries.map((e) => [e.name, readGlb(e.data)]));
    // Two copies of the cube, the second moved 20 mm on X by its component transform.
    expect(glb["cubes.glb"]).toMatchObject({ triangles: 24, box: [0, 0, 0, 30, 10, 10] });
    // The COLLADA node is moved 5 up; its corner colors come through.
    expect(glb["tetra.glb"]).toMatchObject({ triangles: 4, box: [0, 5, 0, 30, 35, 30] });
    expect(new Set(glb["tetra.glb"]!.colors!.map((c) => c.join()))).toEqual(new Set(TETRA_COLORS.map((c) => c.join())));
    expect(glb["pyramid.glb"]).toMatchObject({ triangles: 6, box: PYRAMID });

    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(`${__dirname}/../fixtures/cubes.3mf`);
    await page.getByText("STL", { exact: true }).click();
    const stl = fileOf(await runTool(page, "Convert model"));
    expect(stl.name).toBe("cubes.stl");
    expect(readStl(stl.buf)).toMatchObject({ triangles: 24, box: [0, 0, 0, 30, 10, 10] });

    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(`${__dirname}/../fixtures/tetra.dae`);
    await page.getByText("PLY", { exact: true }).click();
    const ply = fileOf(await runTool(page, "Convert model"));
    const mesh = readPly(ply.buf);
    expect(mesh).toMatchObject({ triangles: 4, box: [0, 5, 0, 30, 35, 30] });
    expect(new Set(mesh.colors!.map((c) => c.join()))).toEqual(new Set(TETRA_COLORS.map((c) => c.join())));
  });

  test("the preview reads 3MF on the page too", async ({ page }) => {
    await openWithFiles(page, "/en/3d-model-converter", ["cubes.3mf"]);
    await expect(page.locator("main").getByText("cubes.3mf: 24 triangles · 30 × 10 × 10 (width × height × depth, in the file's units).")).toBeVisible({ timeout: 20_000 });
  });

  test("damaged, foreign, old and entity-declaring files fail with clear messages", async ({ page }) => {
    await openWithFiles(page, "/es/convertir-modelo-3d", [
      "pyramid.fbx",
      "corrupt/truncated.3mf",
      "corrupt/no-model.3mf",
      "corrupt/entity.3mf",
      "corrupt/entity.dae",
      "corrupt/not-collada.dae",
      "corrupt/old-version.fbx",
      "corrupt/truncated.fbx",
    ]);
    await page.getByRole("button", { name: "Convertir modelo", exact: true }).click();
    const main = page.locator("main");
    await expect(main.getByText("6 triángulos.")).toBeVisible({ timeout: 30_000 });
    await expect(main.getByText("dañado o incompleto")).toHaveCount(2);
    await expect(main.getByText("declara entidades")).toHaveCount(2);
    await expect(main.getByText("anterior a la 7.0")).toHaveCount(1);
    await expect(main.getByText("no se puede convertir")).toHaveCount(2);
  });
});

test.describe("tool: model-converter (3D preview)", () => {
  /** Opaque pixels of the preview canvas (its background is transparent) and a fingerprint of the picture. */
  const snapshot = (page: import("@playwright/test").Page) =>
    page.locator("main canvas").evaluate((canvas: HTMLCanvasElement) => {
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      const ctx = copy.getContext("2d")!;
      ctx.drawImage(canvas, 0, 0);
      const { data } = ctx.getImageData(0, 0, copy.width, copy.height);
      let opaque = 0;
      let hash = 0;
      for (let i = 3; i < data.length; i += 4 * 7) {
        if (data[i]! > 0) opaque++;
        hash = (hash * 31 + data[i - 1]! + data[i - 2]! + data[i]!) | 0;
      }
      const center = ((copy.height >> 1) * copy.width + (copy.width >> 1)) * 4;
      return { opaque: opaque / (data.length / 28), center: data[center + 3]!, corner: data[3]!, hash };
    });

  test("shows the model with its size, and the buttons and arrow keys move the camera", async ({ page }) => {
    await openWithFiles(page, "/en/3d-model-converter", ["pyramid.obj"]);
    const main = page.locator("main");
    await expect(main.getByText("pyramid.obj: 6 triangles · 20 × 15 × 20 (width × height × depth, in the file's units).")).toBeVisible({ timeout: 20_000 });
    const first = await snapshot(page);
    expect(first.center, "the model is drawn in the middle").toBeGreaterThan(0);
    expect(first.corner, "the background is transparent").toBe(0);
    expect(first.opaque, `the model covers ${first.opaque} of the view`).toBeGreaterThan(0.05);
    await page.getByRole("button", { name: "Rotate right" }).click();
    const turned = await snapshot(page);
    expect(turned.hash).not.toBe(first.hash);
    await page.getByRole("button", { name: "Back to the initial view" }).click();
    expect((await snapshot(page)).hash).toBe(first.hash);
    const canvas = page.getByRole("img", { name: /3D preview of pyramid\.obj/ });
    await canvas.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("+");
    const keyed = await snapshot(page);
    expect(keyed.hash).not.toBe(first.hash);
    expect(keyed.opaque, "zooming in makes the model bigger").toBeGreaterThan(first.opaque);
    await page.keyboard.press("0");
    expect((await snapshot(page)).hash).toBe(first.hash);
    // The conversion still works with the preview open.
    await page.getByText("STL", { exact: true }).click();
    const out = fileOf(await runTool(page, "Convert model"));
    expect(readStl(out.buf)).toMatchObject({ triangles: 6, box: PYRAMID });
  });

  test("a damaged first file shows the error in the preview", async ({ page }) => {
    await openWithFiles(page, "/es/convertir-modelo-3d", ["corrupt/external.gltf"]);
    await expect(page.locator("main")).toContainText("usa archivos aparte");
    await expect(page.locator("main canvas")).toHaveCount(0);
  });
});

test.describe("tool: image-to-lithophane", () => {
  /** Thickest point of the plate near `x` mm, in the middle rows (y 15–25 mm, away from a frame), read from the STL triangles. */
  function heightNear(buf: Buffer, x: number) {
    let best = 0;
    for (let i = 0; i < buf.readUInt32LE(80); i++) {
      for (let v = 0; v < 3; v++) {
        const o = 84 + i * 50 + 12 + v * 12;
        const y = buf.readFloatLE(o + 4);
        if (Math.abs(buf.readFloatLE(o) - x) < 0.5 && y > 15 && y < 25) best = Math.max(best, buf.readFloatLE(o + 8));
      }
    }
    return best;
  }

  test("black, grey and white bands → an 80 mm plate 3.2, 2.0 and 0.8 mm thick; a frame keeps the edges thick", async ({ page }) => {
    await openWithFiles(page, "/en/image-to-lithophane", ["lithophane-bands.png"]);
    await page.getByText("80 mm", { exact: true }).click();
    await page.getByText("Add a 2 mm frame", { exact: true }).click();
    let out = fileOf(await runTool(page, "Create lithophane"));
    expect(out.name).toBe("lithophane-bands-lithophane.stl");
    await expect(page.locator("main")).toContainText("80 × 40 mm plate, 0.8 to 3.2 mm thick, 41,800 triangles.");
    const plate = readStl(out.buf);
    expect(plate).toMatchObject({ triangles: 41_800 });
    expect(plate.box.slice(0, 5)).toEqual([0, 0, 0, 80, 40]);
    expect(plate.box[5]).toBeCloseTo(3.2, 2);
    expect(heightNear(out.buf, 10)).toBeCloseTo(3.2, 1);
    expect(heightNear(out.buf, 40)).toBeCloseTo(2.0, 1);
    expect(heightNear(out.buf, 70)).toBeCloseTo(0.8, 1);

    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(`${__dirname}/../fixtures/lithophane-bands.png`);
    await page.getByText("100 mm", { exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "Add a 2 mm frame" })).not.toBeChecked();
    await page.getByText("Add a 2 mm frame", { exact: true }).click();
    await page.getByText("Thick (1.2–4 mm)", { exact: true }).click();
    out = fileOf(await runTool(page, "Create lithophane"));
    expect(heightNear(out.buf, 70), "white band, thick preset").toBeCloseTo(1.2, 1);
    await expect(page.locator("main")).toContainText("100 × 50 mm plate, 1.2 to 4 mm thick");
    expect(heightNear(out.buf, 99.5), "the frame at the white edge").toBeCloseTo(4, 1);
    expect(heightNear(out.buf, 97), "white just inside the frame").toBeCloseTo(1.2, 1);
  });

  test("a damaged image shows a clear error", async ({ page }) => {
    await openWithFiles(page, "/es/imagen-a-litofania", ["corrupt/truncated.png"]);
    const result = await runTool(page, "Crear litofanía");
    expect(result.error).toContain("dañado o incompleto");
  });
});
