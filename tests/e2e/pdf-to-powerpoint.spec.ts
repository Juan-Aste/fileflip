// PDF to PowerPoint: the deck is unzipped and opened by LibreOffice (an
// independent reader), which must find one slide per page.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { expect, fileOf, openWithFiles, runTool, test } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "PDF to PowerPoint must not call the server").toEqual([]);
});

const soffice = ["soffice", "libreoffice"].find((bin) => spawnSync(bin, ["--version"]).status === 0);

test.describe("tool: pdf-to-powerpoint", () => {
  test("one picture slide per page, the size of the page @xb", async ({ page }) => {
    await openWithFiles(page, "/es/pdf-a-powerpoint", ["document.pdf"]);
    await expect(page.getByText("el texto no se puede editar")).toBeVisible();
    const out = fileOf(await runTool(page, "Convertir a PowerPoint"));
    expect(out.name).toBe("document.pptx");
    const files = unzipSync(new Uint8Array(out.buf));
    const slides = Object.keys(files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slides).toHaveLength(3);
    // document.pdf is A4: 595×842 pt.
    expect(strFromU8(files["ppt/presentation.xml"]!)).toContain('<p:sldSz cx="7556500" cy="10693400"/>');
    for (let i = 1; i <= 3; i++) expect(files[`ppt/media/image${i}.jpeg`]!.length).toBeGreaterThan(5000);

    if (!soffice) return;
    const dir = mkdtempSync(join(tmpdir(), "pptx-e2e-"));
    writeFileSync(join(dir, "deck.pptx"), out.buf);
    execFileSync(soffice, [`-env:UserInstallation=file://${dir}/lo`, "--headless", "--convert-to", "pdf", "--outdir", dir, join(dir, "deck.pptx")], { stdio: "ignore", timeout: 120_000 });
    expect(execFileSync("pdfinfo", [join(dir, "deck.pdf")], { encoding: "utf8" })).toMatch(/Pages:\s+3/);
  });
});
