/**
 * Generates every image and animation in docs/media.
 *
 * There is no browser on this machine, so nothing here is a screen recording.
 * Each frame is drawn with node-canvas against the real firmware port, which
 * has a useful side effect: the numbers in the GIFs are computed by the same
 * code the page runs, so they cannot drift from what a visitor sees.
 *
 *   node scripts/gen-media.mjs
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, "..");
const REPO = join(WEB, "..");
const BUILD = join(WEB, ".media-build");

/** docs/media is what the README links to. */
const OUT = join(REPO, "docs", "media");
/** A mirror, so Next can serve the same files from /media on the site. */
const MIRROR = join(WEB, "public", "media");

/**
 * The scenes import the site's own TypeScript. Compiling it here, rather than
 * keeping a second copy in JavaScript, is what stops the captures and the page
 * from disagreeing.
 */
function compileSources() {
  rmSync(BUILD, { recursive: true, force: true });
  execFileSync(
    process.execPath,
    [
      join(WEB, "node_modules", "typescript", "bin", "tsc"),
      join(WEB, "src", "lib", "firmware.ts"),
      join(WEB, "src", "lib", "board-spec.ts"),
      "--outDir",
      BUILD,
      "--target",
      "es2022",
      "--module",
      "esnext",
      "--moduleResolution",
      "bundler",
      "--skipLibCheck",
    ],
    { stdio: "inherit" },
  );
  writeFileSync(join(BUILD, "package.json"), '{"type":"module"}\n');
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function main() {
  compileSources();
  mkdirSync(OUT, { recursive: true });
  mkdirSync(MIRROR, { recursive: true });
  const written = [];

  // Imported after the compile step, since the scenes resolve .media-build.
  const { registerFonts } = await import("./lib/draw-kit.mjs");
  const { encodeGif, encodePng } = await import("./lib/gif.mjs");
  registerFonts();

  const bench = await import("./scenes/bench.mjs");
  const port = await import("./scenes/port.mjs");
  const loop = await import("./scenes/loop.mjs");
  const still = await import("./scenes/still.mjs");

  const gifs = [
    ["bench.gif", bench],
    ["port-lab.gif", port],
    ["loop-blocking.gif", loop],
  ];

  for (const [name, scene] of gifs) {
    const t0 = Date.now();
    const r = encodeGif({
      width: scene.WIDTH,
      height: scene.HEIGHT,
      frames: scene.FRAMES,
      delay: scene.DELAY,
      draw: scene.draw,
      out: join(OUT, name),
    });
    written.push(r.path);
    const secs = ((scene.FRAMES * scene.DELAY) / 1000).toFixed(1);
    console.log(
      `${name.padEnd(20)} ${String(scene.WIDTH)}x${scene.HEIGHT}  ` +
        `${String(r.frames).padStart(3)} frames  ${secs}s loop  ` +
        `${kb(r.bytes).padStart(8)}  ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  }

  const stills = [
    ["social.png", still.SOCIAL],
    ["board.png", still.PLATE],
  ];
  for (const [name, s] of stills) {
    const r = encodePng({
      width: s.width,
      height: s.height,
      draw: s.draw,
      out: join(OUT, name),
    });
    written.push(r.path);
    console.log(
      `${name.padEnd(20)} ${s.width}x${s.height}  ${kb(r.bytes).padStart(8)}`,
    );
  }

  for (const p of written) copyFileSync(p, join(MIRROR, basename(p)));

  rmSync(BUILD, { recursive: true, force: true });
  console.log(
    `\nwrote ${written.length} files to docs/media, mirrored to web/public/media`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
