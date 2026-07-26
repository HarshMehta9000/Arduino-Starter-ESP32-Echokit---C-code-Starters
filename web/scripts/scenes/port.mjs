/**
 * Capture 2: the port lab.
 *
 * One knob drives both board profiles through the sketch's unchanged map()
 * call. The Uno curve stays under the documented ceiling. The ESP32 curve does
 * not, because map() is pinned to 1023 while analogRead() now returns 4095.
 */

import * as K from "../lib/draw-kit.mjs";
import { ease } from "../lib/run-sim.mjs";
import { BOARDS, MAP_BOUNDS, portComparison } from "../../.media-build/firmware.js";

export const WIDTH = 760;
export const HEIGHT = 420;
export const FRAMES = 80;
export const DELAY = 70;

const SAMPLES = 41;
const Y_MAX = Math.max(MAP_BOUNDS.outMax, portComparison(100, BOARDS.esp32).actual);
const FULL_SCALE_X = portComparison(100, BOARDS.esp32).actual / MAP_BOUNDS.outMax;

/** Knob position for a frame: sweep up, hold, sweep back, hold. */
function knobAt(i) {
  if (i < 6) return 0;
  if (i < 38) return ease(0, 100, (i - 6) / 32);
  if (i < 46) return 100;
  if (i < 74) return ease(100, 0, (i - 46) / 28);
  return 0;
}

function wrap(ctx, s, maxWidth, font) {
  ctx.font = font;
  const words = s.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCurve(ctx, x, y, w, h, board, knob) {
  const pad = 6;
  const px = (pct) => x + pad + (pct / 100) * (w - pad * 2);
  const py = (ms) => y + h - pad - (ms / Y_MAX) * (h - pad * 2);

  // Documented ceiling
  const ceil = py(MAP_BOUNDS.outMax);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = K.C.edge2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + pad, ceil + 0.5);
  ctx.lineTo(x + w - pad, ceil + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  K.text(ctx, "1000ms documented ceiling", x + pad + 2, ceil - 6, {
    font: K.mono(9),
    fill: K.C.inkFaint,
  });

  const here = portComparison(knob, board);
  const accent = here.overshoots ? K.C.alarm : K.C.ok;

  ctx.beginPath();
  for (let i = 0; i < SAMPLES; i++) {
    const pct = (i / (SAMPLES - 1)) * 100;
    const { actual } = portComparison(pct, board);
    const cx = px(pct);
    const cy = py(actual);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  const hx = px(knob);
  const hy = py(here.actual);
  ctx.beginPath();
  ctx.arc(hx, hy, 9, 0, Math.PI * 2);
  ctx.fillStyle = K.alpha(accent, 0.18);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
}

function drawBoardPanel(ctx, x, y, w, h, boardId, knob) {
  const board = BOARDS[boardId];
  const res = portComparison(knob, board);

  K.panel(ctx, x, y, w, h, {
    fill: res.overshoots ? "#150e0e" : K.C.panel2,
    stroke: res.overshoots ? K.alpha(K.C.alarm, 0.4) : K.C.edge,
    r: 10,
  });

  K.text(ctx, board.name, x + 16, y + 24, { font: K.monoMed(13), fill: K.C.ink });
  K.pillRight(
    ctx,
    x + w - 16,
    y + 12,
    res.overshoots ? "out of range" : "in range",
    res.overshoots ? K.C.alarm : K.C.ok,
  );

  drawCurve(ctx, x + 14, y + 40, w - 28, 108, board, knob);

  const cellW = (w - 28 - 8) / 3;
  const cells = [
    [String(res.raw), "analogRead", K.C.ink],
    [String(res.actual), "sketch says", res.overshoots ? K.C.alarm : K.C.ink],
    [String(res.corrected), "intended", K.C.ok],
  ];
  cells.forEach(([v, label, color], n) => {
    K.statCell(
      ctx,
      x + 14 + n * (cellW + 4),
      y + 158,
      cellW,
      42,
      v,
      label,
      { fill: K.C.panel, valueColor: color, valueFont: K.monoMed(16) },
    );
  });

  K.text(
    ctx,
    `map(x, 0, ${MAP_BOUNDS.inMax}, ...) with x up to ${board.adcMax}`,
    x + 16,
    y + h - 14,
    { font: K.mono(10), fill: K.C.inkDim },
  );
}

export function draw(ctx, i) {
  const knob = Math.round(knobAt(i));
  const esp = portComparison(knob, BOARDS.esp32);

  ctx.fillStyle = K.C.pcb;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  K.boardGrid(ctx, WIDTH, HEIGHT);

  K.header(ctx, WIDTH, "port lab / one hardcoded 1023", `knob ${knob}%`);

  // Shared knob
  K.panel(ctx, 14, 48, 732, 54);
  K.text(ctx, "knob position, both boards", 30, 70, {
    font: K.mono(11),
    fill: K.C.inkDim,
  });
  K.text(ctx, `${knob}%`, 730, 70, {
    font: K.monoMed(13),
    fill: K.C.ink,
    align: "right",
  });

  const tx = 30;
  const tw = 700;
  ctx.lineCap = "round";
  ctx.strokeStyle = K.C.edge2;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(tx, 88);
  ctx.lineTo(tx + tw, 88);
  ctx.stroke();
  ctx.strokeStyle = esp.overshoots ? K.C.alarm : K.C.trace;
  ctx.beginPath();
  ctx.moveTo(tx, 88);
  ctx.lineTo(tx + Math.max(1, (tw * knob) / 100), 88);
  ctx.stroke();
  ctx.lineCap = "butt";
  const kx = tx + (tw * knob) / 100;
  ctx.beginPath();
  ctx.arc(kx, 88, 7, 0, Math.PI * 2);
  ctx.fillStyle = K.C.ink;
  ctx.fill();

  drawBoardPanel(ctx, 14, 110, 359, 234, "uno", knob);
  drawBoardPanel(ctx, 387, 110, 359, 234, "esp32", knob);

  // Callout
  K.panel(ctx, 14, 352, 732, 54, { fill: K.C.panel, r: 10 });
  if (esp.overshoots) {
    const parts = [
      ["At this position the ESP32 build blinks at ", K.C.inkDim],
      [`${esp.actual}ms`, K.C.alarm],
      [" where the sketch intends ", K.C.inkDim],
      [`${esp.corrected}ms`, K.C.ok],
      [`, a drift of ${esp.drift}ms.`, K.C.inkDim],
    ];
    let cx = 30;
    for (const [s, color] of parts) {
      K.text(ctx, s, cx, 374, { font: K.mono(12), fill: color });
      ctx.font = K.mono(12);
      cx += ctx.measureText(s).width;
    }
    K.text(
      ctx,
      `Nothing looks broken. The knob still turns, it is just slower than documented, by up to ${FULL_SCALE_X.toFixed(1)}x at full scale.`,
      30,
      393,
      { font: K.sans(12), fill: K.C.inkFaint },
    );
  } else {
    const lines = wrap(
      ctx,
      "Below roughly a quarter turn the two boards agree, because a 12-bit reading in that range still lands inside the 10-bit span the sketch was written against.",
      700,
      K.sans(12),
    );
    lines.slice(0, 2).forEach((l, n) => {
      K.text(ctx, l, 30, 374 + n * 18, { font: K.sans(12), fill: K.C.inkDim });
    });
  }
}
