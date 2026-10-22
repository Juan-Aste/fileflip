// AIFF / AIFF-C reader and writer (uncompressed PCM only), so the audio
// converter can take and produce Apple's format, which mediabunny lacks.
// Input is rewritten as a WAV that mediabunny reads; output is mediabunny's
// 16-bit WAV rewritten as AIFF. Pure functions, no mediabunny import.
import { ConversionError } from "@/lib/convert-error";

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));

/** "FORM" + "AIFF"/"AIFC" header. */
export function isAiff(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && ascii(bytes, 0, 4) === "FORM" && ["AIFF", "AIFC"].includes(ascii(bytes, 8, 4));
}

/** IEEE 754 80-bit extended float (big-endian), the AIFF sample-rate field. */
export function readExtended(b: Uint8Array, at: number): number {
  const exponent = ((b[at]! & 0x7f) << 8) | b[at + 1]!;
  const sign = b[at]! & 0x80 ? -1 : 1;
  let mantissa = 0;
  for (let i = 0; i < 8; i++) mantissa = mantissa * 256 + b[at + 2 + i]!;
  if (exponent === 0 && mantissa === 0) return 0;
  if (exponent === 0x7fff) return NaN;
  return sign * mantissa * 2 ** (exponent - 16383 - 63);
}

export function writeExtended(value: number, b: Uint8Array, at: number) {
  b.fill(0, at, at + 10);
  if (!(value > 0) || !Number.isFinite(value)) return;
  let exponent = Math.floor(Math.log2(value));
  // Guard against log2 rounding: value / 2^exponent must be in [1, 2).
  if (2 ** exponent > value) exponent--;
  if (2 ** (exponent + 1) <= value) exponent++;
  // Scaling a double by a power of two is exact, so this is the 64-bit mantissa (explicit integer bit set).
  let mantissa = BigInt(value * 2 ** (63 - exponent));
  b[at] = ((exponent + 16383) >> 8) & 0x7f;
  b[at + 1] = (exponent + 16383) & 0xff;
  for (let i = 9; i >= 2; i--) {
    b[at + i] = Number(mantissa & BigInt(0xff));
    mantissa >>= BigInt(8);
  }
}

/** Compression types that are plain PCM: NONE/twos big-endian, sowt little-endian. */
const pcmCompression: Record<string, "be" | "le"> = { NONE: "be", twos: "be", sowt: "le", raw: "be" };

export interface AiffInfo {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  frames: number;
}

/**
 * Reads an AIFF/AIFF-C file into a 16/24/32-bit (8-bit becomes 16-bit) little-endian
 * PCM WAV with the same channels and rate. Compressed AIFF-C (μ-law, IMA…) is refused.
 */
export function aiffToWav(bytes: Uint8Array): { wav: Uint8Array; info: AiffInfo } {
  if (!isAiff(bytes)) throw new ConversionError("unsupportedFormat");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const aifc = ascii(bytes, 8, 4) === "AIFC";
  let comm: { channels: number; frames: number; bits: number; rate: number; order: "be" | "le" } | undefined;
  let sound: { start: number; length: number } | undefined;
  let at = 12;
  while (at + 8 <= bytes.length) {
    const id = ascii(bytes, at, 4);
    const size = view.getUint32(at + 4);
    const body = at + 8;
    if (id === "COMM") {
      if (size < 18 || body + 18 > bytes.length) throw new ConversionError("fileDamaged");
      let order: "be" | "le" = "be";
      if (aifc) {
        if (size < 22 || body + 22 > bytes.length) throw new ConversionError("fileDamaged");
        const type = ascii(bytes, body + 18, 4);
        const known = pcmCompression[type] ?? pcmCompression[type.trim()];
        // μ-law, A-law, IMA ADPCM…: the FAQ says only uncompressed AIFF-C is read.
        if (!known) throw new ConversionError("unsupportedFormat");
        order = known;
      }
      comm = {
        channels: view.getUint16(body),
        frames: view.getUint32(body + 2),
        bits: view.getUint16(body + 6),
        rate: readExtended(bytes, body + 8),
        order,
      };
    } else if (id === "SSND") {
      if (body + 8 > bytes.length) throw new ConversionError("fileDamaged");
      const offset = view.getUint32(body);
      sound = { start: body + 8 + offset, length: Math.max(0, size - 8 - offset) };
    }
    at = body + size + (size & 1);
  }
  if (!comm || !sound) throw new ConversionError("fileDamaged");
  const { channels, bits, rate, order } = comm;
  if (channels < 1 || channels > 8 || bits < 1 || bits > 32 || !(rate >= 1000 && rate <= 384_000)) throw new ConversionError("fileDamaged");
  const inBytes = Math.ceil(bits / 8);
  const outBytes = inBytes === 1 ? 2 : inBytes;
  const frameIn = inBytes * channels;
  // A file cut before the declared frame count is damaged.
  const available = Math.floor(Math.min(sound.length, bytes.length - sound.start) / frameIn);
  if (available < comm.frames) throw new ConversionError("fileDamaged");
  const frames = comm.frames;
  if (frames === 0) throw new ConversionError("noAudioTrack");

  const dataBytes = frames * channels * outBytes;
  const wav = new Uint8Array(44 + dataBytes);
  const out = new DataView(wav.buffer);
  wav.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  out.setUint32(4, 36 + dataBytes, true);
  wav.set([0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20], 8); // WAVEfmt
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); // PCM
  out.setUint16(22, channels, true);
  out.setUint32(24, Math.round(rate), true);
  out.setUint32(28, Math.round(rate) * channels * outBytes, true);
  out.setUint16(32, channels * outBytes, true);
  out.setUint16(34, outBytes * 8, true);
  wav.set([0x64, 0x61, 0x74, 0x61], 36); // data
  out.setUint32(40, dataBytes, true);

  const samples = frames * channels;
  let src = sound.start;
  let dst = 44;
  if (inBytes === 1) {
    // 8-bit AIFF is signed; widen to 16-bit (WAV's 8-bit would be unsigned).
    for (let i = 0; i < samples; i++, src++, dst += 2) out.setInt16(dst, ((bytes[src]! << 24) >> 24) * 256, true);
  } else if (order === "le") {
    wav.set(bytes.subarray(src, src + samples * inBytes), dst);
  } else {
    for (let i = 0; i < samples; i++, src += inBytes, dst += inBytes) for (let k = 0; k < inBytes; k++) wav[dst + k] = bytes[src + inBytes - 1 - k]!;
  }
  return { wav, info: { channels, sampleRate: rate, bitsPerSample: outBytes * 8, frames } };
}

/** Rewrites a little-endian PCM WAV (as mediabunny writes it) as an AIFF with the same samples. */
export function wavToAiff(wav: Uint8Array): Uint8Array {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  if (wav.length < 12 || ascii(wav, 0, 4) !== "RIFF" || ascii(wav, 8, 4) !== "WAVE") throw new ConversionError("conversionFailed");
  let fmt: { channels: number; rate: number; bits: number } | undefined;
  let data: { start: number; length: number } | undefined;
  let at = 12;
  while (at + 8 <= wav.length) {
    const id = ascii(wav, at, 4);
    const size = view.getUint32(at + 4, true);
    const body = at + 8;
    if (id === "fmt ") {
      const tag = view.getUint16(body, true);
      // 1 = PCM, 0xfffe = WAVE_FORMAT_EXTENSIBLE (PCM subformat for >2 channels).
      if (tag !== 1 && tag !== 0xfffe) throw new ConversionError("conversionFailed");
      fmt = { channels: view.getUint16(body + 2, true), rate: view.getUint32(body + 4, true), bits: view.getUint16(body + 14, true) };
    } else if (id === "data") {
      data = { start: body, length: Math.min(size, wav.length - body) };
      break;
    }
    at = body + size + (size & 1);
  }
  if (!fmt || !data || fmt.bits % 8 !== 0 || fmt.bits < 16) throw new ConversionError("conversionFailed");
  const width = fmt.bits / 8;
  const frames = Math.floor(data.length / (width * fmt.channels));
  const soundBytes = frames * width * fmt.channels;
  const total = 12 + 26 + 16 + soundBytes;
  const out = new Uint8Array(total + (soundBytes & 1));
  const o = new DataView(out.buffer);
  out.set([0x46, 0x4f, 0x52, 0x4d], 0); // FORM
  o.setUint32(4, out.length - 8);
  out.set([0x41, 0x49, 0x46, 0x46, 0x43, 0x4f, 0x4d, 0x4d], 8); // AIFFCOMM
  o.setUint32(16, 18);
  o.setUint16(20, fmt.channels);
  o.setUint32(22, frames);
  o.setUint16(26, fmt.bits);
  writeExtended(fmt.rate, out, 28);
  out.set([0x53, 0x53, 0x4e, 0x44], 38); // SSND
  o.setUint32(42, 8 + soundBytes);
  o.setUint32(46, 0);
  o.setUint32(50, 0);
  let src = data.start;
  let dst = 54;
  for (let i = 0; i < frames * fmt.channels; i++, src += width, dst += width) for (let k = 0; k < width; k++) out[dst + k] = wav[src + width - 1 - k]!;
  return out;
}
