// Audio converter targets and how each one is encoded. No mediabunny import:
// the page and the tests read these without loading the engine.
import type { AudioCodec } from "mediabunny";

export const audioTargets = ["mp3", "wav", "flac", "ogg", "m4a", "aiff"] as const;
export type AudioTarget = (typeof audioTargets)[number];

/** Lossy targets offer these bitrates (kbps); 192 by default. */
export const audioBitrates = [96, 128, 192, 256, 320] as const;
export type AudioBitrate = (typeof audioBitrates)[number];

export interface AudioOptions {
  target: AudioTarget;
  bitrate: AudioBitrate;
}

/** The whole output is kept in memory: 3 hours of 320 kbps MP3 is ~430 MB, of 16-bit stereo WAV ~1.9 GB at 44.1 kHz. */
export const MAX_AUDIO_SECONDS = 3 * 60 * 60;

export interface AudioPlan {
  codec: AudioCodec;
  lossy: boolean;
  /** Bits per second, lossy codecs only. */
  bitrate?: number;
  sampleRate?: number;
  sampleFormat?: "s16";
}

export function audioPlan({ target, bitrate }: AudioOptions): AudioPlan {
  switch (target) {
    case "wav":
    case "aiff":
      // AIFF is written as a 16-bit WAV first, then rewritten big-endian (aiff.ts).
      return { codec: "pcm-s16", lossy: false };
    case "flac":
      return { codec: "flac", lossy: false, sampleFormat: "s16" };
    case "mp3":
      // LAME takes 8–48 kHz; 44.1 kHz is what every player expects.
      return { codec: "mp3", lossy: true, bitrate: bitrate * 1000, sampleRate: 44100 };
    case "ogg":
      // Opus always runs at 48 kHz.
      return { codec: "opus", lossy: true, bitrate: Math.min(bitrate, 256) * 1000, sampleRate: 48000 };
    case "m4a":
      return { codec: "aac", lossy: true, bitrate: bitrate * 1000 };
  }
}

export const audioExtension: Record<AudioTarget, string> = { mp3: "mp3", wav: "wav", flac: "flac", ogg: "ogg", m4a: "m4a", aiff: "aiff" };
export const audioMime: Record<AudioTarget, string> = { mp3: "audio/mpeg", wav: "audio/wav", flac: "audio/flac", ogg: "audio/ogg", m4a: "audio/mp4", aiff: "audio/aiff" };
