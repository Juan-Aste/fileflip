// 3D preview on the page with three.js and WebGL. Imported only once a model is
// chosen; the conversion itself runs in the worker.
import {
  Box3,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Spherical,
  Vector3,
  WebGLRenderer,
  type Mesh,
  type Object3D,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ConversionError } from "@/lib/convert-error";
import { loadModel, modelStats, type ModelStats } from "./convert";
import type { ModelInput } from "./options";

export interface ModelViewer {
  stats: ModelStats;
  /** Width, height and depth of the bounding box, in the file's units. */
  size: [number, number, number];
  /** Turns the camera around the model (radians; positive = to the right) or up/down. */
  orbit(horizontal: number, vertical: number): void;
  /** Moves the camera closer (factor < 1) or farther (> 1). */
  zoom(factor: number): void;
  reset(): void;
  dispose(): void;
}

/** Shows a model in `canvas`; throws `browserUnsupported` without WebGL and the loader's codes for bad files. */
export async function createViewer(canvas: HTMLCanvasElement, bytes: Uint8Array, format: ModelInput): Promise<ModelViewer> {
  const root: Object3D = await loadModel(bytes, format);
  let renderer: WebGLRenderer;
  try {
    // preserveDrawingBuffer keeps the last frame readable (what the browser tests check).
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    throw new ConversionError("browserUnsupported");
  }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new Scene();
  scene.add(root);
  scene.add(new HemisphereLight(0xffffff, 0x445566, 1.6));
  const camera = new PerspectiveCamera(40, 1, 0.01, 1e7);
  const light = new DirectionalLight(0xffffff, 1.8);
  light.position.set(1, 2, 3);
  camera.add(light);
  scene.add(camera);
  // Faces of models from other programs may be wound either way: show both sides.
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.isMesh) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.side = DoubleSide;
  });

  const box = new Box3().setFromObject(root);
  const center = box.getCenter(new Vector3());
  const extent = box.getSize(new Vector3());
  const radius = Math.max(extent.length() / 2, 1e-6);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.minDistance = radius * 0.2;
  controls.maxDistance = radius * 20;

  const render = () => renderer.render(scene, camera);
  const reset = () => {
    const distance = radius / Math.sin((camera.fov * Math.PI) / 360);
    camera.position.copy(center).add(new Vector3(0.6, 0.45, 1).normalize().multiplyScalar(distance * 1.1));
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    controls.update();
    render();
  };
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };
  controls.addEventListener("change", render);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  reset();

  return {
    stats: modelStats(root),
    size: [extent.x, extent.y, extent.z],
    orbit(horizontal, vertical) {
      const offset = camera.position.clone().sub(controls.target);
      const s = new Spherical().setFromVector3(offset);
      s.theta -= horizontal;
      s.phi = Math.min(Math.PI - 0.01, Math.max(0.01, s.phi - vertical));
      camera.position.copy(controls.target).add(new Vector3().setFromSpherical(s));
      controls.update();
    },
    zoom(factor) {
      const offset = camera.position.clone().sub(controls.target);
      const length = Math.min(controls.maxDistance, Math.max(controls.minDistance, offset.length() * factor));
      camera.position.copy(controls.target).add(offset.setLength(length));
      controls.update();
    },
    reset,
    dispose() {
      observer.disconnect();
      controls.dispose();
      root.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.dispose();
      });
      renderer.dispose();
      // Browsers keep only a few WebGL contexts: free this one now (a new file gets a new canvas).
      renderer.forceContextLoss();
    },
  };
}
