// Limits and FFmpeg arguments of the fallback for old video and audio formats
// (AVI, WMV, FLV, MPEG-1/2, 3GP, VOB, RealMedia, WMA, AMR, AC-3), used only when
// mediabunny with the browser's WebCodecs can't read a file.

export type LegacyKind = "video" | "audio";

/** One thread of WASM is several times slower than the browser's own decoders: shorter limits. */
// The rewritten WebM is kept in WASM memory (2 GB at most): 20 minutes at up to 2.5 Mbit/s is under 400 MB.
export const LEGACY_MAX_VIDEO_SECONDS = 20 * 60;
/** The intermediate WAV lives in memory (about 10 MB per minute of 48 kHz stereo). */
export const LEGACY_MAX_AUDIO_SECONDS = 60 * 60;

/** Extensions of the old formats the fallback reads (the tools add them to what they accept). */
export const LEGACY_VIDEO_EXTENSIONS = ["avi", "wmv", "asf", "flv", "mpg", "mpeg", "m1v", "m2v", "vob", "3gp", "3g2", "rm", "rmvb", "ts", "m2ts", "mts"];
export const LEGACY_AUDIO_EXTENSIONS = ["wma", "amr", "awb", "ac3", "mp2", "ra"];

/**
 * FFmpeg arguments that rewrite `input` into `output`: WebM (VP8 at high quality,
 * fast settings, plus Opus) for video, 16-bit PCM WAV (at most stereo, at most 48 kHz)
 * for audio. `limit` cuts the input at that many seconds (when its duration is unknown).
 */
export function legacyArgs(kind: LegacyKind, input: string, output: string, { limit, hasAudio = true, audio }: { limit?: number; hasAudio?: boolean; audio?: AudioShape | null } = {}): string[] {
  const head = ["-hide_banner", "-stats_period", "0.5", "-i", input, ...(limit ? ["-t", String(limit)] : []), "-map_metadata", "-1"];
  if (kind === "audio") return [...head, "-map", "0:a:0", "-vn", "-sn", "-dn", "-ac", String(Math.min(2, audio?.channels ?? 2)), "-c:a", "pcm_s16le", "-ar", String(Math.min(48_000, audio?.sampleRate ?? 48_000)), "-f", "wav", output];
  return [
    ...head,
    "-map", "0:v:0",
    ...(hasAudio ? ["-map", "0:a:0?"] : []),
    "-sn", "-dn",
    // Even dimensions and square pixels (DVD/VOB and some AVI have anamorphic pixels).
    "-vf", "scale=trunc(iw*sar/2)*2:trunc(ih/2)*2,setsar=1",
    "-pix_fmt", "yuv420p",
    "-c:v", "libvpx", "-deadline", "realtime", "-cpu-used", "8", "-crf", "10", "-b:v", "2500k", "-qmin", "2", "-qmax", "30", "-auto-alt-ref", "0",
    // libopus in this build crashes on stereo input (and any channel change): mono goes to
    // libopus, everything else to FFmpeg's own Opus encoder, downmixed to stereo.
    ...(hasAudio ? ((audio?.channels ?? 2) === 1 ? ["-c:a", "libopus", "-b:a", "96k"] : ["-c:a", "opus", "-strict", "-2", "-ac", "2", "-b:a", "192k"]) : []),
    "-f", "webm", output,
  ];
}

/** Sample rate and channels of the first audio stream `ffmpeg -i` lists. */
export interface AudioShape {
  sampleRate: number;
  channels: number;
}

const layouts: Record<string, number> = { mono: 1, stereo: 2, "2.1": 3, "3.0": 3, quad: 4, "4.0": 4, "5.0": 5, "5.0(side)": 5, "5.1": 6, "5.1(side)": 6, "6.1": 7, "7.1": 8 };

export function parseAudioShape(log: string): AudioShape | null {
  const m = /Stream #\d+:\d+.*: Audio: [^,]+, (\d+) Hz, ([^,\n]+)/.exec(log);
  if (!m) return null;
  const layout = m[2]!.trim();
  const channels = layouts[layout] ?? (Number(/^(\d+) channels/.exec(layout)?.[1]) || 2);
  return { sampleRate: Number(m[1]), channels };
}

/** Duration printed by `ffmpeg -i` ("Duration: 00:01:02.50"), in seconds; null when "N/A". */
export function parseDuration(log: string): number | null {
  const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(log);
  if (!m) return null;
  const seconds = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  return seconds > 0 ? seconds : null;
}

/** Container signatures of the old formats (the first bytes), to decide whether trying FFmpeg makes sense. */
export function looksLegacy(head: Uint8Array): boolean {
  const ascii = (offset: number, text: string) => [...text].every((c, i) => head[offset + i] === c.charCodeAt(0));
  if (ascii(0, "RIFF") && ascii(8, "AVI ")) return true;
  // ASF (WMV, WMA): the header object GUID 30 26 B2 75 8E 66 CF 11.
  if ([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11].every((b, i) => head[i] === b)) return true;
  if (ascii(0, "FLV")) return true;
  // MPEG program stream (MPG, VOB) and elementary video streams.
  if (head[0] === 0 && head[1] === 0 && head[2] === 1 && (head[3] === 0xba || head[3] === 0xb3)) return true;
  // MPEG transport stream: sync bytes every 188 bytes.
  if (head[0] === 0x47 && head.length > 188 && head[188] === 0x47) return true;
  if (ascii(0, ".RMF") || ascii(0, ".ra\xfd")) return true;
  if (ascii(0, "#!AMR")) return true;
  // AC-3 sync word.
  if (head[0] === 0x0b && head[1] === 0x77) return true;
  // 3GP / 3G2 (MP4 family, but with H.263, MPEG-4 Part 2 or AMR that browsers don't decode).
  if (ascii(4, "ftyp3g")) return true;
  return false;
}
