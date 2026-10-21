// The format converter on the home page: every fixture to every output it
// offers, checked by decoding the downloaded file. The conversion API is
// blocked, so this measures the in-browser engines only.
import type { Page } from "@playwright/test";
import { expect, fileOf, fixturePath, inspectImage, test, unzipEntries, waitForResult } from "./support";

const imageOutputs = ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "ico", "pdf"];
// Same-format re-encoding is only offered where it compresses.
const recompressible = ["jpg", "png", "webp", "avif"];
const inputs: { file: string; from: string; size?: [number, number]; outputs?: string[]; pages?: number }[] = [
  { file: "image.jpg", from: "jpg", size: [160, 120] },
  { file: "image.png", from: "png", size: [160, 120] },
  { file: "image.webp", from: "webp", size: [160, 120] },
  { file: "image.avif", from: "avif", size: [160, 120] },
  { file: "image.gif", from: "gif", size: [160, 120] },
  { file: "image.bmp", from: "bmp", size: [160, 120] },
  { file: "image.tiff", from: "tiff", size: [160, 120] },
  { file: "image.ico", from: "ico", size: [64, 64] },
  { file: "photo.heic", from: "heic", size: [120, 80] },
  { file: "image.svg", from: "svg", size: [160, 120] },
  { file: "document.pdf", from: "pdf", outputs: ["jpg", "png"], pages: 3 },
];

/** Adds one file on a fresh home page and waits for its output picker. */
async function addFile(page: Page, file: string) {
  await page.goto("/es", { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(fixturePath(file));
  const row = page.locator("section li").first();
  await row.waitFor();
  await page.waitForFunction(() => !document.body.innerText.includes("Detectando"), null, { timeout: 15_000 });
  await page.locator('input[name="target"]').first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
  return row;
}

async function convert(page: Page, file: string, to: string) {
  const row = await addFile(page, file);
  const radio = page.locator(`input[name="target"][value="${to}"]`);
  await expect(radio, `${to} offered for ${file}`).toHaveCount(1);
  await radio.check({ force: true });
  await page.getByRole("button", { name: "Convertir", exact: true }).click();
  return waitForResult(page, row.locator("a[download]"), row.locator(".text-danger"), 60_000);
}

test.describe("tool: converter", () => {
  test.afterEach(({ serverCalls }) => {
    expect(serverCalls, "image conversions must not fall back to the server").toEqual([]);
  });

  for (const input of inputs) {
    const outputs = (input.outputs ?? imageOutputs).filter((to) => to !== input.from || recompressible.includes(to));
    for (const to of outputs) {
      test(`${input.from} → ${to}`, async ({ page }) => {
        const { buf } = fileOf(await convert(page, input.file, to));
        if (input.from === "pdf") {
          const images = await Promise.all(unzipEntries(buf).map((e) => inspectImage(e.data)));
          expect(images).toHaveLength(input.pages!);
          expect(images.every((i) => i.format === to)).toBe(true);
          return;
        }
        const info = await inspectImage(buf);
        expect(info.format).toBe(to);
        if (to === "pdf") expect(info.pages).toBe(1);
        // ICO is a square multi-size icon by design (fit inside, padded).
        else if (to === "ico") expect(info.width).toBe(info.height);
        else expect([info.width, info.height]).toEqual(input.size);
      });
    }
  }
});

test.describe("converter with corrupt files", () => {
  const corrupt = ["truncated.jpg", "truncated.png", "garbage.png", "text-as.jpg", "empty.png", "truncated.pdf", "garbage.pdf"];
  for (const name of corrupt) {
    test(`${name} is rejected or shows an error`, async ({ page }) => {
      const row = await addFile(page, `corrupt/${name}`);
      const targets = page.locator('input[name="target"]');
      if ((await row.innerText()).includes("no compatible") || (await targets.count()) === 0) return;
      await targets.first().check({ force: true });
      await page.getByRole("button", { name: "Convertir", exact: true }).click();
      const result = await waitForResult(page, row.locator("a[download]"), row.locator(".text-danger"), 60_000);
      expect(result.error, "must not produce a file").toBeTruthy();
    });
  }
});
