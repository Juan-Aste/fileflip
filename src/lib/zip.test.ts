import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createZip, uniqueNames, zipBlobs } from "./zip";

describe("uniqueNames", () => {
  it("numbers duplicates case-insensitively", () => {
    expect(uniqueNames(["a.jpg", "A.jpg", "a.jpg", "b.png", "README"])).toEqual([
      "a.jpg",
      "A (1).jpg",
      "a (2).jpg",
      "b.png",
      "README",
    ]);
  });

  it("does not collide with an existing numbered name", () => {
    expect(uniqueNames(["a (1).jpg", "a.jpg", "a.jpg"])).toEqual(["a (1).jpg", "a.jpg", "a (2).jpg"]);
  });
});

describe("createZip", () => {
  it("stores every file with a unique name", () => {
    const zip = createZip([
      { name: "x.txt", data: new TextEncoder().encode("one") },
      { name: "x.txt", data: new TextEncoder().encode("two") },
    ]);
    const files = unzipSync(zip);
    expect(Object.keys(files)).toEqual(["x.txt", "x (1).txt"]);
    expect(new TextDecoder().decode(files["x (1).txt"])).toBe("two");
  });
});

describe("zipBlobs", () => {
  it("returns a zip Blob", async () => {
    const blob = await zipBlobs([{ name: "a.bin", blob: new Blob([new Uint8Array([1, 2, 3])]) }]);
    expect(blob.type).toBe("application/zip");
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect([...files["a.bin"]]).toEqual([1, 2, 3]);
  });
});
