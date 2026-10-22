// Regenerates the PNG app icons from src/app/icon.svg (run: node scripts/brand/icons.mjs).
// The Apple touch icon is full-bleed (iOS rounds the corners itself).
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile(new URL("../../src/app/icon.svg", import.meta.url), "utf8");
const fullBleed = svg.replace('rx="8"', 'rx="0"');

const targets = [
  { file: "src/app/apple-icon.png", size: 180, source: fullBleed },
  { file: "public/icon-192.png", size: 192, source: svg },
  { file: "public/icon-512.png", size: 512, source: svg },
];
for (const { file, size, source } of targets) {
  await sharp(Buffer.from(source), { density: (72 * size) / 32 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(new URL(`../../${file}`, import.meta.url).pathname);
  console.log(`${file} (${size}px)`);
}
