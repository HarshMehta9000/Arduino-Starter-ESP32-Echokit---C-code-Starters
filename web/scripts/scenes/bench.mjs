/**
 * Capture 1: the bench.
 *
 * A scripted hand turns the trimmer and taps the button once. Everything drawn
 * here is read out of the firmware port: the LED edges, the interval, the
 * serial lines and the measured period all come from step().
 */

import * as K from "../lib/draw-kit.mjs";
import { runSim, measuredPeriod, ease } from "../lib/run-sim.mjs";
import { MAP_BOUNDS, potPercent } from "../../.media-build/firmware.js";

export const WIDTH = 760;
export const HEIGHT = 420;
export const FRAMES = 92;
export const DELAY = 70;

const MS_PER_FRAME = 70;
const ADC_MAX = 1023;
const SCOPE_WINDOW = 4000;

/**
 * The scripted inputs: one press to leave SOLID mode, then two moves of the
 * trimmer with a long hold after each.
 *
 * The holds are deliberate. The scope measures its period off the last few
 * recorded edges, so while the knob is moving the measured figure trails the
 * computed one, and only a stationary knob lets them agree. Sweeping the whole
 * time would have made that readout look broken instead of honest.
 */
function script(t) {
  const button = t >= 300 && t < 420;
  let pot;
  if (t < 2600) pot = 512;
  else if (t < 3400) pot = ease(512, 120, (t - 2600) / 800);
  else pot = 120;
  return { pot: Math.round(pot), button };
}

const sim = runSim({
  durationMs: FRAMES * MS_PER_FRAME,
  msPerFrame: MS_PER_FRAME,
  script,
});

function drawSlider(ctx, x, y, w, value, max) {
  const p = value / max;
  ctx.lineCap = "round";
  ctx.strokeStyle = K.C.edge2;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();

  ctx.strokeStyle = K.C.led;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.max(1, w * p), y);
  ctx.stroke();
  ctx.lineCap = "butt";

  const kx = x + w * p;
  K.glow(ctx, kx, y, 16, K.C.led, 0.3);
  ctx.beginPath();
  ctx.arc(kx, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = K.C.ledSoft;
  ctx.fill();
  ctx.strokeStyle = K.C.pcb;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawScope(ctx, x, y, w, h, now, interval, measured) {
  K.panel(ctx, x, y, w, h, { fill: K.C.pcb, r: 8 });

  const headH = 22;
  ctx.strokeStyle = K.C.edge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + headH + 0.5);
  ctx.lineTo(x + w, y + headH + 0.5);
  ctx.stroke();

  K.text(ctx, `digitalWrite trace / ${SCOPE_WINDOW / 1000}s window`, x + 10, y + headH / 2, {
    font: K.mono(10),
    fill: K.C.inkFaint,
    baseline: "middle",
  });

  ctx.font = K.mono(10);
  const rightParts = [
    ["computed ", K.C.inkFaint],
    [`${interval}ms`, K.C.trace],
    ["   measured ", K.C.inkFaint],
    [measured == null ? "..." : `${measured}ms`, K.C.led],
  ];
  let total = 0;
  for (const [s] of rightParts) total += ctx.measureText(s).width;
  let rx = x + w - 10 - total;
  for (const [s, color] of rightParts) {
    K.text(ctx, s, rx, y + headH / 2, {
      font: K.mono(10),
      fill: color,
      baseline: "middle",
    });
    rx += ctx.measureText(s).width;
  }

  // Plot area
  const px = x;
  const py = y + headH;
  const ph = h - headH;
  const padY = 16;
  const yHigh = py + padY;
  const yLow = py + ph - padY;
  const t0 = now - SCOPE_WINDOW;
  const sx = (t) => px + ((t - t0) / SCOPE_WINDOW) * w;

  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, w, ph);
  ctx.clip();

  ctx.strokeStyle = K.alpha(K.C.edge2, 0.7);
  ctx.lineWidth = 1;
  for (let t = Math.ceil(t0 / 500) * 500; t <= now; t += 500) {
    const gx = Math.round(sx(t)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(gx, py);
    ctx.lineTo(gx, py + ph);
    ctx.stroke();
  }

  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = K.alpha(K.C.edge2, 0.9);
  for (const yy of [yHigh, yLow]) {
    ctx.beginPath();
    ctx.moveTo(px, yy + 0.5);
    ctx.lineTo(px + w, yy + 0.5);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Build the visible square wave from the recorded edges.
  const pts = [];
  let level = false;
  for (const e of sim.edges) {
    if (e.t <= t0) {
      level = e.on;
      continue;
    }
    if (e.t > now) break;
    pts.push(e);
  }

  const path = [];
  let prevY = level ? yHigh : yLow;
  path.push([px, prevY]);
  for (const e of pts) {
    const ex = sx(e.t);
    const ey = e.on ? yHigh : yLow;
    path.push([ex, prevY]);
    path.push([ex, ey]);
    prevY = ey;
  }
  path.push([sx(now), prevY]);

  ctx.beginPath();
  ctx.moveTo(path[0][0], path[0][1]);
  for (const [ax, ay] of path.slice(1)) ctx.lineTo(ax, ay);
  ctx.lineTo(sx(now), yLow);
  ctx.lineTo(px, yLow);
  ctx.closePath();
  ctx.fillStyle = K.alpha(K.C.led, 0.12);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(path[0][0], path[0][1]);
  for (const [ax, ay] of path.slice(1)) ctx.lineTo(ax, ay);
  ctx.strokeStyle = K.C.led;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  K.text(ctx, "HIGH", px + 6, yHigh - 6, { font: K.mono(9), fill: K.C.inkFaint });
  K.text(ctx, "LOW", px + 6, yLow + 13, { font: K.mono(9), fill: K.C.inkFaint });
}

export function draw(ctx, i) {
  const f = sim.frames[Math.min(i, sim.frames.length - 1)];
  const st = f.state;

  ctx.fillStyle = K.C.pcb;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  K.boardGrid(ctx, WIDTH, HEIGHT);

  K.header(
    ctx,
    WIDTH,
    "smart_led.ino / the bench",
    `millis ${(f.t / 1000).toFixed(1)}s`,
  );

  /* ---------------- left: inputs ---------------- */
  K.panel(ctx, 14, 48, 290, 358);

  // Trimmer
  K.panel(ctx, 26, 60, 266, 104, { fill: K.C.panel2, r: 8 });
  K.text(ctx, "analogRead(A0)", 40, 82, { font: K.mono(11), fill: K.C.inkDim });
  ctx.font = K.mono(13);
  const tail = ` / ${ADC_MAX}`;
  const tailW = ctx.measureText(tail).width;
  K.text(ctx, tail, 278, 82, { font: K.mono(13), fill: K.C.inkFaint, align: "right" });
  K.text(ctx, String(f.pot), 278 - tailW, 82, {
    font: K.monoMed(13),
    fill: K.C.ink,
    align: "right",
  });

  drawSlider(ctx, 42, 116, 234, f.pot, ADC_MAX);

  K.text(ctx, "0", 40, 150, { font: K.mono(9), fill: K.C.inkFaint });
  K.text(ctx, `${potPercent(f.pot, ADC_MAX)}% of full scale`, 159, 150, {
    font: K.mono(9),
    fill: K.C.inkFaint,
    align: "center",
  });
  K.text(ctx, String(ADC_MAX), 278, 150, {
    font: K.mono(9),
    fill: K.C.inkFaint,
    align: "right",
  });

  // Button
  K.panel(ctx, 26, 174, 266, 86, { fill: K.C.panel2, r: 8 });
  K.text(ctx, "digitalRead(D2)", 40, 196, { font: K.mono(11), fill: K.C.inkDim });
  K.text(ctx, "Rising edge flips the mode, then", 40, 214, {
    font: K.sans(11),
    fill: K.C.inkFaint,
  });
  K.text(ctx, "the sketch blocks for 50ms.", 40, 229, {
    font: K.sans(11),
    fill: K.C.inkFaint,
  });
  K.text(
    ctx,
    `${f.modeChanges} mode ${f.modeChanges === 1 ? "change" : "changes"}`,
    40,
    248,
    { font: K.mono(10), fill: K.C.inkFaint },
  );

  const bcx = 248;
  const bcy = 217;
  if (f.button) K.glow(ctx, bcx, bcy, 34, K.C.led, 0.35);
  ctx.beginPath();
  ctx.arc(bcx, bcy, f.button ? 24 : 25, 0, Math.PI * 2);
  ctx.fillStyle = f.button ? K.alpha(K.C.led, 0.25) : K.C.panel;
  ctx.fill();
  ctx.strokeStyle = f.button ? K.C.led : K.C.edge2;
  ctx.lineWidth = 2;
  ctx.stroke();
  K.text(ctx, f.button ? "HIGH" : "PRESS", bcx, bcy, {
    font: K.mono(10),
    fill: f.button ? K.C.led : K.C.inkDim,
    align: "center",
    baseline: "middle",
  });

  // The computation, spelled out
  K.panel(ctx, 26, 270, 266, 124, { fill: K.C.pcb, r: 8 });
  K.text(ctx, "the sketch computes", 40, 290, {
    font: K.mono(9),
    fill: K.C.inkFaint,
  });

  let cx = 40;
  const seq1 = [
    ["interval = map(", K.C.inkDim],
    [String(f.pot), K.C.led],
    [`, ${MAP_BOUNDS.inMin}, ${MAP_BOUNDS.inMax},`, K.C.inkDim],
  ];
  ctx.font = K.mono(11);
  for (const [s, color] of seq1) {
    K.text(ctx, s, cx, 310, { font: K.mono(11), fill: color });
    cx += ctx.measureText(s).width;
  }
  K.text(ctx, `${MAP_BOUNDS.outMin}, ${MAP_BOUNDS.outMax})`, 40, 326, {
    font: K.mono(11),
    fill: K.C.inkDim,
  });

  cx = 40;
  const span = MAP_BOUNDS.outMax - MAP_BOUNDS.outMin;
  const seq2 = [
    [`= trunc(${f.pot} * ${span} / ${MAP_BOUNDS.inMax}) + ${MAP_BOUNDS.outMin} = `, K.C.inkFaint],
    [String(st.interval), K.C.trace],
  ];
  for (const [s, color] of seq2) {
    K.text(ctx, s, cx, 344, { font: K.mono(10), fill: color });
    ctx.font = K.mono(10);
    cx += ctx.measureText(s).width;
  }

  ctx.strokeStyle = K.C.edge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 356.5);
  ctx.lineTo(278, 356.5);
  ctx.stroke();
  K.text(ctx, "map() is integer math on the real", 40, 372, {
    font: K.sans(10.5),
    fill: K.C.inkFaint,
  });
  K.text(ctx, "hardware, so the fraction is dropped.", 40, 386, {
    font: K.sans(10.5),
    fill: K.C.inkFaint,
  });

  /* ---------------- right: outputs ---------------- */
  K.panel(ctx, 316, 48, 430, 124);

  const lx = 372;
  const ly = 98;
  if (st.ledState) K.glow(ctx, lx, ly, 46, K.C.led, 0.6);
  ctx.beginPath();
  ctx.arc(lx, ly, 24, 0, Math.PI * 2);
  ctx.fillStyle = st.ledState ? K.C.led : K.alpha(K.C.edge2, 0.6);
  ctx.fill();
  if (!st.ledState) {
    ctx.strokeStyle = K.C.edge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.font = K.monoBold(30);
  const ivw = ctx.measureText(String(st.interval)).width;
  K.text(ctx, String(st.interval), 418, 104, { font: K.monoBold(30), fill: K.C.ink });
  K.text(ctx, "ms", 418 + ivw + 3, 104, { font: K.mono(14), fill: K.C.inkFaint });

  const cells = [
    [st.modeToggle ? "BLINK" : "SOLID", "mode"],
    [st.ledState ? "HIGH" : "LOW", "ledState"],
    ["D13", "pin"],
  ];
  cells.forEach(([v, k], n) => {
    K.statCell(ctx, 418 + n * 108, 122, 104, 36, v, k, { valueFont: K.mono(12) });
  });

  drawScope(
    ctx,
    316,
    180,
    430,
    112,
    f.t,
    st.interval,
    measuredPeriod(sim.edges, f.t, SCOPE_WINDOW),
  );

  // Serial tape
  K.panel(ctx, 316, 300, 430, 106, { fill: K.C.pcb });
  ctx.strokeStyle = K.C.edge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(316, 322.5);
  ctx.lineTo(746, 322.5);
  ctx.stroke();
  K.text(ctx, "Serial Monitor", 326, 311, {
    font: K.mono(10),
    fill: K.C.inkFaint,
    baseline: "middle",
  });
  K.text(ctx, `${f.serialCount} lines`, 736, 311, {
    font: K.mono(10),
    fill: K.C.inkFaint,
    align: "right",
    baseline: "middle",
  });

  const lines = sim.serial.slice(0, f.serialCount).slice(-4);
  if (lines.length === 0) {
    K.text(ctx, "waiting for first print...", 326, 342, {
      font: K.mono(11),
      fill: K.C.inkFaint,
    });
  }
  lines.forEach((line, n) => {
    const y = 342 + n * 17;
    K.text(ctx, `${(line.t / 1000).toFixed(0).padStart(3, " ")}s`, 326, y, {
      font: K.mono(11),
      fill: K.C.inkFaint,
    });
    K.text(ctx, line.text, 372, y, { font: K.mono(11), fill: K.C.trace });
  });
}
