// Lighter copies of ONNX models without changing their math (task 11.3,
// docs/tts-modelo-liviano.md): the large float32 weights are stored smaller and
// turned back into float32 by a node in front of each one, which onnxruntime
// folds when it loads the model (inputs, outputs and every operation stay
// float32, so onnxruntime-web's WASM backend runs them as before).
//   fp16w  weight as float16 + Cast              (half the size)
//   int8w  weight as int8 + DequantizeLinear with one scale per output
//          channel (a quarter of the size)
// Plain Node, no dependencies: a minimal protobuf reader/writer for the few
// ONNX fields it touches; everything else is copied byte for byte, so the
// output (and its SHA-256) is the same on every machine.
//   node scripts/models/onnx-light.mjs <in.onnx> <out.onnx> fp16w|int8w
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MIN_ELEMENTS = 1024; // small tensors (biases, norms) stay float32
const FLOAT = 1, INT8 = 3, FLOAT16 = 10;

// --- protobuf wire format ---------------------------------------------------

function readVarint(buf, pos) {
  let value = 0n, shift = 0n, b;
  do {
    b = buf[pos++];
    value |= BigInt(b & 0x7f) << shift;
    shift += 7n;
  } while (b & 0x80);
  return [value, pos];
}

/** Top-level fields of a message: { field, wire, value (bigint or Buffer), raw (the whole field's bytes) }. */
function parse(buf) {
  const out = [];
  let pos = 0;
  while (pos < buf.length) {
    const start = pos;
    let key;
    [key, pos] = readVarint(buf, pos);
    const field = Number(key >> 3n), wire = Number(key & 7n);
    let value;
    if (wire === 0) [value, pos] = readVarint(buf, pos);
    else if (wire === 1) { value = buf.subarray(pos, pos + 8); pos += 8; }
    else if (wire === 5) { value = buf.subarray(pos, pos + 4); pos += 4; }
    else if (wire === 2) {
      let len;
      [len, pos] = readVarint(buf, pos);
      value = buf.subarray(pos, pos + Number(len));
      pos += Number(len);
    } else throw new Error(`unsupported wire type ${wire}`);
    out.push({ field, wire, value, raw: buf.subarray(start, pos) });
  }
  return out;
}

function varint(n) {
  let v = BigInt(n);
  if (v < 0n) v += 1n << 64n;
  const bytes = [];
  do {
    let b = Number(v & 0x7fn);
    v >>= 7n;
    if (v) b |= 0x80;
    bytes.push(b);
  } while (v);
  return Buffer.from(bytes);
}
const tag = (field, wire) => varint((field << 3) | wire);
const vField = (field, n) => Buffer.concat([tag(field, 0), varint(n)]);
const bField = (field, bytes) => Buffer.concat([tag(field, 2), varint(bytes.length), bytes]);
const sField = (field, s) => bField(field, Buffer.from(s, "utf8"));

// --- ONNX messages ------------------------------------------------------------

function tensorInfo(fields) {
  const t = { dims: [], dataType: 0, name: "", data: null, external: false };
  for (const f of fields) {
    if (f.field === 1) {
      if (f.wire === 0) t.dims.push(Number(f.value));
      else for (let p = 0; p < f.value.length; ) { let d; [d, p] = readVarint(f.value, p); t.dims.push(Number(d)); }
    } else if (f.field === 2) t.dataType = Number(f.value);
    else if (f.field === 8) t.name = f.value.toString("utf8");
    else if (f.field === 9 || f.field === 4) t.data = f.value; // raw_data, or packed float_data (same little-endian bytes)
    else if (f.field === 13 || f.field === 14) t.external = true;
  }
  return t;
}

function tensor(name, dims, dataType, raw) {
  return Buffer.concat([...dims.map((d) => vField(1, d)), vField(2, dataType), sField(8, name), bField(9, raw)]);
}

function node(op, inputs, outputs, name, attrs = []) {
  return Buffer.concat([...inputs.map((s) => sField(1, s)), ...outputs.map((s) => sField(2, s)), sField(3, name), sField(4, op), ...attrs.map((a) => bField(5, a))]);
}
const intAttr = (name, i) => Buffer.concat([sField(1, name), vField(3, i), vField(20, 2)]);

// --- number formats -------------------------------------------------------------

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);
/** float32 → float16 bits, round to nearest even. */
function toHalf(x) {
  f32[0] = x;
  const b = u32[0];
  const sign = (b >>> 16) & 0x8000;
  const exp = (b >>> 23) & 0xff;
  let mant = b & 0x7fffff;
  if (exp === 0xff) return sign | 0x7c00 | (mant ? 0x200 : 0);
  let e = exp - 127 + 15;
  if (e >= 0x1f) return sign | 0x7c00;
  if (e <= 0) {
    if (e < -10) return sign;
    mant |= 0x800000;
    const shift = 14 - e;
    let h = mant >>> shift;
    const rem = mant & ((1 << shift) - 1), half = 1 << (shift - 1);
    if (rem > half || (rem === half && h & 1)) h++;
    return sign | h;
  }
  let h = (e << 10) | (mant >>> 13);
  const rem = mant & 0x1fff;
  if (rem > 0x1000 || (rem === 0x1000 && h & 1)) h++;
  return sign | h;
}

const roundEven = (x) => {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
};

function floats(t) {
  const copy = Buffer.from(t.data); // aligned copy
  return new Float32Array(copy.buffer, copy.byteOffset, copy.length / 4);
}

function fp16w(t) {
  const x = floats(t);
  const out = Buffer.alloc(x.length * 2);
  for (let i = 0; i < x.length; i++) out.writeUInt16LE(toHalf(x[i]), i * 2);
  const stored = `${t.name}__fp16`;
  return { inits: [tensor(stored, t.dims, FLOAT16, out)], nodes: [node("Cast", [stored], [t.name], `${t.name}__cast`, [intAttr("to", FLOAT)])] };
}

function int8w(t) {
  if (t.dims.length < 2) return fp16w(t);
  const x = floats(t);
  // One scale per output channel: axis 0 for Conv weights [out, in, k],
  // the last axis for MatMul weights [in, out].
  const axis = t.dims.length > 2 ? 0 : t.dims.length - 1;
  const channels = t.dims[axis];
  const inner = t.dims.slice(axis + 1).reduce((a, b) => a * b, 1);
  const channelOf = (i) => Math.floor(i / inner) % channels;
  const scale = new Float32Array(channels);
  for (let i = 0; i < x.length; i++) {
    const c = channelOf(i), a = Math.abs(x[i]);
    if (a > scale[c]) scale[c] = a;
  }
  for (let c = 0; c < channels; c++) scale[c] = scale[c] ? Math.fround(scale[c] / 127) : 1;
  const q = Buffer.alloc(x.length);
  for (let i = 0; i < x.length; i++) q.writeInt8(Math.max(-127, Math.min(127, roundEven(Math.fround(x[i] / scale[channelOf(i)])))), i);
  const n = t.name;
  return {
    inits: [
      tensor(`${n}__q`, t.dims, INT8, q),
      tensor(`${n}__scale`, [channels], FLOAT, Buffer.from(scale.buffer)),
      tensor(`${n}__zero`, [channels], INT8, Buffer.alloc(channels)),
    ],
    nodes: [node("DequantizeLinear", [`${n}__q`, `${n}__scale`, `${n}__zero`], [n], `${n}__dq`, [intAttr("axis", axis)])],
  };
}

// --- model ------------------------------------------------------------------------

/** Returns the lighter copy of an ONNX model (a Buffer). */
export function lighten(model, variant) {
  const convert = { fp16w, int8w }[variant];
  if (!convert) throw new Error(`unknown variant ${variant}`);
  const top = parse(model);
  const parts = [];
  for (const f of top) {
    if (f.field === 7) parts.push(bField(7, lightenGraph(f.value, convert)));
    else if (f.field === 8 && variant === "int8w") parts.push(bField(8, opset(f.value, 13))); // per-axis DequantizeLinear
    else parts.push(f.raw);
  }
  return Buffer.concat(parts);
}

function opset(bytes, min) {
  const fields = parse(bytes);
  const domain = fields.find((f) => f.field === 1)?.value.toString("utf8") ?? "";
  const version = Number(fields.find((f) => f.field === 2)?.value ?? 0n);
  if ((domain !== "" && domain !== "ai.onnx") || version >= min) return bytes;
  return Buffer.concat([...fields.filter((f) => f.field !== 2).map((f) => f.raw), vField(2, min)]);
}

function lightenGraph(bytes, convert) {
  const fields = parse(bytes);
  const graphInputs = new Set(fields.filter((f) => f.field === 11).map((f) => parse(f.value).find((g) => g.field === 1)?.value.toString("utf8")));
  const nodes = [], rest = [];
  for (const f of fields) {
    if (f.field !== 5) {
      rest.push(f.raw);
      continue;
    }
    const t = tensorInfo(parse(f.value));
    const count = t.dims.reduce((a, b) => a * b, 1);
    if (t.dataType !== FLOAT || t.external || !t.data || count < MIN_ELEMENTS || graphInputs.has(t.name) || t.data.length !== count * 4) {
      rest.push(f.raw);
      continue;
    }
    const r = convert(t);
    rest.push(...r.inits.map((b) => bField(5, b)));
    nodes.push(...r.nodes.map((b) => bField(1, b)));
  }
  // The new nodes go first: they only read initializers.
  return Buffer.concat([...nodes, ...rest]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, output, variant] = process.argv.slice(2);
  if (!variant) throw new Error("usage: node scripts/models/onnx-light.mjs <in.onnx> <out.onnx> fp16w|int8w");
  const out = lighten(readFileSync(input), variant);
  writeFileSync(output, out);
  console.log(`${output}: ${out.length.toLocaleString("en")} bytes`);
}
