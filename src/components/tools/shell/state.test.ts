import { describe, expect, it } from "vitest";
import {
  checkInputs,
  extensionOf,
  initialShellState,
  outputFiles,
  renameExtension,
  shellReducer,
  type ShellState,
} from "./state";

const file = (name: string, size = 10) => ({ name, size });
const limits = { extensions: ["json", "csv"], maxFiles: 2, maxFileBytes: 100 };

describe("checkInputs", () => {
  it("accepts by extension, case-insensitively", () => {
    const { accepted, rejected } = checkInputs([file("a.JSON"), file("b.txt"), file("noext")], limits);
    expect(accepted.map((f) => f.name)).toEqual(["a.JSON"]);
    expect(rejected.map((r) => r.reason)).toEqual(["unsupportedFormat", "unsupportedFormat"]);
  });

  it("rejects files over the size limit and beyond the batch size", () => {
    const { accepted, rejected } = checkInputs(
      [file("a.json", 101), file("b.json"), file("c.csv"), file("d.csv")],
      limits,
    );
    expect(accepted.map((f) => f.name)).toEqual(["b.json", "c.csv"]);
    expect(rejected).toEqual([
      { file: file("a.json", 101), reason: "fileTooLarge" },
      { file: file("d.csv"), reason: "tooManyFiles" },
    ]);
  });

  it("rejects empty files unless the tool allows them (B-20)", () => {
    expect(checkInputs([file("a.json", 0)], limits).rejected).toEqual([{ file: file("a.json", 0), reason: "emptyFile" }]);
    expect(checkInputs([file("a.json", 0)], { ...limits, allowEmpty: true }).accepted).toHaveLength(1);
  });

  it("counts the files already chosen", () => {
    expect(checkInputs([file("a.json")], limits, 2).rejected[0].reason).toBe("tooManyFiles");
  });

  it("accepts any extension when the list is empty", () => {
    expect(checkInputs([file("x.bin")], { ...limits, extensions: [] }).accepted).toHaveLength(1);
  });

  it("reads extensions", () => {
    expect(extensionOf("a.tar.gz")).toBe("gz");
    expect(extensionOf(".bashrc")).toBe("");
    expect(extensionOf("README")).toBe("");
  });
});

describe("shellReducer", () => {
  const blob = new Blob(["x"]);
  const processing: ShellState = { status: "processing", progress: 0.5 };

  it("goes idle → processing → done", () => {
    let state = shellReducer(initialShellState, { type: "start" });
    expect(state).toEqual({ status: "processing", progress: 0 });
    state = shellReducer(state, { type: "progress", progress: 0.4 });
    expect(state).toEqual({ status: "processing", progress: 0.4 });
    state = shellReducer(state, { type: "finish", outputs: [{ kind: "file", name: "a.csv", blob }] });
    expect(state.status).toBe("done");
    expect(outputFiles(state)).toEqual([{ name: "a.csv", blob }]);
  });

  it("clamps progress and never moves it back", () => {
    expect(shellReducer(processing, { type: "progress", progress: 0.2 })).toEqual(processing);
    expect(shellReducer(processing, { type: "progress", progress: 7 })).toEqual({ status: "processing", progress: 1 });
  });

  it("ignores progress, finish and fail outside a run", () => {
    expect(shellReducer(initialShellState, { type: "progress", progress: 0.5 })).toBe(initialShellState);
    expect(shellReducer(initialShellState, { type: "finish", outputs: [] })).toBe(initialShellState);
    expect(shellReducer(initialShellState, { type: "fail", code: "fileDamaged" })).toBe(initialShellState);
  });

  it("keeps partial results when some inputs fail", () => {
    const state = shellReducer(processing, {
      type: "finish",
      outputs: [
        { kind: "file", name: "a.csv", blob },
        { kind: "error", name: "b.json", code: "fileDamaged" },
      ],
    });
    expect(state.status).toBe("done");
    expect(outputFiles(state)).toHaveLength(1);
  });

  it("turns a run where everything failed the same way into one error", () => {
    const outputs = [
      { kind: "error" as const, name: "a", code: "fileDamaged" as const },
      { kind: "error" as const, name: "b", code: "fileDamaged" as const },
    ];
    expect(shellReducer(processing, { type: "finish", outputs })).toEqual({ status: "error", code: "fileDamaged" });
    // Different errors stay per file.
    const mixed = [outputs[0], { kind: "error" as const, name: "b", code: "jobTimedOut" as const }];
    expect(shellReducer(processing, { type: "finish", outputs: mixed }).status).toBe("done");
    expect(shellReducer(processing, { type: "finish", outputs: [] })).toEqual({
      status: "error",
      code: "conversionFailed",
    });
  });

  it("fails and resets", () => {
    const failed = shellReducer(processing, { type: "fail", code: "jobCancelled" });
    expect(failed).toEqual({ status: "error", code: "jobCancelled" });
    expect(shellReducer(failed, { type: "reset" })).toBe(initialShellState);
    expect(outputFiles(failed)).toEqual([]);
  });
});

describe("renameExtension", () => {
  it("replaces or adds the extension", () => {
    expect(renameExtension("data.json", "csv")).toBe("data.csv");
    expect(renameExtension("archive.tar.gz", "zip")).toBe("archive.tar.zip");
    expect(renameExtension("README", "txt")).toBe("README.txt");
    expect(renameExtension("", "txt")).toBe("file.txt");
  });
});

describe("error positions", () => {
  it("keeps the position when a single input fails", () => {
    const processing = shellReducer(initialShellState, { type: "start" });
    const state = shellReducer(processing, {
      type: "finish",
      outputs: [{ kind: "error", name: "a.json", code: "invalidData", position: { line: 3, column: 7 } }],
    });
    expect(state).toEqual({ status: "error", code: "invalidData", position: { line: 3, column: 7 } });
  });

  it("drops it when several inputs fail with the same code", () => {
    const processing = shellReducer(initialShellState, { type: "start" });
    const state = shellReducer(processing, {
      type: "finish",
      outputs: [
        { kind: "error", name: "a.json", code: "invalidData", position: { line: 3, column: 7 } },
        { kind: "error", name: "b.json", code: "invalidData", position: { line: 1, column: 1 } },
      ],
    });
    expect(state).toEqual({ status: "error", code: "invalidData" });
  });
});
