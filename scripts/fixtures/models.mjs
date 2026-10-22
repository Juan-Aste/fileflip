// 3D model fixtures, written byte by byte (no three.js, so the tests check the
// engine against independent files): `node scripts/fixtures/models.mjs`.
// A 10 mm cube (STL), a square pyramid with a quad base (OBJ), a tetrahedron with
// vertex colors (PLY, GLB, embedded glTF), plus damaged and unsupported files.
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "../../tests/fixtures");
const corrupt = join(dir, "corrupt");

// Cube 0..10 on every axis: 8 corners, 12 triangles (counter-clockwise seen from outside).
const C = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0], [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10]];
const cubeFaces = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
const normal = ([a, b, c]) => {
  const u = b.map((v, i) => v - a[i]);
  const w = c.map((v, i) => v - a[i]);
  const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  const len = Math.hypot(...n);
  return n.map((v) => v / len);
};

function binaryStl(faces, points) {
  const buf = Buffer.alloc(84 + faces.length * 50);
  buf.write("Fileflect test cube", 0, "ascii");
  buf.writeUInt32LE(faces.length, 80);
  faces.forEach((f, i) => {
    const tri = f.map((v) => points[v]);
    const o = 84 + i * 50;
    [...normal(tri), ...tri.flat()].forEach((v, j) => buf.writeFloatLE(v, o + j * 4));
  });
  return buf;
}
const cube = binaryStl(cubeFaces, C);
writeFileSync(join(dir, "cube.stl"), cube);
writeFileSync(
  join(dir, "cube-ascii.stl"),
  `solid cube\n${cubeFaces
    .map((f) => {
      const tri = f.map((v) => C[v]);
      return `  facet normal ${normal(tri).join(" ")}\n    outer loop\n${tri.map((p) => `      vertex ${p.join(" ")}\n`).join("")}    endloop\n  endfacet\n`;
    })
    .join("")}endsolid cube\n`,
);
// Header says 12 triangles, only 5 are there.
writeFileSync(join(corrupt, "cube-truncated.stl"), cube.subarray(0, 84 + 5 * 50 + 17));

// Square pyramid: base 0..20 × 0..20 at y = 0 (one quad), apex at (10, 15, 10): 6 triangles once split.
writeFileSync(
  join(dir, "pyramid.obj"),
  `# Fileflect test pyramid\no pyramid\nv 0 0 0\nv 20 0 0\nv 20 0 20\nv 0 0 20\nv 10 15 10\nf 1 2 3 4\nf 1 5 2\nf 2 5 3\nf 3 5 4\nf 4 5 1\n`,
);
writeFileSync(join(corrupt, "not-a-model.obj"), "This is not a 3D model, just text with an .obj name.\n".repeat(20));

// Tetrahedron with one color per corner (red, green, blue, white).
const T = [[0, 0, 0], [30, 0, 0], [0, 30, 0], [0, 0, 30]];
const tetraFaces = [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]];
const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255]];
writeFileSync(
  join(dir, "tetra.ply"),
  `ply\nformat ascii 1.0\ncomment Fileflect test tetrahedron\nelement vertex 4\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nelement face 4\nproperty list uchar int vertex_indices\nend_header\n${T.map((p, i) => `${p.join(" ")} ${colors[i].join(" ")}\n`).join("")}${tetraFaces.map((f) => `3 ${f.join(" ")}\n`).join("")}`,
);
writeFileSync(join(corrupt, "points.ply"), `ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nend_header\n0 0 0\n1 0 0\n0 1 0\n`);

// The tetrahedron as glTF 2.0: positions, colors (float RGB) and indices in one buffer.
const positions = Buffer.alloc(4 * 12);
T.flat().forEach((v, i) => positions.writeFloatLE(v, i * 4));
const colorBytes = Buffer.alloc(4 * 12);
colors.flat().forEach((v, i) => colorBytes.writeFloatLE(v / 255, i * 4));
const indices = Buffer.alloc(2 * 12);
tetraFaces.flat().forEach((v, i) => indices.writeUInt16LE(v, i * 2));
const bin = Buffer.concat([positions, colorBytes, indices]);
const gltf = (buffer) => ({
  asset: { version: "2.0", generator: "Fileflect test fixtures" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: "tetra" }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, COLOR_0: 1 }, indices: 2, material: 0 }] }],
  materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] } }],
  buffers: [buffer],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: 48, target: 34962 },
    { buffer: 0, byteOffset: 48, byteLength: 48, target: 34962 },
    { buffer: 0, byteOffset: 96, byteLength: 24, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 4, type: "VEC3", min: [0, 0, 0], max: [30, 30, 30] },
    { bufferView: 1, componentType: 5126, count: 4, type: "VEC3" },
    { bufferView: 2, componentType: 5123, count: 12, type: "SCALAR" },
  ],
});
const pad = (b, fill) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, fill)]);
function glb(json, binary) {
  const j = pad(Buffer.from(JSON.stringify(json)), 0x20);
  const b = pad(binary, 0);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + j.length + 8 + b.length, 8);
  const chunk = (data, type) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(data.length, 0);
    h.writeUInt32LE(type, 4);
    return Buffer.concat([h, data]);
  };
  return Buffer.concat([header, chunk(j, 0x4e4f534a), chunk(b, 0x004e4942)]);
}
writeFileSync(join(dir, "tetra.glb"), glb(gltf({ byteLength: bin.length }), bin));
writeFileSync(join(dir, "tetra.gltf"), JSON.stringify(gltf({ byteLength: bin.length, uri: `data:application/octet-stream;base64,${bin.toString("base64")}` }), null, 1));
writeFileSync(join(corrupt, "external.gltf"), JSON.stringify(gltf({ byteLength: bin.length, uri: "tetra.bin" })));
writeFileSync(join(corrupt, "draco.gltf"), JSON.stringify({ ...gltf({ byteLength: bin.length, uri: `data:application/octet-stream;base64,${bin.toString("base64")}` }), extensionsUsed: ["KHR_draco_mesh_compression"], extensionsRequired: ["KHR_draco_mesh_compression"] }));
const badGlb = glb(gltf({ byteLength: bin.length }), bin);
badGlb.write("XXXX", 0, "ascii");
writeFileSync(join(corrupt, "bad-magic.glb"), badGlb);

// "Image to lithophane": 120 × 60 px, three vertical bands: black, mid grey (128) and white.
const sharp = (await import("sharp")).default;
const bands = Buffer.alloc(120 * 60 * 3);
for (let y = 0; y < 60; y++) for (let x = 0; x < 120; x++) bands.fill(x < 40 ? 0 : x < 80 ? 128 : 255, (y * 120 + x) * 3, (y * 120 + x) * 3 + 3);
await sharp(bands, { raw: { width: 120, height: 60, channels: 3 } }).png().toFile(join(dir, "lithophane-bands.png"));

// --- Read-only inputs: 3MF, COLLADA and FBX (3C.40b) ---
const { zipSync, strToU8 } = await import("fflate");

// 3MF: the cube as object 1, object 2 made of two copies of it (components, the second moved 20 mm on X),
// placed by the build item: 24 triangles, box 0..30 × 0..10 × 0..10.
const model3mf = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
 <metadata name="Title">Fileflect test cubes</metadata>
 <resources>
  <object id="1" type="model">
   <mesh>
    <vertices>
${C.map(([x, y, z]) => `     <vertex x="${x}" y="${y}" z="${z}" />`).join("\n")}
    </vertices>
    <triangles>
${cubeFaces.map(([a, b, c]) => `     <triangle v1="${a}" v2="${b}" v3="${c}" />`).join("\n")}
    </triangles>
   </mesh>
  </object>
  <object id="2" type="model">
   <components>
    <component objectid="1" />
    <component objectid="1" transform="1 0 0 0 1 0 0 0 1 20 0 0" />
   </components>
  </object>
 </resources>
 <build>
  <item objectid="2" />
 </build>
</model>
`;
const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" /><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" /></Types>
`;
const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" /></Relationships>
`;
const package3mf = (model) => Buffer.from(zipSync({ "[Content_Types].xml": strToU8(contentTypes), "_rels/.rels": strToU8(rels), "3D/3dmodel.model": strToU8(model) }, { level: 6 }));
const cubes3mf = package3mf(model3mf);
writeFileSync(join(dir, "cubes.3mf"), cubes3mf);
writeFileSync(join(corrupt, "truncated.3mf"), cubes3mf.subarray(0, Math.floor(cubes3mf.length * 0.6)));
writeFileSync(join(corrupt, "entity.3mf"), package3mf(model3mf.replace("<model ", `<!DOCTYPE model [<!ENTITY x "${"x".repeat(10)}">]>\n<model `)));
writeFileSync(join(corrupt, "no-model.3mf"), Buffer.from(zipSync({ "[Content_Types].xml": strToU8(contentTypes), "readme.txt": strToU8("No 3D model part here.\n") })));

// COLLADA: the tetrahedron with its corner colors, its node moved 5 units up (Y up): box 0..30 × 5..35 × 0..30.
const dae = `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset><contributor><authoring_tool>Fileflect test fixtures</authoring_tool></contributor><unit name="meter" meter="1"/><up_axis>Y_UP</up_axis></asset>
  <library_geometries>
    <geometry id="tetra-mesh" name="tetra">
      <mesh>
        <source id="tetra-positions">
          <float_array id="tetra-positions-array" count="12">${T.flat().join(" ")}</float_array>
          <technique_common><accessor source="#tetra-positions-array" count="4" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common>
        </source>
        <source id="tetra-colors">
          <float_array id="tetra-colors-array" count="12">${colors.flat().map((v) => v / 255).join(" ")}</float_array>
          <technique_common><accessor source="#tetra-colors-array" count="4" stride="3"><param name="R" type="float"/><param name="G" type="float"/><param name="B" type="float"/></accessor></technique_common>
        </source>
        <vertices id="tetra-vertices"><input semantic="POSITION" source="#tetra-positions"/></vertices>
        <triangles count="4">
          <input semantic="VERTEX" source="#tetra-vertices" offset="0"/>
          <input semantic="COLOR" source="#tetra-colors" offset="1"/>
          <p>${tetraFaces.flat().map((v) => `${v} ${v}`).join(" ")}</p>
        </triangles>
      </mesh>
    </geometry>
  </library_geometries>
  <library_visual_scenes>
    <visual_scene id="scene" name="scene">
      <node id="tetra-node" name="tetra"><translate>0 5 0</translate><instance_geometry url="#tetra-mesh"/></node>
    </visual_scene>
  </library_visual_scenes>
  <scene><instance_visual_scene url="#scene"/></scene>
</COLLADA>
`;
writeFileSync(join(dir, "tetra.dae"), dae);
writeFileSync(join(corrupt, "entity.dae"), dae.replace("<COLLADA ", `<!DOCTYPE COLLADA [<!ENTITY x SYSTEM "file:///etc/passwd">]>\n<COLLADA `));
writeFileSync(join(corrupt, "not-collada.dae"), "<html><body>Not a COLLADA file.</body></html>\n");

// FBX 7.4 ASCII: the pyramid (a quad base and four triangles; the last index of each polygon is stored as -(i + 1)).
const pyramid = [[0, 0, 0], [20, 0, 0], [20, 0, 20], [0, 0, 20], [10, 15, 10]];
const polys = [[0, 1, 2, 3], [0, 4, 1], [1, 4, 2], [2, 4, 3], [3, 4, 0]];
const fbx = `; FBX 7.4.0 project file
; Fileflect test pyramid
FBXHeaderExtension:  {
	FBXHeaderVersion: 1003
	FBXVersion: 7400
}
GlobalSettings:  {
	Version: 1000
	Properties70:  {
		P: "UpAxis", "int", "Integer", "",1
		P: "UpAxisSign", "int", "Integer", "",1
		P: "UnitScaleFactor", "double", "Number", "",1
	}
}
Objects:  {
	Geometry: 1000, "Geometry::pyramid", "Mesh" {
		Vertices: *${pyramid.length * 3} {
			a: ${pyramid.flat().join(",")}
		}
		PolygonVertexIndex: *${polys.flat().length} {
			a: ${polys.map((p) => p.map((v, i) => (i === p.length - 1 ? -(v + 1) : v)).join(",")).join(",")}
		}
		GeometryVersion: 124
	}
	Model: 2000, "Model::pyramid", "Mesh" {
		Version: 232
		Properties70:  {
		}
	}
}
Connections:  {
	C: "OO",2000,0
	C: "OO",1000,2000
}
`;
writeFileSync(join(dir, "pyramid.fbx"), fbx);
writeFileSync(join(corrupt, "old-version.fbx"), fbx.replace("FBXVersion: 7400", "FBXVersion: 6100").replace("FBX 7.4.0", "FBX 6.1.0"));
writeFileSync(join(corrupt, "truncated.fbx"), Buffer.concat([Buffer.from("Kaydara FBX Binary  \0\x1a\0", "latin1"), Buffer.from([0xe8, 0x1c, 0, 0]), Buffer.alloc(40, 7)]));
