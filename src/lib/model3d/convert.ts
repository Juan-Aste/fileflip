// 3D model conversion with three.js (MIT): its loaders read STL, OBJ, PLY and
// glTF/GLB into a scene, and its exporters write STL, OBJ, PLY and GLB.
// Runs in a worker (see workers/model.worker.ts).
import { BufferGeometry, Group, Mesh, MeshStandardMaterial, type Object3D } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { PLYExporter } from "three/examples/jsm/exporters/PLYExporter.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { ConversionError } from "@/lib/convert-error";
import { glbJson, gltfProblem, MAX_MODEL_TRIANGLES, type ModelInput, type ModelTarget } from "./options";

export interface ModelStats {
  meshes: number;
  triangles: number;
  vertices: number;
}

export interface ModelResult extends ModelStats {
  data: Uint8Array;
}

const triangles = (geometry: BufferGeometry) => Math.floor((geometry.index ? geometry.index.count : (geometry.getAttribute("position")?.count ?? 0)) / 3);

/** Meshes of a scene, after their world matrices are up to date. */
function meshes(root: Object3D): Mesh[] {
  root.updateMatrixWorld(true);
  const found: Mesh[] = [];
  root.traverse((o) => {
    if ((o as Mesh).isMesh && (o as Mesh).geometry.getAttribute("position")) found.push(o as Mesh);
  });
  return found;
}

const material = () => new MeshStandardMaterial({ color: 0xbbbbbb, vertexColors: false });

function fromGeometry(geometry: BufferGeometry): Group {
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  const mat = material();
  mat.vertexColors = !!geometry.getAttribute("color");
  const group = new Group();
  group.add(new Mesh(geometry, mat));
  return group;
}

/** Reads a model into a three.js scene; damaged files and files that would need other files fail with a code. */
export async function loadModel(bytes: Uint8Array, format: ModelInput): Promise<Object3D> {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  let root: Object3D;
  try {
    switch (format) {
      case "stl": {
        // three's loader takes anything whose size doesn't match a binary STL as text: a cut binary
        // file (or another file named .stl) would come out empty instead of failing.
        const binarySize = bytes.length >= 84 ? 84 + new DataView(buffer).getUint32(80, true) * 50 : -1;
        if (binarySize !== bytes.length && !/^\s*solid/.test(new TextDecoder().decode(bytes.subarray(0, 512)))) {
          throw new ConversionError(binarySize > bytes.length ? "fileDamaged" : "unsupportedFormat");
        }
        const geometry = new STLLoader().parse(buffer);
        root = fromGeometry(geometry);
        break;
      }
      case "ply": {
        const geometry = new PLYLoader().parse(buffer);
        // Without faces a PLY is a point cloud: none of the outputs but PLY could hold it.
        if (!geometry.index) throw new ConversionError("modelEmpty");
        root = fromGeometry(geometry);
        break;
      }
      case "obj": {
        const text = new TextDecoder().decode(bytes);
        if (!/^\s*v\s/m.test(text)) throw new ConversionError("unsupportedFormat");
        root = new OBJLoader().parse(text);
        break;
      }
      case "glb":
      case "gltf": {
        const json = format === "glb" ? glbJson(bytes) : parseJson(bytes);
        const problem = gltfProblem(json);
        if (problem) throw new ConversionError(problem);
        root = (await new GLTFLoader().parseAsync(buffer, "")).scene;
        break;
      }
    }
  } catch (error) {
    throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
  }
  const found = meshes(root);
  const total = found.reduce((sum, m) => sum + triangles(m.geometry), 0);
  if (total === 0) throw new ConversionError("modelEmpty");
  if (total > MAX_MODEL_TRIANGLES) throw new ConversionError("modelTooLarge");
  for (const m of found) {
    const position = m.geometry.getAttribute("position");
    for (let i = 0; i < Math.min(position.count, 1000); i++) if (!Number.isFinite(position.getX(i))) throw new ConversionError("fileDamaged");
  }
  return root;
}

function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function modelStats(root: Object3D): ModelStats {
  const found = meshes(root);
  return {
    meshes: found.length,
    triangles: found.reduce((sum, m) => sum + triangles(m.geometry), 0),
    vertices: found.reduce((sum, m) => sum + m.geometry.getAttribute("position").count, 0),
  };
}

/** Writes a scene as `target`: binary STL, OBJ (text), binary little-endian PLY or GLB. */
export async function exportModel(root: Object3D, target: ModelTarget): Promise<Uint8Array> {
  switch (target) {
    case "stl": {
      const view = new STLExporter().parse(root, { binary: true }) as DataView;
      return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }
    case "obj":
      return new TextEncoder().encode(new OBJExporter().parse(root));
    case "ply": {
      // The result is also returned synchronously; the callback would need requestAnimationFrame.
      const out = new PLYExporter().parse(root, null as never, { binary: true, littleEndian: true }) as ArrayBuffer | string | null;
      if (!out) throw new ConversionError("conversionFailed");
      return typeof out === "string" ? new TextEncoder().encode(out) : new Uint8Array(out);
    }
    case "glb": {
      const out = await new GLTFExporter().parseAsync(root, { binary: true });
      return new Uint8Array(out as ArrayBuffer);
    }
  }
}

export async function convertModel(bytes: Uint8Array, from: ModelInput, to: ModelTarget, onProgress?: (progress: number) => void): Promise<ModelResult> {
  const root = await loadModel(bytes, from);
  onProgress?.(0.5);
  const stats = modelStats(root);
  let data: Uint8Array;
  try {
    data = await exportModel(root, to);
  } catch {
    throw new ConversionError("conversionFailed");
  }
  if (data.length === 0) throw new ConversionError("conversionFailed");
  onProgress?.(1);
  return { data, ...stats };
}
