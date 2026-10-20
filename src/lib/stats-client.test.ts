import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackTool } from "./stats-client";

const sent: unknown[] = [];

beforeEach(() => {
  sent.length = 0;
  vi.stubGlobal("navigator", {
    sendBeacon: (_url: string, body: Blob) => {
      void body.text().then((t) => sent.push(JSON.parse(t)));
      return true;
    },
  });
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("trackTool", () => {
  it("reports a successful run with sizes and duration, never file names", async () => {
    const files = [new File(["abc"], "secreto.pdf"), new File(["de"], "otro.pdf")];
    const out = await trackTool("merge-pdf", { from: "pdf", to: "pdf", files }, async () => new Blob(["xyzw"]), (b) => b.size);
    expect(out.size).toBe(4);
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ tool: "merge-pdf", from: "pdf", to: "pdf", size: 5, outputSize: 4, success: true });
    expect((sent[0] as { durationMs: number }).durationMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(sent)).not.toContain("secreto");
  });

  it("reports failures and rethrows the error", async () => {
    const boom = new Error("broken pdf");
    await expect(
      trackTool("split-pdf", { from: "pdf", to: "pdf", files: [new Blob(["a"])] }, () => Promise.reject(boom), () => 0),
    ).rejects.toBe(boom);
    await flush();
    expect(sent[0]).toMatchObject({ tool: "split-pdf", success: false, errorCode: "conversionFailed" });
    expect(sent[0]).not.toHaveProperty("outputSize");
  });
});
