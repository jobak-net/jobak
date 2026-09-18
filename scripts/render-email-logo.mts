#!/usr/bin/env node
/**
 * Renders the Jobak mark as a PNG for embedding in email.
 *
 *   pnpm build:email-logo
 *
 * ── Why a raster at all ─────────────────────────────────────
 * Email cannot use the app's SVG component. Outlook's desktop clients render
 * through Word, which does not support SVG at all, and several webmail clients
 * strip `<svg>` outright. A PNG data-URI is the one form every client shows.
 *
 * ── Why generated, not committed as a binary ────────────────
 * The geometry is copied from `brand/logo/mark.svg`, so this script is the
 * link between the brand asset and the email. Committing a PNG someone exported
 * once means the email silently keeps the old mark when the brand changes —
 * which is exactly the drift that made this task necessary.
 *
 * Output goes into `email-templates/logo.b64.json`, which build.mjs inlines.
 */

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

/** 160px so it stays sharp on a 2x display at its 40px render size. */
const SIZE = 160;
const SCALE = SIZE / 64; // the mark's viewBox is 64x64

type RGB = [number, number, number];

const TILE: RGB = [0x19, 0x1a, 0x1b];
const BORDER: RGB = [0x1f, 0x21, 0x22];
const ACCENT: RGB = [0x58, 0xe6, 0x8c];

/*
 * A tiny software rasteriser.
 *
 * Adding a rendering dependency (sharp, resvg, puppeteer) for one 160px image
 * that changes about never would be a poor trade — sharp is already in this
 * repo's `ignoredBuiltDependencies`, so it is not even built. The shapes here
 * are two rounded rectangles, a stroked arc and a circle; all four are cheap to
 * evaluate as signed distance functions.
 */

/** Distance from point to a rounded rectangle centred on the canvas. */
function roundedRectDist(x: number, y: number, half: number, radius: number) {
  const dx = Math.abs(x) - (half - radius);
  const dy = Math.abs(y) - (half - radius);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - radius;
}

/**
 * Distance to the J's bowl: `M42 12 V38 A10 10 0 0 1 22 38`.
 *
 * A vertical segment from (42,12) to (42,38), then a half-circle of radius 10
 * centred at (32,38) sweeping to (22,38). Taking the minimum of the two
 * distances gives the unbroken stroke the design calls for.
 */
function bowlDist(x: number, y: number) {
  // Vertical segment at x=42, clamped to y in [12,38].
  const segY = Math.min(Math.max(y, 12), 38);
  const dSeg = Math.hypot(x - 42, y - segY);

  /*
   * The arc is the LOWER half of a circle centred (32,38) with r=10 — the sweep
   * from (42,38) round to (22,38). Above that centre line the arc does not
   * exist, so those points take the segment distance alone; otherwise the
   * rounded cap at (42,12) would gain a phantom mirror at the top.
   */
  const dArc =
    y >= 38 ? Math.abs(Math.hypot(x - 32, y - 38) - 10) : Infinity;

  return Math.min(dSeg, dArc);
}

/** Coverage in [0,1] for a distance, antialiased over roughly one pixel. */
const coverage = (dist: number) => {
  const aa = 1 / SCALE; // one device pixel, expressed in viewBox units
  return Math.min(Math.max(0.5 - dist / aa, 0), 1);
};

const mix = (bg: RGB, fg: RGB, a: number): RGB => [
  Math.round(bg[0] + (fg[0] - bg[0]) * a),
  Math.round(bg[1] + (fg[1] - bg[1]) * a),
  Math.round(bg[2] + (fg[2] - bg[2]) * a),
];

// ── Rasterise ────────────────────────────────────────────────
const pixels = Buffer.alloc(SIZE * SIZE * 4);

for (let py = 0; py < SIZE; py++) {
  for (let px = 0; px < SIZE; px++) {
    // Sample at the pixel centre, in viewBox coordinates.
    const x = (px + 0.5) / SCALE;
    const y = (py + 0.5) / SCALE;

    // Tile: rounded rect, 64x64, radius 18, centred at (32,32).
    const tileDist = roundedRectDist(x - 32, y - 32, 32, 18);
    const tileAlpha = coverage(tileDist);

    if (tileAlpha <= 0) {
      // Fully outside the tile — transparent.
      const o = (py * SIZE + px) * 4;
      pixels[o] = pixels[o + 1] = pixels[o + 2] = pixels[o + 3] = 0;
      continue;
    }

    // Start from the tile fill, with a 1px border ring just inside the edge.
    let color: RGB = tileDist > -1 ? BORDER : TILE;

    // The bowl stroke: width 7, so half-width 3.5 from the centreline.
    const strokeAlpha = coverage(bowlDist(x, y) - 3.5);
    if (strokeAlpha > 0) color = mix(color, ACCENT, strokeAlpha);

    // The sun: circle centre (25,22), r=5.5.
    const dotAlpha = coverage(Math.hypot(x - 25, y - 22) - 5.5);
    if (dotAlpha > 0) color = mix(color, ACCENT, dotAlpha);

    const o = (py * SIZE + px) * 4;
    pixels[o] = color[0];
    pixels[o + 1] = color[1];
    pixels[o + 2] = color[2];
    pixels[o + 3] = Math.round(tileAlpha * 255);
  }
}

// ── Encode as PNG ────────────────────────────────────────────
function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type: RGBA
// 10..12 default to 0: deflate, adaptive filtering, no interlace

// Each scanline is prefixed with a filter byte; 0 means "none".
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const base64 = png.toString("base64");
const out = join(process.cwd(), "email-templates", "logo.b64.json");

writeFileSync(
  out,
  `${JSON.stringify({ dataUri: `data:image/png;base64,${base64}`, width: 40, height: 40 }, null, 2)}\n`,
  "utf8",
);

console.log(
  `Rendered ${SIZE}x${SIZE} mark: ${png.length} bytes PNG, ${base64.length} chars base64 -> ${out}`,
);
