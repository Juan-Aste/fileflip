import { describe, expect, it } from "vitest";
import { aiVoiceWorkers } from "./parallel";

const desktop = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
const phone = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36";

describe("aiVoiceWorkers", () => {
  it("two workers on a computer with spare cores and memory", () => {
    expect(aiVoiceWorkers({ userAgent: desktop, hardwareConcurrency: 8, deviceMemory: 8 })).toBe(2);
    // Firefox and Safari do not report memory: the cores decide.
    expect(aiVoiceWorkers({ userAgent: desktop, hardwareConcurrency: 4 })).toBe(2);
  });

  it("one on phones, small machines and outside the browser", () => {
    expect(aiVoiceWorkers({ userAgent: phone, hardwareConcurrency: 8, deviceMemory: 8 })).toBe(1);
    expect(aiVoiceWorkers({ userAgent: desktop, hardwareConcurrency: 2, deviceMemory: 8 })).toBe(1);
    expect(aiVoiceWorkers({ userAgent: desktop, hardwareConcurrency: 8, deviceMemory: 4 })).toBe(1);
    expect(aiVoiceWorkers(null)).toBe(1);
  });
});
