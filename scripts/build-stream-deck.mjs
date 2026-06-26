/**
 * Build script for the Stream Deck plugin.
 * Generates icon PNG files (pure Node.js, no external deps) then compiles the plugin.
 */

import { execSync } from "child_process";
import { createWriteStream, mkdirSync } from "fs";
import { deflateSync } from "zlib";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const pluginDir = path.join(rootDir, "stream-deck");
const imgsDir = path.join(
  pluginDir,
  "com.semaphore.streamdeck.sdPlugin",
  "imgs",
);

// ---------------------------------------------------------------------------
// Minimal pure-JS PNG encoder (no external dependencies)
// ---------------------------------------------------------------------------

/** CRC32 table (built once). */
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC32_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const payload = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(payload), 0);
  return Buffer.concat([len, payload, crcVal]);
}

/**
 * Encode a 144×144 RGBA pixel buffer as a PNG.
 * @param {Uint8Array} pixels - RGBA pixels, length = 144 * 144 * 4
 */
function encodePng(pixels) {
  const SIZE = 144;
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width, height, 8-bit depth, RGBA color type (6)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Raw image data: one filter byte (0 = None) per scanline + RGBA row
  const rowSize = 1 + SIZE * 4;
  const raw = Buffer.alloc(SIZE * rowSize);
  for (let y = 0; y < SIZE; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < SIZE; x++) {
      const src = (y * SIZE + x) * 4;
      const dst = y * rowSize + 1 + x * 4;
      raw[dst] = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = deflateSync(raw, { level: 6 });

  return Buffer.concat([
    PNG_SIG,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Build 144×144 RGBA pixels: a filled circle of the given color on a transparent background.
 * A thin dark ring separates the circle from the background for visibility on dark keys.
 */
function circlePixels(r, g, b) {
  const SIZE = 144;
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  const cx = SIZE / 2 - 0.5;
  const cy = SIZE / 2 - 0.5;
  const outerR = SIZE * 0.44;
  const innerR = SIZE * 0.40;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const i = (y * SIZE + x) * 4;

      if (dist <= innerR) {
        // Filled circle body
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = 255;
      } else if (dist <= outerR) {
        // Dark ring for definition
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
        pixels[i + 3] = Math.round(180 * (outerR - dist) / (outerR - innerR));
      }
      // else: transparent (already 0)
    }
  }
  return pixels;
}

// ---------------------------------------------------------------------------
// Generate all icons
// ---------------------------------------------------------------------------

const ICONS = {
  "green.png":    circlePixels(34,  197, 94),   // #22C55E
  "yellow.png":   circlePixels(251, 191, 36),   // #FBBF24
  "red.png":      circlePixels(239, 68,  68),   // #EF4444
  "unknown.png":  circlePixels(107, 114, 128),  // #6B7280 grey
  "action.png":   circlePixels(107, 114, 128),  // same as unknown for the manifest icon
  "category.png": circlePixels(107, 114, 128),
  "plugin.png":   circlePixels(107, 114, 128),
};

function generateIcons() {
  mkdirSync(imgsDir, { recursive: true });
  for (const [name, pixels] of Object.entries(ICONS)) {
    const pngBuf = encodePng(pixels);
    const dest = path.join(imgsDir, name);
    const ws = createWriteStream(dest);
    ws.write(pngBuf);
    ws.end();
    console.log(`  generated ${name} (${pngBuf.length} bytes)`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("▶ generating Stream Deck icons…");
generateIcons();

console.log("▶ installing Stream Deck plugin deps…");
execSync("npm install", { cwd: pluginDir, stdio: "inherit" });

console.log("▶ building Stream Deck plugin…");
execSync("npm run build", { cwd: pluginDir, stdio: "inherit" });

console.log("✓ Stream Deck plugin ready");
