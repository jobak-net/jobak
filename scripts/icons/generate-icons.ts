/**
 * Rasterises the app icons from the brand's SVG sources.
 *
 * The icons are the one part of the brand that cannot stay SVG: `favicon.ico`
 * is a raster container by definition, and a PWA manifest needs PNGs at fixed
 * sizes. So they get committed, which means they can go stale against the mark
 * — and they did, twice: once carrying the old sun-and-horizon badge, then a
 * thicker J in a green tile that the homepage logo never used. Re-running this
 * after any mark change is the whole job.
 *
 *   pnpm scripts        → Icons → 1
 *   tsx scripts/icons/generate-icons.ts
 *
 * Two sources, because the two kinds of icon sit on different grounds:
 *
 *  - `brand/logo/mark.svg` → `favicon.ico`. The bare J on transparency, as the
 *    tab shows it; the browser chrome is its ground.
 *  - `brand/logo/app-icon.svg` → the manifest PNGs. The J on the canvas colour,
 *    full bleed, because an installed app icon sits on someone else's wallpaper
 *    and the launcher cuts its own shape.
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);

/*
 * Only the surface this script touches, declared locally.
 *
 * `typeof import("sharp")` cannot be used for the same reason `require("sharp")`
 * cannot: the package is not resolvable from the repo root, so tsc reports
 * TS2307 on the import type even though the value loads fine at runtime.
 */
interface SharpImage {
    resize(width: number, height: number, options?: { fit?: string; background?: string; kernel?: string }): SharpImage;
    flatten(options: { background: string }): SharpImage;
    ensureAlpha(): SharpImage;
    png(options?: { compressionLevel?: number }): SharpImage;
    composite(items: { input: Buffer; gravity?: string }[]): SharpImage;
    toFile(path: string): Promise<unknown>;
    toBuffer(): Promise<Buffer>;
}

interface Sharp {
    (input: Buffer, options?: { density?: number }): SharpImage;
    (options: {
        create: { width: number; height: number; channels: number; background: string };
    }): SharpImage;
}

/**
 * sharp, which is present but not addressable.
 *
 * It ships as a transitive dependency of Next (image optimisation), and pnpm's
 * strict layout means a plain `require("sharp")` from this script throws
 * MODULE_NOT_FOUND — it is only linked into Next's own subtree. Reading it out
 * of the store keeps it out of `package.json`, which is the right trade for a
 * script that runs by hand when the mark changes.
 *
 * If this ever fails, `pnpm add -D sharp` is the fix and this helper can go.
 */
function loadSharp(): Sharp {
    try {
        return require("sharp");
    } catch {
        const store = join(ROOT, "node_modules/.pnpm");
        const dir = readdirSync(store).find((name) => /^sharp@/.test(name));
        if (!dir) {
            throw new Error("sharp is not installed — run `pnpm add -D sharp` and retry.");
        }
        return require(join(store, dir, "node_modules/sharp"));
    }
}

const CANVAS = "#08090a"; // --bg-canvas, the sRGB fallback. See brand/README.md.
const ROOT = process.cwd();
const MARK = readFileSync(join(ROOT, "brand/logo/mark.svg"));
const APP_ICON = readFileSync(join(ROOT, "brand/logo/app-icon.svg"));
const sharp = loadSharp();

/** High density so the J's bowl stays clean at 512. */
const DENSITY = 600;

/**
 * The app icon at a given size: the J on the canvas colour, edge to edge.
 *
 * `ensureAlpha` is load-bearing rather than tidy-minded. `flatten` composites
 * away the alpha channel and leaves a 3-channel RGB PNG, and Next's `.ico`
 * decoder rejects those outright — `Format error decoding Ico: The PNG is not
 * in RGBA format!`, which fails the production build, not just the icon.
 */
function renderAppIcon(size: number) {
    return sharp(APP_ICON, { density: DENSITY })
        .resize(size, size)
        .flatten({ background: CANVAS })
        .ensureAlpha()
        .png({ compressionLevel: 9 });
}

/**
 * The favicon at a given size: the bare J with its transparency kept, so the
 * browser's tab colour shows around it exactly as with `icon.svg`.
 */
function renderFavicon(size: number) {
    return sharp(MARK, { density: DENSITY })
        .resize(size, size, { fit: "contain", background: "#00000000" })
        .ensureAlpha()
        .png({ compressionLevel: 9 });
}

/**
 * Packs PNGs into an ICO container.
 *
 * sharp has no ICO encoder and the format does not need one: since Vista an
 * icon directory may hold PNG payloads verbatim, which every browser in scope
 * reads. So this is a 6-byte header, a 16-byte directory entry per size, and
 * the PNG bytes — cheaper than taking a dependency for it.
 */
function buildIco(images: { size: number; data: Buffer }[]): Buffer {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // 1 = icon
    header.writeUInt16LE(images.length, 4);

    let offset = 6 + images.length * 16;
    const entries: Buffer[] = [];

    for (const { size, data } of images) {
        const entry = Buffer.alloc(16);
        // 0 means 256 in this field; every size here is smaller, but the
        // modulo keeps that true if someone adds 256 later.
        entry.writeUInt8(size % 256, 0);
        entry.writeUInt8(size % 256, 1);
        entry.writeUInt8(0, 2); // palette size — 0 for PNG payloads
        entry.writeUInt8(0, 3); // reserved
        entry.writeUInt16LE(1, 4); // colour planes
        entry.writeUInt16LE(32, 6); // bits per pixel
        entry.writeUInt32LE(data.length, 8);
        entry.writeUInt32LE(offset, 12);
        entries.push(entry);
        offset += data.length;
    }

    return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
    const iconsDir = join(ROOT, "public/icons");
    await mkdir(iconsDir, { recursive: true });

    /*
     * 16, 32 and 48 are the sizes a browser actually asks an .ico for — tab,
     * bookmark bar, and Windows shortcut. Anything larger is what icon.svg and
     * the manifest PNGs are for, and only inflates a file served on every
     * page load.
     */
    const ico = buildIco(
        await Promise.all(
            [16, 32, 48].map(async (size) => ({ size, data: await renderFavicon(size).toBuffer() }))
        )
    );
    await writeFile(join(ROOT, "src/app/favicon.ico"), ico);
    console.log(`src/app/favicon.ico            16+32+48   ${ico.length} bytes`);

    // 192 and 512 are the two the install prompt and the splash screen use.
    for (const size of [192, 512]) {
        const file = join(iconsDir, `icon-${size}.png`);
        await renderAppIcon(size).toFile(file);
        console.log(`public/icons/icon-${size}.png`.padEnd(31) + `${size}×${size}`);
    }

    /*
     * Maskable: Android crops it to the launcher's shape, guaranteeing only the
     * inner 80%. The app icon already keeps the J inside that (it is drawn at
     * 68%), so the same picture serves — a crop eats only canvas.
     */
    await renderAppIcon(512).toFile(join(iconsDir, "icon-maskable-512.png"));
    console.log(`public/icons/icon-maskable-512.png  512×512 (J inside the safe zone)`);

    console.log("\nRegistered in src/app/manifest.ts — update it if you add a size.");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
