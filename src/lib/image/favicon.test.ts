import { describe, expect, it } from "vitest";
import { headSnippet, squarePlan, webManifest } from "./favicon";

describe("squarePlan", () => {
  it("fits the whole image with margins", () => {
    expect(squarePlan(400, 200, "contain")).toEqual({
      source: { x: 0, y: 0, width: 400, height: 200 },
      target: { x: 0, y: 128, width: 512, height: 256 },
    });
  });

  it("crops the center square", () => {
    expect(squarePlan(400, 200, "cover", 100)).toEqual({
      source: { x: 100, y: 0, width: 200, height: 200 },
      target: { x: 0, y: 0, width: 100, height: 100 },
    });
  });
});

describe("webManifest", () => {
  it("escapes the name and lists the Android icons", () => {
    const json = JSON.parse(webManifest(' Mi "app" </script> ', "#0f766e"));
    expect(json.name).toBe('Mi "app" </script>');
    expect(json.icons.map((i: { sizes: string }) => i.sizes)).toEqual(["192x192", "512x512"]);
    expect(json.theme_color).toBe("#0f766e");
    expect(JSON.parse(webManifest("x".repeat(100), null)).name).toHaveLength(60);
  });

  it("references every file of the pack in the snippet", () => {
    for (const f of ["favicon.ico", "favicon-32x32.png", "favicon-16x16.png", "apple-touch-icon.png", "site.webmanifest"]) {
      expect(headSnippet).toContain(`/${f}`);
    }
  });
});
