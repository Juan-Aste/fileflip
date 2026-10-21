// Sign PDF: draw or upload a signature, place it with the pointer or the
// keyboard, and check where the image landed by replaying the page's drawing
// operators with pdf.js (not the app's code).
import type { Page } from "@playwright/test";
import sharp from "sharp";
import { expect, fileOf, inspectPdf, openWithFiles, runTool, test } from "./support";

/** Images drawn on each page: center and width as fractions of the visible page (origin top-left). */
async function placedImages(buf: Buffer) {
  const { getDocument, OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  const out: { page: number; x: number; y: number; width: number }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const ops = await page.getOperatorList();
    const stack: number[][] = [];
    let m = [1, 0, 0, 1, 0, 0];
    const mul = (a: number[], b: number[]) => [
      a[0]! * b[0]! + a[1]! * b[2]!,
      a[0]! * b[1]! + a[1]! * b[3]!,
      a[2]! * b[0]! + a[3]! * b[2]!,
      a[2]! * b[1]! + a[3]! * b[3]!,
      a[4]! * b[0]! + a[5]! * b[2]! + b[4]!,
      a[4]! * b[1]! + a[5]! * b[3]! + b[5]!,
    ];
    ops.fnArray.forEach((fn, i) => {
      if (fn === OPS.save) stack.push(m);
      else if (fn === OPS.restore) m = stack.pop() ?? [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform) m = mul(ops.argsArray[i] as number[], m);
      else if (fn === OPS.paintImageXObject) {
        const pt = (u: number, v: number) => viewport.convertToViewportPoint(u * m[0]! + v * m[2]! + m[4]!, u * m[1]! + v * m[3]! + m[5]!) as number[];
        const [x0, y0] = pt(0, 0) as [number, number];
        const [x1, y1] = pt(1, 1) as [number, number];
        out.push({ page: n - 1, x: (x0 + x1) / 2 / viewport.width, y: (y0 + y1) / 2 / viewport.height, width: Math.abs(x1 - x0) / viewport.width });
      }
    });
  }
  return out;
}

async function drawSignature(page: Page) {
  const pad = page.getByRole("img", { name: "Recuadro para dibujar la firma" });
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.7);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(box.x + box.width * (0.1 + i * 0.04), box.y + box.height * (0.7 - Math.sin(i / 3) * 0.4));
  await page.mouse.up();
}

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "signing must not call the server").toEqual([]);
});

test.describe("tool: sign-pdf", () => {
  test("drawn signature placed by tapping page 2", async ({ page }) => {
    await openWithFiles(page, "/es/firmar-pdf", ["document.pdf"]);
    await expect(page.getByText(/^Esta firma es una imagen visible.*No es una firma digital certificada/)).toBeVisible();
    const use = page.getByRole("button", { name: "Usar esta firma" });
    await expect(use).toBeDisabled();
    await drawSignature(page);
    await use.click();
    await page.getByRole("button", { name: "Página siguiente" }).click();
    await expect(page.getByText("Página 2 de 3")).toBeVisible();
    const preview = page.getByTestId("sign-preview");
    await expect(preview.getByRole("img", { name: "Página 2" })).toBeVisible();
    await preview.scrollIntoViewIfNeeded();
    const box = (await preview.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.8);
    const out = fileOf(await runTool(page, "Firmar y descargar"));
    expect(out.name).toBe("document-signed.pdf");
    const [image, ...rest] = await placedImages(out.buf);
    expect(rest).toEqual([]);
    expect(image!.page).toBe(1);
    expect(image!.x).toBeCloseTo(0.25, 1);
    expect(image!.y).toBeCloseTo(0.8, 1);
    expect(image!.width).toBeCloseTo(0.3, 2);
    // The page's own content is still there.
    expect((await inspectPdf(out.buf)).labels).toEqual(["1 of 3", "2 of 3", "3 of 3"]);
  });

  test("uploaded photo on white paper, moved with the keyboard and resized", async ({ page }) => {
    await openWithFiles(page, "/en/sign-pdf", ["document-1page.pdf"]);
    await page.getByText("Upload a photo or image").click();
    const photo = await sharp({ create: { width: 400, height: 150, channels: 3, background: "#f4f4f0" } })
      .composite([{ input: Buffer.from('<svg width="400" height="150"><path d="M20 110 C 90 10, 160 140, 380 40" stroke="#1a2a6c" stroke-width="8" fill="none"/></svg>') }])
      .jpeg()
      .toBuffer();
    await page.locator('input[type="file"]').nth(1).setInputFiles({ name: "firma.jpg", mimeType: "image/jpeg", buffer: photo });
    await page.getByRole("button", { name: "Use this signature" }).click();
    const handle = page.getByRole("slider", { name: "Signature on the page" });
    await expect(handle).toHaveAttribute("aria-valuetext", "70% from the left, 85% from the top");
    await handle.focus();
    for (let i = 0; i < 2; i++) await page.keyboard.press("Shift+ArrowLeft");
    await page.keyboard.press("ArrowUp");
    await expect(handle).toHaveAttribute("aria-valuetext", "60% from the left, 84% from the top");
    await page.getByLabel(/Signature size/).fill("50");
    const out = fileOf(await runTool(page, "Sign and download"));
    const [image] = await placedImages(out.buf);
    expect(image!.x).toBeCloseTo(0.6, 2);
    expect(image!.y).toBeCloseTo(0.84, 2);
    expect(image!.width).toBeCloseTo(0.5, 2);
    // PNG with a transparency mask: the paper is gone.
    expect((await inspectPdf(out.buf)).images).toBe(2);
  });

  test("a blank image is refused", async ({ page }) => {
    await openWithFiles(page, "/es/firmar-pdf", ["document-1page.pdf"]);
    await page.getByText("Subir una foto o imagen").click();
    const blank = await sharp({ create: { width: 200, height: 80, channels: 3, background: "#ffffff" } }).png().toBuffer();
    await page.locator('input[type="file"]').nth(1).setInputFiles({ name: "blank.png", mimeType: "image/png", buffer: blank });
    await page.getByRole("button", { name: "Usar esta firma" }).click();
    await expect(page.getByText("No encontramos ninguna firma")).toBeVisible();
  });
});
