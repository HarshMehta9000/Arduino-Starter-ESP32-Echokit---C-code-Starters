/**
 * A small two-pass GIF writer.
 *
 * Pass one renders a sample of frames and derives a single global palette from
 * them. Pass two re-renders every frame and writes it against that palette, so
 * the file carries one colour table instead of one per frame and the colours
 * do not shift as the animation loops.
 *
 * Frames are re-rendered rather than cached because a full RGBA buffer is over
 * a megabyte each and this box has under two gigabytes of RAM.
 */

import { writeFileSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
// gifenc ships CommonJS, so its named exports come off the default import.
import gifenc from "gifenc";

const { GIFEncoder, quantize, applyPalette } = gifenc;

/**
 * @param {object} o
 * @param {number} o.width
 * @param {number} o.height
 * @param {number} o.frames      total frame count
 * @param {number} o.delay       milliseconds per frame
 * @param {(ctx: any, i: number) => void} o.draw  deterministic frame renderer
 * @param {string} o.out         file path to write
 * @param {number} [o.maxColors] palette size, 255 leaves room for a spare index
 */
export function encodeGif({
  width,
  height,
  frames,
  delay,
  draw,
  out,
  maxColors = 255,
}) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const render = (i) => {
    ctx.save();
    draw(ctx, i);
    ctx.restore();
    return ctx.getImageData(0, 0, width, height).data;
  };

  // Pass one: sample every Nth pixel from a spread of frames.
  const sampleFrames = Math.min(frames, 14);
  const stride = 7; // pixels
  const perFrame = Math.ceil((width * height) / stride);
  const sample = new Uint8ClampedArray(sampleFrames * perFrame * 4);
  let w = 0;
  for (let k = 0; k < sampleFrames; k++) {
    const i = Math.round((k / sampleFrames) * frames) % frames;
    const data = render(i);
    for (let p = 0; p < width * height; p += stride) {
      const o = p * 4;
      sample[w++] = data[o];
      sample[w++] = data[o + 1];
      sample[w++] = data[o + 2];
      sample[w++] = 255;
    }
  }
  const palette = quantize(sample.subarray(0, w), maxColors, { format: "rgb565" });

  // Pass two: encode against the shared palette, writing only what moved.
  // Quantizing to at most 255 colours leaves index 255 free to mean "unchanged
  // since the previous frame", which is what keeps a mostly-static instrument
  // panel from costing a full frame of pixels every 70ms.
  const TRANSPARENT = 255;
  const gif = GIFEncoder();
  let prev = null;

  for (let i = 0; i < frames; i++) {
    const data = render(i);
    const index = applyPalette(data, palette, "rgb565");

    if (prev) {
      for (let p = 0, o = 0; p < index.length; p++, o += 4) {
        if (
          data[o] === prev[o] &&
          data[o + 1] === prev[o + 1] &&
          data[o + 2] === prev[o + 2]
        ) {
          index[p] = TRANSPARENT;
        }
      }
    }

    gif.writeFrame(index, width, height, {
      delay,
      ...(i === 0
        ? { palette }
        : { transparent: true, transparentIndex: TRANSPARENT, dispose: 1 }),
    });

    // getImageData hands back a fresh buffer each call, so this is safe to keep.
    prev = data;
  }
  gif.finish();

  const bytes = gif.bytes();
  writeFileSync(out, bytes);
  return { path: out, bytes: bytes.length, frames, palette: palette.length };
}

/** A single still, same renderer contract. */
export function encodePng({ width, height, draw, out, scale = 1 }) {
  const canvas = createCanvas(width * scale, height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  draw(ctx, 0);
  const buf = canvas.toBuffer("image/png");
  writeFileSync(out, buf);
  return { path: out, bytes: buf.length };
}
