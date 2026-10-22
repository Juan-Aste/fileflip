import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Box3, type Mesh } from "three";
import { strToU8, zipSync } from "fflate";
import { ConversionError } from "@/lib/convert-error";
import { convertModel, loadModel, modelStats } from "./convert";
import type { ModelInput } from "./options";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const bounds = async (name: string, format: ModelInput) => {
  const box = new Box3().setFromObject(await loadModel(fixture(name), format));
  return [...box.min.toArray(), ...box.max.toArray()];
};
const code = (promise: Promise<unknown>) => promise.then(() => "ok", (e: unknown) => (e instanceof ConversionError ? e.code : String(e)));

describe("loadModel", () => {
  // An embedded .gltf loads its data: URIs through three's FileLoader, which needs browser APIs: tested in the browser.
  it("reads binary and ASCII STL, OBJ (quads split), PLY and GLB with colors", async () => {
    for (const name of ["cube.stl", "cube-ascii.stl"]) {
      expect(modelStats(await loadModel(fixture(name), "stl")), name).toMatchObject({ meshes: 1, triangles: 12 });
      expect(await bounds(name, "stl")).toEqual([0, 0, 0, 10, 10, 10]);
    }
    expect(modelStats(await loadModel(fixture("pyramid.obj"), "obj"))).toMatchObject({ triangles: 6 });
    expect(await bounds("pyramid.obj", "obj")).toEqual([0, 0, 0, 20, 15, 20]);
    for (const [name, format] of [["tetra.ply", "ply"], ["tetra.glb", "glb"]] as const) {
      const root = await loadModel(fixture(name), format);
      expect(modelStats(root), name).toEqual({ meshes: 1, triangles: 4, vertices: 4 });
      expect(await bounds(name, format)).toEqual([0, 0, 0, 30, 30, 30]);
      let colors = 0;
      root.traverse((o) => void ((o as Mesh).isMesh && (colors = (o as Mesh).geometry.getAttribute("color")?.count ?? 0)));
      expect(colors, `${name} keeps its vertex colors`).toBe(4);
    }
  });

  it("refuses damaged, empty, external and compressed files with a code", async () => {
    expect(await code(loadModel(fixture("corrupt/cube-truncated.stl"), "stl"))).toBe("fileDamaged");
    expect(await code(loadModel(fixture("corrupt/not-video.mp4"), "stl"))).toBe("fileDamaged");
    expect(await code(loadModel(fixture("corrupt/not-a-model.obj"), "obj"))).toBe("unsupportedFormat");
    expect(await code(loadModel(fixture("corrupt/points.ply"), "ply"))).toBe("modelEmpty");
    expect(await code(loadModel(fixture("corrupt/external.gltf"), "gltf"))).toBe("modelExternalFiles");
    expect(await code(loadModel(fixture("corrupt/draco.gltf"), "gltf"))).toBe("modelCompressed");
    expect(await code(loadModel(fixture("corrupt/bad-magic.glb"), "glb"))).toBe("fileDamaged");
    expect(await code(loadModel(fixture("tetra.ply"), "glb"))).toBe("fileDamaged");
  });
});

describe("loadModel: read-only 3MF, COLLADA and FBX", () => {
  const colorCount = (root: Awaited<ReturnType<typeof loadModel>>) => {
    let colors = 0;
    root.traverse((o) => void ((o as Mesh).isMesh && (colors += (o as Mesh).geometry.getAttribute("color")?.count ?? 0)));
    return colors;
  };

  it("reads a 3MF with components and transforms", async () => {
    expect(modelStats(await loadModel(fixture("cubes.3mf"), "3mf"))).toMatchObject({ triangles: 24 });
    expect(await bounds("cubes.3mf", "3mf")).toEqual([0, 0, 0, 30, 10, 10]);
  });

  it("reads a COLLADA file with vertex colors, in the file's own axes and units", async () => {
    const root = await loadModel(fixture("tetra.dae"), "dae");
    expect(modelStats(root)).toMatchObject({ triangles: 4 });
    expect(colorCount(root)).toBeGreaterThanOrEqual(4);
    expect(await bounds("tetra.dae", "dae")).toEqual([0, 5, 0, 30, 35, 30]);
    // three would turn a Z-up file in centimeters into Y-up meters: coordinates stay as stored.
    const zUp = new TextEncoder().encode(new TextDecoder().decode(fixture("tetra.dae")).replace("Y_UP", "Z_UP").replace('meter="1"', 'meter="0.01"'));
    const box = new Box3().setFromObject(await loadModel(zUp, "dae"));
    expect([...box.min.toArray(), ...box.max.toArray()].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 5, 0, 30, 35, 30]);
  });

  it("reads an ASCII FBX 7.4 (quads split)", async () => {
    expect(modelStats(await loadModel(fixture("pyramid.fbx"), "fbx"))).toMatchObject({ triangles: 6 });
    expect(await bounds("pyramid.fbx", "fbx")).toEqual([0, 0, 0, 20, 15, 20]);
  });

  it("refuses damaged, foreign, old and entity-declaring files with a code", async () => {
    expect(await code(loadModel(fixture("corrupt/truncated.3mf"), "3mf"))).toBe("fileDamaged");
    expect(await code(loadModel(fixture("corrupt/no-model.3mf"), "3mf"))).toBe("unsupportedFormat");
    expect(await code(loadModel(fixture("corrupt/entity.3mf"), "3mf"))).toBe("xmlEntitiesBlocked");
    expect(await code(loadModel(fixture("cube.stl"), "3mf"))).toBe("unsupportedFormat");
    expect(await code(loadModel(fixture("corrupt/entity.dae"), "dae"))).toBe("xmlEntitiesBlocked");
    expect(await code(loadModel(fixture("corrupt/not-collada.dae"), "dae"))).toBe("unsupportedFormat");
    expect(await code(loadModel(fixture("corrupt/old-version.fbx"), "fbx"))).toBe("modelFbxVersion");
    expect(await code(loadModel(fixture("corrupt/truncated.fbx"), "fbx"))).toBe("fileDamaged");
    expect(await code(loadModel(fixture("pyramid.obj"), "fbx"))).toBe("unsupportedFormat");
  });

  it("stops a 3MF that inflates past the XML cap (zip bomb) before three unzips it", async () => {
    const model = new Uint8Array(101 * 1024 * 1024).fill(0x20);
    model.set(strToU8('<?xml version="1.0"?><model>'), 0);
    const bomb = zipSync({ "_rels/.rels": strToU8("<Relationships/>"), "3D/3dmodel.model": model }, { level: 9 });
    expect(bomb.length).toBeLessThan(1024 * 1024);
    expect(await code(loadModel(bomb, "3mf"))).toBe("modelXmlTooLarge");
  });

  it("converts them to every output (3MF → STL, COLLADA → PLY with colors, FBX → OBJ)", async () => {
    const stl = await convertModel(fixture("cubes.3mf"), "3mf", "stl");
    expect(new DataView(stl.data.buffer, stl.data.byteOffset).getUint32(80, true)).toBe(24);
    const ply = new TextDecoder().decode((await convertModel(fixture("tetra.dae"), "dae", "ply")).data.subarray(0, 400));
    expect(ply).toMatch(/element face 4[\s\S]*end_header/);
    expect(ply).toMatch(/property float red/);
    const obj = new TextDecoder().decode((await convertModel(fixture("pyramid.fbx"), "fbx", "obj")).data);
    expect(obj.match(/^f /gm)).toHaveLength(6);
  });
});

describe("convertModel", () => {
  it("STL → OBJ → PLY → STL keeps the 12 triangles and the size", async () => {
    const obj = await convertModel(fixture("cube.stl"), "stl", "obj");
    const text = new TextDecoder().decode(obj.data);
    expect(text.match(/^v /gm)).toHaveLength(36);
    expect(text.match(/^f /gm)).toHaveLength(12);
    const ply = await convertModel(obj.data, "obj", "ply");
    expect(new TextDecoder().decode(ply.data.subarray(0, 300))).toMatch(/format binary_little_endian 1\.0[\s\S]*element face 12/);
    const stl = await convertModel(ply.data, "ply", "stl");
    expect(stl.data.length).toBe(84 + 12 * 50);
    expect(new DataView(stl.data.buffer, stl.data.byteOffset).getUint32(80, true)).toBe(12);
    expect(await bounds("cube.stl", "stl")).toEqual([0, 0, 0, 10, 10, 10]);
    const back = new Box3().setFromObject(await loadModel(stl.data, "stl"));
    expect([...back.min.toArray(), ...back.max.toArray()]).toEqual([0, 0, 0, 10, 10, 10]);
  });

  it("GLB colors survive into PLY (OBJ keeps only the geometry)", async () => {
    const obj = new TextDecoder().decode((await convertModel(fixture("tetra.ply"), "ply", "obj")).data);
    expect(obj).toMatch(/^v 30 0 0$/m);
    const ply = new TextDecoder().decode((await convertModel(fixture("tetra.glb"), "glb", "ply")).data.subarray(0, 400));
    expect(ply).toMatch(/property float red\nproperty float green\nproperty float blue/);
  });
});
