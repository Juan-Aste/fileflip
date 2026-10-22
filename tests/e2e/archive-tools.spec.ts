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

const tree = ["docs/readme.txt", "docs/año 2024/notas — 中文.txt", "images/image.png", "document-1page.pdf", "empty.txt"];

test.describe("tool: extract-archive", () => {
  test("ZIP → each file with its folder path; “download all” rebuilds the folders", async ({ page }) => {
    await openWithFiles(page, "/es/extraer-zip", ["archive.zip"]);
    await page.getByRole("button", { name: "Extraer archivos", exact: true }).click();
    const links = page.locator("main li a[download]");
    await expect(links).toHaveCount(5, { timeout: 45_000 });
    await expect(page.locator("main")).toContainText("docs/año 2024/notas — 中文.txt");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Descargar todo/ }).click()]);
    expect(download.suggestedFilename()).toBe("fileflect-extracted.zip");
    const entries = unzipEntries(readFileSync((await download.path())!));
    expect(entries.map((e) => e.name).sort()).toEqual([...tree].sort());
    expect(entries.find((e) => e.name === "images/image.png")!.data.equals(original("image.png"))).toBe(true);
    expect(entries.find((e) => e.name === "docs/readme.txt")!.data.toString("utf8")).toContain("ñandú 中文");
  });

  test("TAR.GZ and TAR together: one folder per archive, files byte for byte", async ({ page }) => {
    await openWithFiles(page, "/en/extract-zip", ["archive.tar.gz", "text.txt.gz"]);
    await page.getByRole("button", { name: "Extract files", exact: true }).click();
    const links = page.locator("main li a[download]");
    await expect(links).toHaveCount(7, { timeout: 45_000 });
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Download all/ }).click()]);
    const entries = unzipEntries(readFileSync((await download.path())!));
    expect(entries.map((e) => e.name)).toContain("archive/images/image.png");
    expect(entries.find((e) => e.name === "text.txt/texto.txt")!.data.equals(original("text.txt"))).toBe(true);
    expect(entries.find((e) => e.name === "archive/document-1page.pdf")!.data.equals(original("document-1page.pdf"))).toBe(true);
    expect(entries.filter((e) => e.name.startsWith("archive/"))).toHaveLength(6);
  });

  test("hostile archives: zip slip paths fixed, links skipped, bombs and damage stopped with clear errors", async ({ page }) => {
    await openWithFiles(page, "/es/extraer-zip", [
      "corrupt/zip-slip.zip",
      "corrupt/links.tar",
      "corrupt/bomb-declared.zip",
      "corrupt/lying-size.zip",
      "corrupt/encrypted.zip",
      "corrupt/truncated.zip",
    ]);
    await page.getByRole("button", { name: "Extraer archivos", exact: true }).click();
    const links = page.locator("main li a[download]");
    await expect(links).toHaveCount(8, { timeout: 45_000 });
    const main = page.locator("main");
    await expect(main).toContainText("zip-slip/evil.txt");
    await expect(main).toContainText("zip-slip/Windows/evil-win.txt");
    for (const name of await links.allInnerTexts()) expect(name).not.toContain("..");
    await expect(main).toContainText("Se omitieron 4 enlaces o archivos especiales por seguridad.");
    await expect(main).toContainText("bomba ZIP");
    await expect(main).toContainText("tiene contraseña");
    await expect(main).toContainText("dañado");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Descargar todo/ }).click()]);
    const names = unzipEntries(readFileSync((await download.path())!)).map((e) => e.name);
    expect(names.sort()).toEqual(
      ["zip-slip/evil.txt", "zip-slip/etc/evil-abs.txt", "zip-slip/Windows/evil-win.txt", "zip-slip/ok/evil-mid.txt", "zip-slip/evil-back.txt", "zip-slip/safe.txt", "links/escape.txt", "links/safe.txt"].sort(),
    );
  });
});
