import { describe, expect, it } from "vitest";
import { tools } from "@/config/tools";
import { audioExtension, audioPlan, audioTargets } from "./options";

describe("audioPlan", () => {
  it("lossless targets keep the sample rate in 16 bits; lossy ones carry the bitrate", () => {
    expect(audioPlan({ target: "wav", bitrate: 192 })).toEqual({ codec: "pcm-s16", lossy: false });
    expect(audioPlan({ target: "flac", bitrate: 320 })).toEqual({ codec: "flac", lossy: false, sampleFormat: "s16" });
    expect(audioPlan({ target: "mp3", bitrate: 128 })).toEqual({ codec: "mp3", lossy: true, bitrate: 128_000, sampleRate: 44100 });
    expect(audioPlan({ target: "m4a", bitrate: 256 })).toEqual({ codec: "aac", lossy: true, bitrate: 256_000 });
  });

  it("Opus runs at 48 kHz and at most 256 kbps", () => {
    expect(audioPlan({ target: "ogg", bitrate: 320 })).toEqual({ codec: "opus", lossy: true, bitrate: 256_000, sampleRate: 48000 });
  });

  it("every target is an output of the registered tool", () => {
    for (const target of audioTargets) expect(tools["audio-converter"].outputs).toContain(audioExtension[target]);
  });
});
