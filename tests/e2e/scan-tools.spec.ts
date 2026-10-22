// "Scan document": a synthetic phone photo of a tilted sheet (drawn as SVG and
// rendered by sharp, independent of the engine), corners dragged with the
// mouse, and the PDF read back with pdf-lib and rasterized with poppler.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import sharp from "sharp";
import { expect, fileOf, fixturePath, inspectPdf, runTool, test } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "scanning must not call the server").toEqual([]);
});

/** The sheet's corners in the 1000 × 1300 photo: top left, top right, bottom right, bottom left. */
const SHEET = [[220, 150], [780, 190], [820, 1150], [170, 1100]] as const;
/**
 * Page coordinates (0–1) → photo, through the perspective (homography) that
 * takes the unit square to the sheet's corners. Solved here by Gaussian
 * elimination, separately from the engine's own solver.
 */
const toPhoto = (() => {
  const unit = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const rows = unit.flatMap(([x, y], i) => {
    const [u, v] = SHEET[i]!;
    return [
      [x!, y!, 1, 0, 0, 0, -u * x!, -u * y!, u],
      [0, 0, 0, x!, y!, 1, -v * x!, -v * y!, v],
    ];
  });
  for (let c = 0; c < 8; c++) {
    const p = rows.slice(c).reduce((best, r, i) => (Math.abs(r[c]!) > Math.abs(rows[best]![c]!) ? c + i : best), c);
    [rows[c], rows[p]] = [rows[p]!, rows[c]!];
    for (let r = 0; r < 8; r++) if (r !== c) rows[r] = rows[r]!.map((v, k) => v - (rows[r]![c]! / rows[c]![c]!) * rows[c]![k]!);
  }
  const h = [...rows.map((r, i) => r[8]! / r[i]!), 1];
  return (u: number, v: number) => {
    const w = h[6]! * u + h[7]! * v + h[8]!;
    return [(h[0]! * u + h[1]! * v + h[2]!) / w, (h[3]! * u + h[4]! * v + h[5]!) / w];
  };
})();
/** Four text lines, 3 % of the page tall, at v = 0.2, 0.4, 0.6, 0.8 from u = 0.1 to 0.9. */
const LINES = [0.2, 0.4, 0.6, 0.8];

async function sheetPhoto(): Promise<Buffer> {
  const poly = (pts: number[][], fill: string) => `<polygon points="${pts.map((p) => p.join(",")).join(" ")}" fill="${fill}"/>`;
  const bars = LINES.map((v) => poly([toPhoto(0.1, v), toPhoto(0.9, v), toPhoto(0.9, v + 0.03), toPhoto(0.1, v + 0.03)], "#111"));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1300"><rect width="1000" height="1300" fill="#008c00"/>${poly(SHEET.map((p) => [...p]), "#f4f4f0")}${bars.join("")}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

/** Drags a corner handle to a point of the photo (in photo pixels). */
async function dragCorner(page: Page, name: RegExp, [x, y]: readonly number[]) {
  const img = page.locator("main img").first();
  // The mouse only reaches what is on screen: bring the whole photo into view first.
  await img.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  const box = (await img.boundingBox())!;
  const handle = (await page.getByRole("button", { name }).boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + (x! / 1000) * box.width, box.y + (y! / 1300) * box.height, { steps: 6 });
  await page.mouse.up();
}

const hasPoppler = (() => {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

/** The PDF's first page rasterized at 72 dpi (1 px per point). */
function rasterize(pdf: Buffer) {
  const dir = mkdtempSync(join(tmpdir(), "scan-"));
  try {
    writeFileSync(join(dir, "in.pdf"), pdf);
    execFileSync("pdftoppm", ["-r", "72", "-png", "-singlefile", "-f", "1", "-l", "1", join(dir, "in.pdf"), join(dir, "out")]);
    return sharp(readFileSync(join(dir, "out.png"))).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test.describe("tool: scan-document", () => {
  test("corners dragged onto a tilted sheet → a straight A4 page: text lines where they belong, no table left", async ({ page }) => {
    await page.goto("/en/scan-document", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles({ name: "contract.jpg", mimeType: "image/jpeg", buffer: await sheetPhoto() });
    await expect(page.getByRole("button", { name: "Top left corner (60, 78)" })).toBeVisible({ timeout: 20_000 });
    const names = [/^Top left corner/, /^Top right corner/, /^Bottom right corner/, /^Bottom left corner/];
    for (const [i, name] of names.entries()) await dragCorner(page, name, SHEET[i]!);
    // Within a couple of photo pixels of where they were dropped.
    for (const [i, name] of names.entries()) {
      const label = (await page.getByRole("button", { name }).getAttribute("aria-label"))!;
      const [x, y] = label.match(/\((\d+), (\d+)\)/)!.slice(1).map(Number);
      expect(Math.abs(x! - SHEET[i]![0]) + Math.abs(y! - SHEET[i]![1]), label).toBeLessThan(6);
    }
    // The keyboard moves a corner too (1/200 of the photo per press), and back.
    const tl = page.getByRole("button", { name: /^Top left corner/ });
    const before = await tl.getAttribute("aria-label");
    await tl.focus();
    await page.keyboard.press("ArrowRight");
    await expect(tl).not.toHaveAttribute("aria-label", before!);
    await page.keyboard.press("ArrowLeft");
    await expect(tl).toHaveAttribute("aria-label", before!);

    await page.getByText("Color", { exact: true }).click();
    const out = fileOf(await runTool(page, "Create PDF"));
    expect(out.name).toBe("contract.pdf");
    await expect(page.getByText("PDF with 1 page.")).toBeVisible();
    expect(await inspectPdf(out.buf)).toMatchObject({ pages: 1, sizes: ["595×842"], images: 1 });
    test.skip(!hasPoppler, "pdftoppm (poppler) is not installed");
    const { data, info } = await rasterize(out.buf);
    // The straightened page (about 606 × 956 px) fills the height of the A4 page, centered.
    const height = info.height;
    const width = (height * ((560.2 + 650.0) / 2)) / ((950.3 + 960.8) / 2);
    const at = (u: number, v: number) => {
      const o = (Math.round(v * (height - 1)) * info.width + Math.round((info.width - width) / 2 + u * width)) * 3;
      return [data[o]!, data[o + 1]!, data[o + 2]!];
    };
    const dark = (p: number[]) => p.every((c) => c < 90);
    const paper = (p: number[]) => p.every((c) => c > 200);
    for (const v of LINES) {
      expect(dark(at(0.5, v + 0.015)), `text line at ${v}`).toBe(true);
      expect(paper(at(0.5, v + 0.1)), `paper below the line at ${v}`).toBe(true);
    }
    // Near each edge and corner: paper, not the green table.
    for (const [u, v] of [[0.03, 0.03], [0.97, 0.03], [0.97, 0.97], [0.03, 0.97], [0.5, 0.02], [0.98, 0.5], [0.5, 0.98], [0.02, 0.5]]) {
      expect(paper(at(u!, v!)), `paper at ${u}, ${v}`).toBe(true);
    }
  });

  test("two photos in black and white → a two-page PDF; a damaged photo is reported", async ({ page }) => {
    await page.goto("/es/escanear-documento", { waitUntil: "networkidle" });
    const photo = await sheetPhoto();
    await page.locator('input[type="file"]').setInputFiles([
      { name: "p1.jpg", mimeType: "image/jpeg", buffer: photo },
      { name: "p2.jpg", mimeType: "image/jpeg", buffer: photo },
    ]);
    await expect(page.getByRole("button", { name: "Página 2" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Esquina superior izquierda/ })).toBeVisible({ timeout: 20_000 });
    for (const [i, name] of [/^Esquina superior izquierda/, /^Esquina superior derecha/, /^Esquina inferior derecha/, /^Esquina inferior izquierda/].entries()) {
      await dragCorner(page, name, SHEET[i]!);
    }
    const out = fileOf(await runTool(page, "Crear PDF"));
    expect(out.name).toBe("p1.pdf");
    await expect(page.getByText("PDF con 2 páginas.")).toBeVisible();
    expect(await inspectPdf(out.buf)).toMatchObject({ pages: 2, sizes: ["595×842"] });
    if (hasPoppler) {
      const { data, info } = await rasterize(out.buf);
      // Pure black and white: almost every pixel is black or white.
      let mid = 0;
      for (let i = 0; i < data.length; i += 3) if (data[i]! > 60 && data[i]! < 195) mid++;
      expect(mid / (info.width * info.height), "grey pixels").toBeLessThan(0.02);
    }

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').setInputFiles(fixturePath("corrupt/truncated.jpg"));
    await expect(page.locator("main")).toContainText("dañado o incompleto", { timeout: 20_000 });
  });
});
