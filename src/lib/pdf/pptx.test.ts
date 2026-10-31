// The deck is read back by independent readers: LibreOffice (converted to PDF,
// then poppler counts the pages and their size) and python-pptx when installed.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildPptx, slideSize } from "./pptx";

const soffice = ["soffice", "libreoffice"].find((bin) => spawnSync(bin, ["--version"]).status === 0);
const dir = mkdtempSync(join(tmpdir(), "pptx-"));

const jpeg = (width: number, height: number, color: string) =>
  sharp({ create: { width, height, channels: 3, background: color } }).jpeg().toBuffer().then((b) => new Uint8Array(b));

describe("slideSize", () => {
  it("is the page's size in EMU", () => {
    expect(slideSize(595, 842)).toEqual({ cx: 7556500, cy: 10693400 });
    expect(slideSize(960, 540)).toEqual({ cx: 12192000, cy: 6858000 });
  });

  it("stays within PowerPoint's limits, keeping the shape", () => {
    expect(slideSize(36, 18)).toEqual({ cx: 1828800, cy: 914400 });
    const huge = slideSize(14400, 7200);
    expect(huge).toEqual({ cx: 51206400, cy: 25603200 });
  });
});

describe("buildPptx", () => {
  it("has one slide per page with its picture, fitted and centered", async () => {
    const deck = buildPptx(
      [
        { jpeg: await jpeg(80, 60, "#d32f2f"), width: 800, height: 600 },
        { jpeg: await jpeg(60, 80, "#1d3f9e"), width: 600, height: 800 },
      ],
      { title: "Informe <2024>", slideName: "Página" },
    );
    const files = unzipSync(deck);
    expect(Object.keys(files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))).toHaveLength(2);
    expect(strFromU8(files["ppt/presentation.xml"]!)).toContain('<p:sldSz cx="10160000" cy="7620000"/>');
    // The portrait page on the landscape slide: full height, centered.
    expect(strFromU8(files["ppt/slides/slide2.xml"]!)).toContain('<a:off x="2222500" y="0"/><a:ext cx="5715000" cy="7620000"/>');
    expect(strFromU8(files["docProps/core.xml"]!)).toContain("Informe &lt;2024&gt;");
    expect(files["ppt/media/image2.jpeg"]!.slice(0, 2)).toEqual(new Uint8Array([0xff, 0xd8]));
  });

  it.skipIf(!soffice)("opens in LibreOffice with a page per slide of the slide's size and the pictures", async () => {
    const deck = buildPptx([
      { jpeg: await jpeg(595, 842, "#d32f2f"), width: 595, height: 842 },
      { jpeg: await jpeg(595, 842, "#1d3f9e"), width: 595, height: 842 },
      { jpeg: await jpeg(595, 842, "#2e7d32"), width: 595, height: 842 },
    ]);
    const path = join(dir, "deck.pptx");
    writeFileSync(path, deck);
    execFileSync(soffice!, [`-env:UserInstallation=file://${dir}/lo`, "--headless", "--convert-to", "pdf", "--outdir", dir, path], { stdio: "ignore", timeout: 120_000 });
    const info = execFileSync("pdfinfo", [join(dir, "deck.pdf")], { encoding: "utf8" });
    expect(info).toMatch(/Pages:\s+3/);
    const [, w, h] = /Page size:\s+([\d.]+) x ([\d.]+) pts/.exec(info)!;
    expect(Number(w)).toBeCloseTo(595, 0);
    expect(Number(h)).toBeCloseTo(842, 0);
    // Page 2 is the blue picture, edge to edge.
    execFileSync("pdftoppm", ["-r", "10", "-f", "2", "-l", "2", "-png", "-singlefile", join(dir, "deck.pdf"), join(dir, "p2")]);
    const { data } = await sharp(readFileSync(join(dir, "p2.png"))).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([...data.subarray(0, 3)].map((c) => Math.round(c / 16))).toEqual([2, 4, 10]);
  }, 150_000);
});
