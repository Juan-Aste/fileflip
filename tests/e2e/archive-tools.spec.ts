// Create ZIP / TAR / TAR.GZ: outputs are opened with fflate and the system's
// `tar`, and every file must come back byte for byte.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { expect, fileOf, fixturePath, openWithFiles, runTool, test, unzipEntries } from "./support";

const inputs = ["photo.jpg", "document.pdf", "data.json", "corrupt/truncated.pdf"];
const original = (name: string) => readFileSync(fixturePath(name));

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "archives are built in the browser").toEqual([]);
});

/** Extracts with the system's tar and returns name → bytes. */
function untar(buf: Buffer, gzip: boolean): Record<string, Buffer> {
  const dir = mkdtempSync(join(tmpdir(), "e2e-tar-"));
  try {
    writeFileSync(join(dir, "in"), buf);
    execFileSync("mkdir", [join(dir, "x")]);
    execFileSync("tar", [gzip ? "-xzf" : "-xf", join(dir, "in"), "-C", join(dir, "x")]);
    return Object.fromEntries(readdirSync(join(dir, "x")).map((n) => [n, readFileSync(join(dir, "x", n))]));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test.describe("tool: create-archive", () => {
  test("ZIP with a custom name keeps every file, even a damaged one, byte for byte", async ({ page }) => {
    await openWithFiles(page, "/es/crear-zip", inputs);
    await page.getByLabel("Nombre del archivo (opcional)").fill("mis archivos.zip");
    const out = fileOf(await runTool(page, "Crear archivo"));
    expect(out.name).toBe("mis archivos.zip");
    const entries = unzipEntries(out.buf);
    expect(entries.map((e) => e.name).sort()).toEqual(inputs.map((n) => basename(n)).sort());
    for (const input of inputs) expect(entries.find((e) => e.name === basename(input))!.data.equals(original(input))).toBe(true);
  });

  test("TAR.GZ at maximum compression, extracted by the system's tar", async ({ page }) => {
    await openWithFiles(page, "/en/create-zip", inputs);
    await page.locator("label").filter({ hasText: /^TAR\.GZ$/ }).click();
    await page.locator("label").filter({ hasText: "Maximum (slower)" }).click();
    const out = fileOf(await runTool(page, "Create archive"));
    expect(out.name).toBe("archive.tar.gz");
    expect([out.buf[0], out.buf[1]]).toEqual([0x1f, 0x8b]);
    const files = untar(out.buf, true);
    expect(Object.keys(files).sort()).toEqual(inputs.map((n) => basename(n)).sort());
    for (const input of inputs) expect(files[basename(input)]!.equals(original(input))).toBe(true);
  });

  test("TAR (no compression options), and the same name twice", async ({ page }) => {
    await openWithFiles(page, "/fr/creer-zip", ["photo.jpg", "data.json"]);
    await page.locator('input[type="file"]').first().setInputFiles(fixturePath("photo.jpg"));
    await page.locator("label").filter({ hasText: /^TAR$/ }).click();
    await expect(page.getByText("Compression", { exact: true })).toHaveCount(0);
    const out = fileOf(await runTool(page, "Créer l’archive"));
    expect(out.name).toBe("archive.tar");
    expect(out.buf.length % 512).toBe(0);
    const files = untar(out.buf, false);
    expect(Object.keys(files).sort()).toEqual(["data.json", "photo (1).jpg", "photo.jpg"]);
    expect(files["photo (1).jpg"]!.equals(original("photo.jpg"))).toBe(true);
  });
});
