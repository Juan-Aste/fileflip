import { describe, expect, it } from "vitest";
import { createLevelMeter, fromDb, normalizeGain, toDb } from "./normalize";

describe("normalizeGain", () => {
  it("peak mode brings the loudest sample to -1 dBFS, up or down", () => {
    expect(toDb(0.125 * normalizeGain({ peak: 0.125, rms: 0.088 }, "peak")!)).toBeCloseTo(-1, 6);
    expect(toDb(1 * normalizeGain({ peak: 1, rms: 0.5 }, "peak")!)).toBeCloseTo(-1, 6);
  });

  it("loudness mode aims the RMS at -16 dBFS without pushing the peak over -1 dBFS", () => {
    const sine = { peak: 0.125, rms: 0.125 / Math.SQRT2 };
    const gain = normalizeGain(sine, "loudness")!;
    expect(toDb(sine.rms * gain)).toBeCloseTo(-16, 6);
    // A spiky signal: the peak ceiling wins and the RMS stays below the target.
    const spiky = { peak: 0.9, rms: 0.01 };
    expect(toDb(spiky.peak * normalizeGain(spiky, "loudness")!)).toBeCloseTo(-1, 6);
  });

  it("caps the gain at +30 dB and refuses silence", () => {
    expect(toDb(normalizeGain({ peak: 0.001, rms: 0.0005 }, "peak")!)).toBeCloseTo(30, 6);
    expect(normalizeGain({ peak: 0, rms: 0 }, "peak")).toBeNull();
    expect(normalizeGain({ peak: fromDb(-100), rms: fromDb(-110) }, "loudness")).toBeNull();
  });
});

describe("createLevelMeter", () => {
  it("measures peak and RMS across blocks", () => {
    const meter = createLevelMeter();
    meter.add(new Float32Array([0.5, -0.5]));
    meter.add(new Float32Array([-1, 0]));
    const { peak, rms } = meter.levels();
    expect(peak).toBe(1);
    expect(rms).toBeCloseTo(Math.sqrt(1.5 / 4), 6);
  });
});
