import { describe, expect, it } from "vitest";
import type { VideoCodec } from "mediabunny";
import { tools } from "@/config/tools";
import { scaledSize, videoExtension, videoPlan, videoTargets } from "./options";

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

