// QR tools: the generated image is decoded back from its pixels in the test
// (sharp + jsQR, not the app's generator), and the reader runs on fixtures
// that include a skewed, noisy photo and an inverted code.
import type { Page } from "@playwright/test";
import jsQR from "jsqr";
import sharp from "sharp";
import { expect, fileOf, fixturePath, inspectImage, readText, runTool, test, toolAlert, waitForResult } from "./support";

const decode = async (buf: Buffer) => {
  const { data, info } = await sharp(buf, { density: 300 }).flatten({ background: "#ffffff" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
};
const choose = (page: Page, label: string) => page.locator("label").filter({ hasText: label }).first().click();

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "QR tools must not call the server").toEqual([]);
});

test.describe("tool: qr-generator", () => {
  test("text → PNG of the chosen size that decodes to the same text", async ({ page }) => {
    await page.goto("/es/generador-codigo-qr", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Crear código QR", exact: true })).toBeDisabled();
    await page.getByRole("textbox", { name: "Texto o enlace" }).fill("https://fileflect.example/es?q=café&n=1");
    await choose(page, "512 px");
    const out = fileOf(await runTool(page, "Crear código QR"));
    expect(out.name).toBe("qr.png");
    const info = await inspectImage(out.buf);
    expect(info.format).toBe("png");
    expect(info.width).toBe(info.height);
    expect(Math.abs(info.width - 512)).toBeLessThan(40);
    expect(await decode(out.buf)).toBe("https://fileflect.example/es?q=café&n=1");
    await expect(page.locator("main img[alt='qr.png']")).toBeVisible();
  });

  test("Wi-Fi → SVG that renders and decodes to the Wi-Fi payload", async ({ page }) => {
    await page.goto("/en/qr-code-generator", { waitUntil: "networkidle" });
    await choose(page, "Wi-Fi");
    await page.getByRole("textbox", { name: "Network name (SSID)" }).fill("Casa;Ana");
    await page.getByRole("textbox", { name: "Password" }).fill("s3cret:1");
    await choose(page, "SVG (vector)");
    await choose(page, "Maximum (30%)");
    const out = fileOf(await runTool(page, "Create QR code"));
    expect(out.name).toBe("qr.svg");
    expect(readText(out.buf)).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(await decode(out.buf)).toBe("WIFI:T:WPA;S:Casa\x5c;Ana;P:s3cret\x5c:1;;");
  });

  test("contact → vCard, and a low-contrast warning", async ({ page }) => {
    await page.goto("/pt/gerador-de-qr-code", { waitUntil: "networkidle" });
    await choose(page, "Contato");
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Ana");
    await page.getByRole("textbox", { name: "Telefone" }).fill("+55 11 5555-0000");
    await page.locator('input[type="color"]').first().fill("#eeeeee");
    await expect(page.getByText("Com tão pouco contraste")).toBeVisible();
    await page.locator('input[type="color"]').first().fill("#000000");
    const out = fileOf(await runTool(page, "Criar QR code"));
    expect((await decode(out.buf))?.split("\r\n")).toEqual(["BEGIN:VCARD", "VERSION:3.0", "N:;Ana;;;", "FN:Ana", "TEL;TYPE=CELL:+55 11 5555-0000", "END:VCARD"]);
  });
});

test.describe("tool: qr-reader", () => {
  test("a skewed, noisy photo", async ({ page }) => {
    await page.goto("/es/leer-codigo-qr", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles(fixturePath("qr-photo.jpg"));
    const out = fileOf(await runTool(page, "Leer código QR"));
    expect(out.name).toBe("qr-photo.txt");
    expect(readText(out.buf)).toBe("WIFI:T:WPA;S:Café 5G;P:secreto123;;");
    await expect(page.getByRole("textbox", { name: "Vista previa" })).toHaveValue("WIFI:T:WPA;S:Café 5G;P:secreto123;;");
  });

  test("a batch with an inverted code, a picture without a code and a damaged file", async ({ page }) => {
    await page.goto("/es/leer-codigo-qr", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles(["qr.png", "qr-inverted.png", "image.png", "corrupt/truncated.png"].map(fixturePath));
    await page.getByRole("button", { name: "Leer código QR", exact: true }).click();
    const items = page.locator("main ul").filter({ has: page.locator("a[download]") }).locator("li");
    await expect(items).toHaveCount(4, { timeout: 30_000 });
    const links = page.locator("main a[download]");
    await expect(links).toHaveCount(2);
    expect(readText(fileOf(await waitForResult(page, links.nth(0), toolAlert(page))).buf)).toBe("https://fileflect.example/qr-test?ok=1");
    expect(readText(fileOf(await waitForResult(page, links.nth(1), toolAlert(page))).buf)).toBe("Olá, 中文 ✓ 123");
    await expect(items.nth(2)).toContainText("No encontramos un código QR legible");
    await expect(items.nth(3)).toContainText("El archivo está dañado");
    await expect(items.nth(3)).not.toContainText("Descargar");
  });
});
