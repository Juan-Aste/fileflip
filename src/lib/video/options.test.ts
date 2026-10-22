import { describe, expect, it } from "vitest";
import type { VideoCodec } from "mediabunny";
import { tools } from "@/config/tools";
import { gifFrameTimes, gifSize, MAX_GIF_FRAMES, MAX_SPEED_FPS, scaledSize, SPEED_AUDIO_RATE, speedFrameRate, videoExtension, videoPlan, videoSpeeds, videoTargets } from "./options";

const all = () => true;
const noH264 = (codec: VideoCodec) => codec !== "avc";

describe("videoPlan", () => {
  it("copies tracks the target container takes", () => {
    expect(videoPlan("mov", { video: "avc", audio: "aac" }, all)).toEqual({ video: "avc", copyVideo: true, audio: "aac", copyAudio: true });
    expect(videoPlan("mkv", { video: "vp8", audio: "vorbis" }, all)).toEqual({ video: "vp8", copyVideo: true, audio: "vorbis", copyAudio: true });
    expect(videoPlan("mp4", { video: "hevc", audio: "aac" }, all)).toEqual({ video: "hevc", copyVideo: true, audio: "aac", copyAudio: true });
    // VP9 fits in MP4, but an MP4 is meant to play everywhere: it becomes H.264.
    expect(videoPlan("mp4", { video: "vp9", audio: "opus" }, all)).toMatchObject({ video: "avc", copyVideo: false });
  });

  it("re-encodes the rest with the first encoder the browser has", () => {
    expect(videoPlan("webm", { video: "avc", audio: "aac" }, all)).toEqual({ video: "vp9", copyVideo: false, audio: "opus", copyAudio: false });
    expect(videoPlan("mp4", { video: "vp8", audio: "vorbis" }, all)).toEqual({ video: "avc", copyVideo: false, audio: "aac", copyAudio: false });
    expect(videoPlan("mp4", { video: "vp8", audio: "vorbis" }, noH264)).toMatchObject({ video: "vp9", copyVideo: false });
    expect(videoPlan("webm", { video: "avc", audio: null }, (c) => c === "av1")).toEqual({ video: "av1", copyVideo: false, copyAudio: false });
  });

  it("MOV needs H.264 when re-encoding; no encoder at all means no plan", () => {
    expect(videoPlan("mov", { video: "vp9", audio: "opus" }, noH264)).toBeNull();
    expect(videoPlan("mov", { video: "avc", audio: "opus" }, noH264)).toEqual({ video: "avc", copyVideo: true, audio: "aac", copyAudio: false });
    expect(videoPlan("webm", { video: "avc", audio: "aac" }, () => false)).toBeNull();
  });

  it("every target is an output of the registered tool", () => {
    for (const target of videoTargets) expect(tools["video-converter"].outputs).toContain(videoExtension[target]);
  });

  it("re-encodes even a copyable video when the picture changes", () => {
    expect(videoPlan("mkv", { video: "avc", audio: "aac" }, all, true)).toEqual({ video: "avc", copyVideo: false, audio: "aac", copyAudio: true });
  });
});

describe("scaledSize", () => {
  it("limits the shorter side, keeps the ratio and even sizes, never enlarges", () => {
    expect(scaledSize(1920, 1080, 720)).toEqual({ width: 1280, height: 720 });
    expect(scaledSize(1080, 1920, 480)).toEqual({ width: 480, height: 854 });
    expect(scaledSize(640, 480, 360)).toEqual({ width: 480, height: 360 });
    expect(scaledSize(320, 240, 720)).toEqual({ width: 320, height: 240 });
    expect(scaledSize(321, 241)).toEqual({ width: 322, height: 242 });
  });
});

describe("GIF frames", () => {
  it("samples the range at the frame rate, up to the cap", () => {
    expect(gifFrameTimes({ start: 1, end: 2 }, 5)).toEqual([1, 1.2, 1.4, 1.6, 1.8]);
    expect(gifFrameTimes({ start: 0, end: 0.05 }, 10)).toEqual([0]);
    expect(gifFrameTimes({ start: 0, end: MAX_GIF_FRAMES / 10 }, 10)).toHaveLength(MAX_GIF_FRAMES);
    expect(gifFrameTimes({ start: 0, end: 60 }, 15)).toBeNull();
  });

  it("scales down to the width, never up", () => {
    expect(gifSize(1920, 1080, 480)).toEqual({ width: 480, height: 270 });
    expect(gifSize(320, 240, 640)).toEqual({ width: 320, height: 240 });
  });
});


describe("video speed", () => {
  it("re-encodes the audio too when asked (a copied track can't change speed)", () => {
    const all = () => true;
    expect(videoPlan("webm", { video: "vp9", audio: "opus" }, all, true, true)).toEqual({ video: "vp9", copyVideo: false, audio: "opus", copyAudio: false });
    expect(videoPlan("mkv", { video: "vp8", audio: "vorbis" }, all, true, true)).toMatchObject({ audio: "opus", copyAudio: false });
    expect(videoPlan("mp4", { video: "avc", audio: null }, all, true, true)).toEqual({ video: "avc", copyVideo: false, copyAudio: false });
  });

  it("every speed resamples the audio to a whole rate", () => {
    for (const speed of videoSpeeds) expect(Number.isInteger(SPEED_AUDIO_RATE / speed), `${speed}×`).toBe(true);
  });

  it("thins fast videos so the result stays at most 60 fps", () => {
    expect(speedFrameRate(30, 2)).toBeUndefined();
    expect(speedFrameRate(60, 2)).toBe(MAX_SPEED_FPS / 2);
    expect(speedFrameRate(30, 4)).toBe(15);
    expect(speedFrameRate(25, 0.5)).toBeUndefined();
  });
});
