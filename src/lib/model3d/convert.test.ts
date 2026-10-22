import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Box3, type Mesh } from "three";
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
