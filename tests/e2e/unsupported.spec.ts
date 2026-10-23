// Browsers without the APIs a tool needs (WebCodecs, Worker, WebAssembly,
// OffscreenCanvas): the tool must say so in a clear, translated message, or
// still work, but never fail silently or hang (6B.3 in PLAN.md). The APIs are
// removed before the page's scripts run.
import { expect, openWithFiles, test, toolAlert } from "./support";

const apis = {
  webCodecs: ["VideoEncoder", "VideoDecoder", "AudioEncoder", "AudioDecoder", "EncodedVideoChunk", "EncodedAudioChunk", "VideoFrame", "AudioData"],
  legacy: ["Worker", "WebAssembly", "OffscreenCanvas", "VideoEncoder", "VideoDecoder", "AudioEncoder", "AudioDecoder"],
} as const;

interface Case {
  family: string;
  path: string;
  files: string[];
  action: string;
  /** Scenarios to run; `legacy` = a browser with none of these APIs. */
  without: (keyof typeof apis)[];
}

const cases: Case[] = [
  { family: "image", path: "/es/comprimir-imagen", files: ["photo.jpg"], action: "Comprimir imágenes", without: ["legacy"] },
  { family: "pdf", path: "/es/unir-pdf", files: ["document.pdf", "document-1page.pdf"], action: "Unir PDF", without: ["legacy"] },
  { family: "sheet", path: "/es/convertir-hoja-de-calculo", files: ["workbook.xlsx"], action: "Convertir", without: ["legacy"] },
  { family: "data", path: "/es/json-a-csv", files: ["data.json"], action: "Convertir a CSV", without: ["legacy"] },
  { family: "markup", path: "/es/markdown-a-html", files: ["document.md"], action: "Convertir a HTML", without: ["legacy"] },
  { family: "ebook", path: "/es/convertir-epub", files: ["book.epub"], action: "Convertir libro", without: ["legacy"] },
  { family: "ocr", path: "/en/image-to-text", files: ["ocr-en.jpg"], action: "Extract text", without: ["legacy"] },
  { family: "archive", path: "/es/extraer-zip", files: ["archive.zip"], action: "Extraer archivos", without: ["legacy"] },
  { family: "model", path: "/en/3d-model-converter", files: ["cube.stl"], action: "Convert model", without: ["legacy"] },
  { family: "cad", path: "/en/dxf-converter", files: ["plan.dxf"], action: "Convert drawing", without: ["legacy"] },
  { family: "audio", path: "/en/audio-converter", files: ["audio.mp3"], action: "Convert audio", without: ["webCodecs", "legacy"] },
  { family: "video", path: "/en/video-converter", files: ["video.webm"], action: "Convert video", without: ["webCodecs", "legacy"] },
  { family: "gif", path: "/en/video-to-gif", files: ["video.webm"], action: "Create GIF", without: ["webCodecs"] },
];

for (const c of cases) {
  for (const scenario of c.without) {
    test(`${c.family} without ${scenario}: a clear message or a result, never silence`, async ({ page }) => {
      await page.addInitScript((names: readonly string[]) => {
        for (const name of names) delete (globalThis as Record<string, unknown>)[name];
      }, apis[scenario]);
      await openWithFiles(page, c.path, c.files);
      const main = page.locator("main");
      const action = page.getByRole("button", { name: c.action, exact: true });
      const notice = toolAlert(page).or(main.locator("[aria-live]")).filter({ hasText: /navegador|browser/i }).first();
      // The action enables once the file is read (a video waits for its metadata).
      await expect(action.and(page.locator(":enabled")).or(notice).first()).toBeVisible({ timeout: 15_000 });
      // Either the page already says the browser can't do it (and disables the action)...
      if (!(await action.isVisible()) || (await action.isDisabled())) {
        test.info().annotations.push({ type: "outcome", description: `notice: ${await notice.innerText()}` });
        return;
      }
      // ...or running the tool ends, in time, with a result or a message.
      await action.click();
      const done = main.locator("a[download]").or(page.getByRole("button", { name: /^(Descargar todo|Download all)/ }));
      await expect(done.or(toolAlert(page).filter({ hasText: /\w/ })).first()).toBeVisible({ timeout: 30_000 });
      if (await done.first().isVisible()) return void test.info().annotations.push({ type: "outcome", description: "result" });
      const message = (await toolAlert(page).first().innerText()).trim();
      test.info().annotations.push({ type: "outcome", description: `error: ${message}` });
      // The browser's fault, said as such: not "couldn't convert" or a blame on the file or format (B-07, B-08).
      expect(message).toMatch(/navegador no puede convertir|browser can't convert/);
      // Not stuck: the action can be tried again (or the page offers to start over).
      await expect(action.or(page.getByRole("button", { name: /^(Empezar de nuevo|Start over)$/ })).first()).toBeEnabled();
    });
  }
}
