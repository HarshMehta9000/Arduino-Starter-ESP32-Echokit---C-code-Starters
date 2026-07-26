/**
 * Drawing helpers shared by the media generators.
 *
 * The palette and the type scale are lifted from src/app/globals.css so the
 * generated GIFs sit next to screenshots of the live page without clashing.
 * There is no browser on the build box, so every asset in docs/media is drawn
 * here with node-canvas rather than captured.
 */

import { GlobalFonts } from "@napi-rs/canvas";

/** Verbatim from the @theme block in src/app/globals.css. */
export const C = {
  pcb: "#07080a",
  panel: "#0d0f13",
  panel2: "#12151b",
  edge: "#1c212b",
  edge2: "#2a313e",
  ink: "#e8eaef",
  inkDim: "#98a1b0",
  inkFaint: "#626b7a",
  led: "#ffb020",
  ledSoft: "#ffcd6b",
  trace: "#22d3ee",
  traceSoft: "#7fe6f7",
  alarm: "#ff5f56",
  ok: "#3fd18b",
  gold: "#c9a227",
};

const FONT_DIR = "/usr/share/fonts";

/** Registered once per process. Aliases keep weight selection deterministic. */
export function registerFonts() {
  const faces = [
    [`${FONT_DIR}/adobe-source-code-pro/SourceCodePro-Regular.otf`, "Mono"],
    [`${FONT_DIR}/adobe-source-code-pro/SourceCodePro-Medium.otf`, "MonoMed"],
    [`${FONT_DIR}/adobe-source-code-pro/SourceCodePro-Bold.otf`, "MonoBold"],
    [`${FONT_DIR}/google-noto-vf/NotoSans[wght].ttf`, "Sans"],
  ];
  for (const [path, alias] of faces) {
    if (!GlobalFonts.registerFromPath(path, alias)) {
      throw new Error(`could not register font: ${path}`);
    }
  }
}

export const mono = (size) => `${size}px Mono`;
export const monoMed = (size) => `${size}px MonoMed`;
export const monoBold = (size) => `${size}px MonoBold`;
export const sans = (size) => `${size}px Sans`;

/** rgba() from a #rrggbb literal, so the palette stays in one place. */
export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** A bordered surface, the page's basic building block. */
export function panel(ctx, x, y, w, h, opts = {}) {
  const { fill = C.panel, stroke = C.edge, r = 10 } = opts;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** The faint cyan trace grid from .board-grid. */
export function boardGrid(ctx, w, h, step = 44) {
  ctx.save();
  ctx.strokeStyle = alpha(C.trace, 0.045);
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

export function text(ctx, s, x, y, opts = {}) {
  const {
    font = mono(11),
    fill = C.inkDim,
    align = "left",
    baseline = "alphabetic",
  } = opts;
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(s, x, y);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/** A radial bloom, standing in for the CSS box-shadow glow. */
export function glow(ctx, cx, cy, radius, color, strength = 0.55) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, alpha(color, strength));
  g.addColorStop(0.45, alpha(color, strength * 0.35));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** A small labelled readout cell, as used across the page's stat strips. */
export function statCell(ctx, x, y, w, h, value, label, opts = {}) {
  const { fill = C.panel2, valueColor = C.ink, valueFont = mono(15) } = opts;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = C.edge;
  ctx.lineWidth = 1;
  ctx.stroke();
  text(ctx, value, x + w / 2, y + h / 2 - 3, {
    font: valueFont,
    fill: valueColor,
    align: "center",
    baseline: "middle",
  });
  text(ctx, label, x + w / 2, y + h - 9, {
    font: mono(9),
    fill: C.inkFaint,
    align: "center",
    baseline: "middle",
  });
}

/** The title strip every capture carries, so a loose GIF still has context. */
export function header(ctx, w, left, right, opts = {}) {
  const { h = 34 } = opts;
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = C.edge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h + 0.5);
  ctx.lineTo(w, h + 0.5);
  ctx.stroke();
  text(ctx, left, 14, h / 2, { font: monoMed(12), fill: C.ink, baseline: "middle" });
  if (right) {
    text(ctx, right, w - 14, h / 2, {
      font: mono(11),
      fill: C.inkFaint,
      align: "right",
      baseline: "middle",
    });
  }
  return h;
}

/** A pill, used for status badges. */
export function pill(ctx, x, y, label, color, opts = {}) {
  const { font = mono(10), padX = 8, h = 18 } = opts;
  ctx.font = font;
  const w = ctx.measureText(label).width + padX * 2;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = alpha(color, 0.14);
  ctx.fill();
  ctx.strokeStyle = alpha(color, 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2, {
    font,
    fill: color,
    align: "center",
    baseline: "middle",
  });
  return w;
}

/** Right-aligned pill, returning the x it started at. */
export function pillRight(ctx, xRight, y, label, color, opts = {}) {
  const { font = mono(10), padX = 8 } = opts;
  ctx.font = font;
  const w = ctx.measureText(label).width + padX * 2;
  pill(ctx, xRight - w, y, label, color, opts);
  return xRight - w;
}
