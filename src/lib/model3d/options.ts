// "Convert 3D model": formats and limits. No three.js import: the page and the
// tests read these without the engine.

export const modelInputs = ["stl", "obj", "ply", "glb", "gltf", "3mf", "dae", "fbx"] as const;
export type ModelInput = (typeof modelInputs)[number];
export const modelTargets = ["stl", "obj", "ply", "glb"] as const;
export type ModelTarget = (typeof modelTargets)[number];

/** Inputs that are read but never written: their exporters don't exist (3MF, FBX) or aren't worth shipping (COLLADA). */
export const readOnlyModelInputs = ["3mf", "dae", "fbx"] as const satisfies readonly ModelInput[];

/**
 * XML read into a DOM (COLLADA, and the model parts of a 3MF once unzipped): a DOM
 * takes many times the text's size, so these stop well before the triangle cap.
 */
export const MAX_XML_MODEL_BYTES = 100 * 1024 * 1024;

/** Triangles kept in memory at once (a 2-million-triangle mesh is ~100 MB as binary STL). */
export const MAX_MODEL_TRIANGLES = 3_000_000;

export const modelExtension: Record<ModelTarget, string> = { stl: "stl", obj: "obj", ply: "ply", glb: "glb" };
export const modelMime: Record<ModelTarget, string> = { stl: "model/stl", obj: "model/obj", ply: "application/x-ply", glb: "model/gltf-binary" };

/** Input format from a file name ("Model.GLTF" → "gltf"); null when the extension isn't a model. */
export function modelFormat(name: string): ModelInput | null {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return (modelInputs as readonly string[]).includes(ext) ? (ext as ModelInput) : null;
}

/** glTF extensions that need extra decoders (Draco, meshopt, KTX2 textures) we don't ship. */
const compressedExtensions = ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_meshopt_compression", "KHR_texture_basisu"];

/**
 * Checks a glTF JSON before loading it: every buffer and image must be inside
 * the file (GLB chunk or data: URI), so nothing is fetched, and no required
 * extension may need a decoder we don't have. Returns the error code or null.
 */
export function gltfProblem(json: unknown): "modelExternalFiles" | "modelCompressed" | "fileDamaged" | null {
  if (typeof json !== "object" || json === null) return "fileDamaged";
  const gltf = json as { asset?: { version?: unknown }; buffers?: { uri?: unknown }[]; images?: { uri?: unknown }[]; extensionsRequired?: unknown[] };
  if (typeof gltf.asset?.version !== "string" || !gltf.asset.version.startsWith("2")) return "fileDamaged";
  const external = (items: { uri?: unknown }[] | undefined) =>
    (items ?? []).some((item) => item.uri !== undefined && !(typeof item.uri === "string" && item.uri.startsWith("data:")));
  if (external(gltf.buffers) || external(gltf.images)) return "modelExternalFiles";
  if ((gltf.extensionsRequired ?? []).some((e) => typeof e === "string" && compressedExtensions.includes(e))) return "modelCompressed";
  return null;
}

/** The JSON chunk of a GLB (header "glTF", version 2, first chunk "JSON"); null when it isn't one. */
export function glbJson(bytes: Uint8Array): unknown {
  if (bytes.length < 20) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) return null;
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || 20 + length > bytes.length) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
  } catch {
    return null;
  }
}
