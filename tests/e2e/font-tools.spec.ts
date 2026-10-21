// Font converter: outputs are read with fontkit (an independent parser) and
// loaded by Chromium's own font sanitizer through the FontFace API.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import * as fontkit from "fontkit";
import { expect, fileOf, fixturePath, openWithFiles, test, toolAlert, waitForResult } from "./support";

function describeFont(buf: Buffer) {
  const font = fontkit.create(buf);
  const a = font.glyphForCodePoint(0x41);
  return { family: font.familyName, glyphs: font.numGlyphs, A: a.advanceWidth, bbox: { ...a.bbox }, ñ: font.hasGlyphForCodePoint(0xf1) };
}
const reference = describeFont(readFileSync(fixturePath("font.ttf")));

/** Whether Chromium accepts the font (FontFace runs it through its sanitizer, OTS). */
const browserLoads = (page: Page, buf: Buffer) =>
  page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    try {
      await new FontFace("check", bytes).load();
      return true;
    } catch {
      return false;
    }
  }, buf.toString("base64"));

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "fonts must not go to the server").toEqual([]);
});

test.describe("tool: font-converter", () => {
  test("TTF and OTF → WOFF2, loaded by Chromium; names kept apart", async ({ page }) => {
    await openWithFiles(page, "/es/convertir-fuentes", ["font.ttf", "font.otf"]);
    await page.getByRole("button", { name: "Convertir fuentes", exact: true }).click();
    const links = page.locator("main li a[download]");
    await expect(links).toHaveCount(2, { timeout: 45_000 });
    const names: string[] = [];
    for (let i = 0; i < 2; i++) {
      const out = fileOf(await waitForResult(page, links.nth(i), toolAlert(page)));
      names.push(out.name);
      expect(out.buf.subarray(0, 4).toString("latin1")).toBe("wOF2");
      expect(describeFont(out.buf)).toEqual(reference);
      expect(await browserLoads(page, out.buf)).toBe(true);
    }
    expect(names).toEqual(["font.woff2", "font-2.woff2"]);
  });

  test("WOFF and WOFF2 back to desktop fonts keep their outline type; TTF → WOFF", async ({ page }) => {
    await openWithFiles(page, "/en/font-converter", ["font.woff", "font.woff2"]);
    await page.locator("label").filter({ hasText: "TTF / OTF" }).click();
    await page.getByRole("button", { name: "Convert fonts", exact: true }).click();
    const links = page.locator("main li a[download]");
    await expect(links).toHaveCount(2, { timeout: 45_000 });
    const ttf = fileOf(await waitForResult(page, links.nth(0), toolAlert(page)));
    const otf = fileOf(await waitForResult(page, links.nth(1), toolAlert(page)));
    expect([ttf.name, otf.name]).toEqual(["font.ttf", "font.otf"]);
    expect(ttf.buf.readUInt32BE(0)).toBe(0x00010000);
    expect(otf.buf.subarray(0, 4).toString("latin1")).toBe("OTTO");
    for (const out of [ttf, otf]) {
      expect(describeFont(out.buf)).toEqual(reference);
      expect(await browserLoads(page, out.buf)).toBe(true);
    }

    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixturePath("font.ttf"));
    await page.locator("label").filter({ hasText: "WOFF (web" }).click();
    await page.getByRole("button", { name: "Convert fonts", exact: true }).click();
    const woff = fileOf(await waitForResult(page, links.nth(0), toolAlert(page)));
    expect(woff.name).toBe("font.woff");
    expect(woff.buf.subarray(0, 4).toString("latin1")).toBe("wOFF");
    expect(woff.buf.length).toBeLessThan(readFileSync(fixturePath("font.ttf")).length);
    expect(describeFont(woff.buf)).toEqual(reference);
    expect(await browserLoads(page, woff.buf)).toBe(true);
    // One web font: its @font-face rule is shown to copy.
    await expect(page.getByRole("textbox", { name: "Preview" })).toHaveValue(/src: url\("font\.woff"\) format\("woff"\)/);
  });

  test("a truncated WOFF2 and a WOFF bomb fail without output", async ({ page }) => {
    await openWithFiles(page, "/en/font-converter", ["corrupt/truncated.woff2", "corrupt/bomb.woff"]);
    await page.getByRole("button", { name: "Convert fonts", exact: true }).click();
    // Both fail the same way: the shell shows one alert for the batch.
    await expect(toolAlert(page)).toContainText(/damaged/i, { timeout: 30_000 });
    await expect(page.locator("main li a[download]")).toHaveCount(0);
  });
});
