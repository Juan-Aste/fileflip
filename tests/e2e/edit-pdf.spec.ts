// Edit PDF: items placed with the pointer, saved and read back with poppler
// (pdftotext for the text, pdftoppm for the pixels).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import sharp from "sharp";
import { expect, fileOf, inspectPdf, openWithFiles, runTool, test } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "editing must not call the server").toEqual([]);
});

const dir = mkdtempSync(join(tmpdir(), "edit-pdf-e2e-"));
let n = 0;
function save(buf: Buffer) {
  const path = join(dir, `out${n++}.pdf`);
  writeFileSync(path, buf);
  return path;
}
const pdftotext = (buf: Buffer, page: number) => execFileSync("pdftotext", ["-f", String(page), "-l", String(page), save(buf), "-"], { encoding: "utf8" });
/** Whether poppler paints a pixel close to `color` within 5 pt of (x, y): the pointer lands within a pixel of the screen. */
async function painted(buf: Buffer, page: number, x: number, y: number, color: number[]) {
  const out = join(dir, `px${n++}`);
  execFileSync("pdftoppm", ["-r", "72", "-f", String(page), "-l", String(page), "-png", "-singlefile", save(buf), out]);
  const { data, info } = await sharp(readFileSync(`${out}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let dy = -5; dy <= 5; dy++)
    for (let dx = -5; dx <= 5; dx++) {
      const i = ((Math.round(y) + dy) * info.width + Math.round(x) + dx) * 3;
      if ([0, 1, 2].every((c) => Math.abs(data[i + c]! - color[c]!) < 20)) return true;
    }
  return false;
}

/** Page points (origin top-left) → screen pixels on the editing surface. */
async function at(page: Page, x: number, y: number) {
  const surface = page.getByTestId("edit-surface");
  // The whole page must be on screen, below the sticky header, for the pointer
  // to reach it. Centered by hand: in iPhone emulation WebKit's
  // scrollIntoView({ block: "center" }) overshoots once the page has grown
  // (the surface ended up under the header and drags hit the header).
  await surface.evaluate((el) => {
    const top = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
    const r = el.getBoundingClientRect();
    window.scrollBy({ top: r.top + r.height / 2 - (top + window.innerHeight) / 2, behavior: "instant" });
  });
  const box = (await surface.boundingBox())!;
  const [w, h] = (await surface.getAttribute("viewBox"))!.split(" ").slice(2).map(Number) as [number, number];
  const point = { x: box.x + (x / w) * box.width, y: box.y + (y / h) * box.height };
  // The point really lands on the page being edited, not on something above it.
  const onPage = await surface.evaluate((el, p) => !!el.parentElement?.contains(document.elementFromPoint(p.x, p.y)), point);
  expect(onPage, `(${x}, ${y}) of the page is not reachable on screen`).toBe(true);
  return point;
}
async function drag(page: Page, from: [number, number], to: [number, number]) {
  const a = await at(page, ...from);
  const b = await at(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 5, a.y + ((b.y - a.y) * i) / 5);
  await page.mouse.up();
}
/** At 50 % the whole page fits in the editor's scroll box and on screen. */
async function fit(page: Page, zoomOut: string) {
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: zoomOut }).click();
  await expect(page.getByText("50 %")).toBeVisible();
}
const tool = (page: Page, name: string) => page.getByRole("toolbar").getByRole("button", { name, exact: true }).click();

test.describe("tool: edit-pdf", () => {
  test("text, highlight, ink and an arrow on page 2, with undo and redo @xb", async ({ page }) => {
    await openWithFiles(page, "/es/editar-pdf", ["document.pdf"]);
    const surface = page.getByTestId("edit-surface");
    await expect(surface).toHaveAttribute("aria-label", "Página 1, sin elementos agregados");
    await fit(page, "Alejar");
    await page.getByRole("navigation", { name: "Páginas" }).getByRole("button", { name: /Página 2/ }).click();
    await expect(surface).toHaveAttribute("aria-label", "Página 2, sin elementos agregados");

    await tool(page, "Texto");
    const p = await at(page, 100, 400);
    await page.mouse.click(p.x, p.y);
    await page.getByRole("textbox", { name: "Texto" }).fill("Aprobado por Ana Pérez");
    await tool(page, "Resaltar");
    await drag(page, [60, 600], [300, 630]);
    await tool(page, "Dibujar");
    await drag(page, [100, 700], [300, 720]);
    await tool(page, "Flecha");
    await drag(page, [350, 500], [500, 500]);
    await expect(surface).toHaveAttribute("aria-label", "Página 2, 4 elementos agregados");
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(surface).toHaveAttribute("aria-label", "Página 2, 3 elementos agregados");
    await page.getByRole("button", { name: "Rehacer" }).click();
    await expect(surface).toHaveAttribute("aria-label", "Página 2, 4 elementos agregados");

    const out = fileOf(await runTool(page, "Guardar PDF"));
    expect(out.name).toBe("document-edited.pdf");
    const info = await inspectPdf(out.buf);
    expect(info.pages).toBeGreaterThanOrEqual(2);
    expect(pdftotext(out.buf, 2)).toContain("Aprobado por Ana Pérez");
    expect(pdftotext(out.buf, 1)).not.toContain("Aprobado");
    // Default colors: yellow highlight (40 %) on white paper, blue ink, red arrow.
    expect(await painted(out.buf, 2, 280, 620, [255, 239, 153])).toBe(true);
    expect(await painted(out.buf, 2, 200, 710, [29, 63, 158])).toBe(true);
    expect(await painted(out.buf, 2, 425, 500, [211, 47, 47])).toBe(true);
    // Untouched paper stays white.
    expect(await painted(out.buf, 2, 500, 780, [255, 239, 153])).toBe(false);
  });

  // Real touch input (CDP touch events, so Chromium: the Android project),
  // not mouse events in a phone viewport: the finger must draw and place an
  // arrow, the surface (touch-action: none) must not scroll the page instead.
  test("a finger draws and places an arrow on a phone @xb", async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== "chromium" || !testInfo.project.use.hasTouch, "real touch events need Chromium's CDP and a touch device");
    const cdp = await page.context().newCDPSession(page);
    const swipe = async (from: [number, number], to: [number, number]) => {
      const a = await at(page, ...from);
      const b = await at(page, ...to);
      const scroll = await page.evaluate(() => window.scrollY);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: a.x, y: a.y }] });
      for (let i = 1; i <= 5; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: a.x + ((b.x - a.x) * i) / 5, y: a.y + ((b.y - a.y) * i) / 5 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      expect(await page.evaluate(() => window.scrollY), "the swipe must draw, not scroll").toBe(scroll);
    };
    await openWithFiles(page, "/es/editar-pdf", ["document.pdf"]);
    const surface = page.getByTestId("edit-surface");
    await fit(page, "Alejar");
    await tool(page, "Dibujar");
    await swipe([100, 700], [300, 720]);
    await expect(surface).toHaveAttribute("aria-label", "Página 1, 1 elemento agregado");
    await tool(page, "Flecha");
    await swipe([350, 500], [500, 500]);
    await expect(surface).toHaveAttribute("aria-label", "Página 1, 2 elementos agregados");
    const out = fileOf(await runTool(page, "Guardar PDF"));
    expect(await painted(out.buf, 1, 200, 710, [29, 63, 158])).toBe(true);
    expect(await painted(out.buf, 1, 425, 500, [211, 47, 47])).toBe(true);
  });

  test("a white box only covers, unless the page is really hidden", async ({ page }) => {
    await openWithFiles(page, "/en/edit-pdf", ["document-1page.pdf"]);
    const original = execFileSync("pdftotext", [join(__dirname, "../fixtures/document-1page.pdf"), "-"], { encoding: "utf8" });
    expect(original).toContain("Synthetic text");
    await fit(page, "Zoom out");
    await tool(page, "Cover");
    // Over the whole top part of the page, where the text is.
    await drag(page, [20, 20], [575, 300]);
    await expect(page.getByRole("note")).toContainText("the text below is still in the file");
    const covered = fileOf(await runTool(page, "Save PDF"));
    expect(pdftotext(covered.buf, 1)).toContain("Synthetic text");

    await openWithFiles(page, "/en/edit-pdf", ["document-1page.pdf"]);
    await fit(page, "Zoom out");
    await tool(page, "Cover");
    await drag(page, [20, 20], [575, 300]);
    await tool(page, "Select");
    const p = await at(page, 300, 150);
    await page.mouse.click(p.x, p.y);
    await page.getByLabel(/Really hide/).check();
    const hidden = fileOf(await runTool(page, "Save PDF"));
    expect(pdftotext(hidden.buf, 1).trim()).toBe("");
    const info = await inspectPdf(hidden.buf);
    expect(info.sizes).toEqual(["595×842"]);
    expect(info.images).toBe(1);
  });
});
