// One-off icon generator for the PWA manifest. Rerun with `node scripts/generate-icons.mjs`
// whenever public/icons/icon-source.svg or icon-maskable-source.svg change.
import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(dir, "..", "public", "icons");

const standard = readFileSync(path.join(iconsDir, "icon-source.svg"));
const maskable = readFileSync(path.join(iconsDir, "icon-maskable-source.svg"));

const targets = [
  { src: standard, size: 512, out: "icon-512.png" },
  { src: standard, size: 192, out: "icon-192.png" },
  { src: standard, size: 180, out: "apple-touch-icon.png" },
  { src: standard, size: 32, out: "favicon-32.png" },
  { src: standard, size: 16, out: "favicon-16.png" },
  { src: maskable, size: 512, out: "icon-maskable-512.png" },
  { src: maskable, size: 192, out: "icon-maskable-192.png" },
];

for (const t of targets) {
  await sharp(t.src, { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toFile(path.join(iconsDir, t.out));
  console.log(`Wrote ${t.out} (${t.size}x${t.size})`);
}
