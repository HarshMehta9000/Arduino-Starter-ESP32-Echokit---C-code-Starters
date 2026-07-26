/**
 * Capture 3: loop() blocking on delay(50).
 *
 * The sketch advertises itself as non-blocking, and the blink really is. The
 * button branch is not: it calls delay(50) and the whole loop stops there. Real
 * time is slowed four times over so a 50ms stall is actually visible.
 */

import * as K from "../lib/draw-kit.mjs";
import { runSim } from "../lib/run-sim.mjs";
import { DEBOUNCE_MS, intervalFromPot } from "../../.media-build/firmware.js";

export const WIDTH = 760;
export const HEIGHT = 420;
export const FRAMES = 90;
export const DELAY = 80;

const MS_PER_FRAME = 20; // virtual ms per frame, against an 80ms frame delay
const SLOWDOWN = DELAY / MS_PER_FRAME;
const POT = 100; // a short interval, so the blink is visible in a short capture
const PRESSES = [300, 800, 1300];
const PRESS_WIDTH = 120;

const ROWS = [
  { code: "int buttonState = digitalRead(buttonPin);", indent: 1, key: "read" },
  { code: "if (buttonState == HIGH && lastButtonState == LOW) {", indent: 1, key: "edge" },
  { code: "modeToggle = !modeToggle;", indent: 2, key: "edge" },
  { code: "delay(50);", indent: 2, key: "stall" },
  { code: "interval = map(potValue, 0, 1023, 100, 1000);", indent: 1, key: "map" },
  { code: "if (currentMillis - previousMillis >= interval) {", indent: 1, key: "gate" },
  { code: "if (modeToggle) ledState = !ledState;", indent: 2, key: "toggle" },
  { code: "else ledState = HIGH;", indent: 2, key: "solid" },
  { code: "digitalWrite(ledPin, ledState);", indent: 2, key: "write" },
  { code: "Serial.println(interval);", indent: 1, key: "log" },
];

const sim = runSim({
  durationMs: FRAMES * MS_PER_FRAME,
  msPerFrame: MS_PER_FRAME,
  script: (t) => ({
    pot: POT,
    button: PRESSES.some((p) => t >= p && t < p + PRESS_WIDTH),
  }),
});

function isActive(key, f, wroteFlash, logFlash) {
  switch (key) {
    case "read":
    case "map":
    case "gate":
      return !f.stalling;
    case "edge":
    case "stall":
      return f.stalling;
    case "toggle":
      return wroteFlash && f.state.modeToggle;
    case "solid":
      return wroteFlash && !f.state.modeToggle;
    case "write":
      return wroteFlash;
    case "log":
      return logFlash;
    default:
      return false;
  }
}

export function draw(ctx, i) {
  const f = sim.frames[Math.min(i, sim.frames.length - 1)];
  const st = f.state;
  const wroteFlash = f.sinceWrite < MS_PER_FRAME * 2;
  const logFlash = f.sinceLog < MS_PER_FRAME * 5;

  ctx.fillStyle = K.C.pcb;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  K.boardGrid(ctx, WIDTH, HEIGHT);

  K.header(ctx, WIDTH, "void loop()", `virtual time, slowed ${SLOWDOWN}x`);
  K.pill(
    ctx,
    104,
    8,
    f.stalling ? `blocked ${f.stallRemaining}ms` : "running",
    f.stalling ? K.C.alarm : K.C.ok,
  );

  /* ---------------- left: the loop body ---------------- */
  K.panel(ctx, 14, 48, 474, 296, { fill: K.C.pcb });

  ROWS.forEach((r, n) => {
    const y = 62 + n * 23;
    const active = isActive(r.key, f, wroteFlash, logFlash);
    const isStall = r.key === "stall";

    if (active) {
      K.roundRect(ctx, 24, y, 454, 21, 4);
      ctx.fillStyle = isStall ? K.alpha(K.C.alarm, 0.2) : K.alpha(K.C.trace, 0.12);
      ctx.fill();
    }

    const indent = "  ".repeat(r.indent);
    const color = active ? (isStall ? K.C.alarm : K.C.ink) : K.C.inkFaint;
    K.text(ctx, indent + r.code, 30, y + 15, { font: K.mono(11.5), fill: color });

    if (isStall && active) {
      ctx.font = K.mono(11.5);
      const w = ctx.measureText(indent + r.code).width;
      K.text(ctx, "  <- loop is stopped here", 30 + w, y + 15, {
        font: K.mono(11.5),
        fill: K.alpha(K.C.alarm, 0.7),
      });
    }
  });

  K.text(
    ctx,
    "Rows light up when that branch actually runs in the current pass.",
    30,
    322,
    { font: K.sans(11), fill: K.C.inkFaint },
  );

  /* ---------------- right: what it costs ---------------- */
  K.panel(ctx, 502, 48, 244, 296);

  const lx = 624;
  const ly = 116;
  if (st.ledState) K.glow(ctx, lx, ly, 54, K.C.led, 0.6);
  ctx.beginPath();
  ctx.arc(lx, ly, 30, 0, Math.PI * 2);
  ctx.fillStyle = st.ledState ? K.C.led : K.alpha(K.C.edge2, 0.6);
  ctx.fill();
  if (!st.ledState) {
    ctx.strokeStyle = K.C.edge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  K.text(ctx, `${st.interval}ms`, 624, 180, {
    font: K.monoBold(24),
    fill: K.C.ink,
    align: "center",
  });
  K.text(ctx, `map(${POT}, 0, 1023, 100, 1000)`, 624, 198, {
    font: K.mono(9),
    fill: K.C.inkFaint,
    align: "center",
  });

  const modeColor = st.modeToggle ? K.C.trace : K.C.inkDim;
  ctx.font = K.mono(10);
  const label = st.modeToggle ? "mode BLINK" : "mode SOLID";
  const pw = ctx.measureText(label).width + 16;
  K.pill(ctx, 624 - pw / 2, 212, label, modeColor);

  // Blocked share of uptime
  const pct = f.t > 0 ? (f.stalledMs / f.t) * 100 : 0;
  K.text(ctx, "share of uptime inside delay()", 518, 258, {
    font: K.mono(9),
    fill: K.C.inkFaint,
  });
  K.roundRect(ctx, 518, 266, 212, 10, 5);
  ctx.fillStyle = K.C.edge;
  ctx.fill();
  if (pct > 0) {
    K.roundRect(ctx, 518, 266, Math.max(3, (212 * pct) / 100), 10, 5);
    ctx.fillStyle = K.C.alarm;
    ctx.fill();
  }
  K.text(ctx, `${pct.toFixed(1)}%`, 518, 296, {
    font: K.monoMed(13),
    fill: K.C.ink,
  });
  K.text(
    ctx,
    `${f.modeChanges} mode ${f.modeChanges === 1 ? "change" : "changes"}`,
    730,
    296,
    { font: K.mono(10), fill: K.C.inkFaint, align: "right" },
  );

  K.text(ctx, "The blink is non-blocking.", 518, 322, {
    font: K.sans(11),
    fill: K.C.inkDim,
  });
  K.text(ctx, "The debounce is not.", 518, 336, {
    font: K.sans(11),
    fill: K.C.inkDim,
  });

  /* ---------------- bottom: the tally ---------------- */
  const cells = [
    [`${f.stalledMs}ms`, "lost to delay()", K.C.ink],
    [`${pct.toFixed(1)}%`, "of uptime blocked", f.stalledMs > 0 ? K.C.alarm : K.C.ink],
    [`${DEBOUNCE_MS}ms`, "per press", K.C.ink],
    [`${intervalFromPot(POT)}ms`, "blink interval", K.C.trace],
  ];
  const cw = (732 - 12) / 4;
  cells.forEach(([v, label, color], n) => {
    K.statCell(ctx, 14 + n * (cw + 4), 352, cw, 54, v, label, {
      valueColor: color,
      valueFont: K.monoMed(17),
    });
  });
}
