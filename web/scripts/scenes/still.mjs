/**
 * The static images: a top-down NodeMCU-32S drawn from the same millimetre
 * spec the 3D hero uses, plus the social card built around it.
 *
 * Drawing from src/lib/board-spec.ts rather than eyeballing it means the still
 * and the interactive render cannot drift apart.
 */

import * as K from "../lib/draw-kit.mjs";
import {
  ANTENNA,
  BOARD,
  BUTTONS,
  HEADER,
  MAPPED_PINS,
  MODULE,
  PINOUT_LEFT,
  PINOUT_RIGHT,
  SMD_PARTS,
  USB,
} from "../../.media-build/board-spec.js";
import { BOARDS, MAP_BOUNDS, portComparison } from "../../.media-build/firmware.js";

const ACCENT = { led: K.C.led, trace: K.C.trace, gold: K.C.gold };

/**
 * Top-down view. `cx, cy` is the board centre, `pxPerMm` the scale.
 * Board X runs left to right with the USB end on the right, matching the spec's
 * convention that the antenna sits at negative X.
 */
export function drawBoardTopDown(ctx, cx, cy, pxPerMm, opts = {}) {
  const { ledOn = true, labels = true } = opts;
  const X = (mm) => cx + mm * pxPerMm;
  const Y = (mm) => cy + mm * pxPerMm;
  const S = (mm) => mm * pxPerMm;

  const bw = S(BOARD.length);
  const bh = S(BOARD.width);

  // Drop shadow
  ctx.save();
  ctx.filter = "blur(18px)";
  K.roundRect(ctx, X(-BOARD.length / 2), Y(-BOARD.width / 2) + S(1.4), bw, bh, S(BOARD.cornerRadius));
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fill();
  ctx.restore();

  // Substrate
  const grad = ctx.createLinearGradient(0, Y(-BOARD.width / 2), 0, Y(BOARD.width / 2));
  grad.addColorStop(0, "#14181f");
  grad.addColorStop(0.5, "#0b0e13");
  grad.addColorStop(1, "#0a0c10");
  K.roundRect(ctx, X(-BOARD.length / 2), Y(-BOARD.width / 2), bw, bh, S(BOARD.cornerRadius));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#242a34";
  ctx.lineWidth = Math.max(1, S(0.12));
  ctx.stroke();

  // Header strips and pins
  const span = (HEADER.perSide - 1) * HEADER.pitch;
  const stripHalf = S(HEADER.stripHeight / 2);
  const rowsZ = [-(BOARD.width / 2 - 1.5), BOARD.width / 2 - 1.5];
  const labelSets = [PINOUT_LEFT, PINOUT_RIGHT];

  rowsZ.forEach((z, side) => {
    ctx.fillStyle = "#0a0b0e";
    ctx.fillRect(X(-span / 2 - 1.1), Y(z) - stripHalf, S(span + 2.2), stripHalf * 2);
    ctx.strokeStyle = "#1a1e26";
    ctx.lineWidth = 1;
    ctx.strokeRect(X(-span / 2 - 1.1), Y(z) - stripHalf, S(span + 2.2), stripHalf * 2);

    const names = labelSets[side];
    for (let i = 0; i < HEADER.perSide; i++) {
      // USB end first, so index 0 sits at the +X end of the board.
      const mmX = span / 2 - i * HEADER.pitch;
      const name = names[i];
      const role = MAPPED_PINS[name];

      ctx.beginPath();
      ctx.arc(X(mmX), Y(z), S(0.42), 0, Math.PI * 2);
      ctx.fillStyle = role ? ACCENT[role.accent] : "#b9922f";
      ctx.fill();

      if (role) {
        ctx.beginPath();
        ctx.arc(X(mmX), Y(z), S(0.95), 0, Math.PI * 2);
        ctx.strokeStyle = K.alpha(ACCENT[role.accent], 0.8);
        ctx.lineWidth = Math.max(1, S(0.16));
        ctx.stroke();
      }

      if (labels && pxPerMm > 9) {
        const ly = side === 0 ? Y(z) - stripHalf - S(0.6) : Y(z) + stripHalf + S(0.6);
        ctx.save();
        ctx.translate(X(mmX), ly);
        ctx.rotate(-Math.PI / 2);
        K.text(ctx, name, 0, 0, {
          font: K.mono(Math.max(6, S(1.15))),
          fill: role ? ACCENT[role.accent] : "#5d6473",
          align: side === 0 ? "left" : "right",
          baseline: "middle",
        });
        ctx.restore();
      }
    }
  });

  // Module PCB
  ctx.fillStyle = "#101318";
  ctx.fillRect(
    X(MODULE.centerX - MODULE.pcbLength / 2),
    Y(-MODULE.pcbWidth / 2),
    S(MODULE.pcbLength),
    S(MODULE.pcbWidth),
  );

  // Meander antenna
  ctx.strokeStyle = "#c9a94a";
  ctx.lineWidth = Math.max(1, S(0.34));
  ctx.beginPath();
  const runs = 7;
  const a0 = ANTENNA.centerX - ANTENNA.length / 2;
  const step = ANTENNA.length / runs;
  let up = true;
  ctx.moveTo(X(a0), Y(-ANTENNA.width / 2));
  for (let i = 0; i < runs; i++) {
    const x0 = a0 + i * step;
    ctx.lineTo(X(x0), Y(up ? ANTENNA.width / 2 : -ANTENNA.width / 2));
    ctx.lineTo(X(x0 + step), Y(up ? ANTENNA.width / 2 : -ANTENNA.width / 2));
    up = !up;
  }
  ctx.stroke();

  // Shield can
  const canCx = MODULE.centerX + 1.2;
  const canGrad = ctx.createLinearGradient(0, Y(-MODULE.canWidth / 2), 0, Y(MODULE.canWidth / 2));
  canGrad.addColorStop(0, "#9aa3ae");
  canGrad.addColorStop(0.35, "#6f7883");
  canGrad.addColorStop(0.6, "#868f9a");
  canGrad.addColorStop(1, "#5d656f");
  K.roundRect(
    ctx,
    X(canCx - MODULE.canLength / 2),
    Y(-MODULE.canWidth / 2),
    S(MODULE.canLength),
    S(MODULE.canWidth),
    S(0.5),
  );
  ctx.fillStyle = canGrad;
  ctx.fill();
  ctx.strokeStyle = "#3d444e";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Stamped dimples on the lid
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      ctx.beginPath();
      ctx.arc(X(canCx + gx * 2.1), Y(gz * 2.4), Math.max(0.8, S(0.25)), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (pxPerMm > 8) {
    K.text(ctx, "ESP32-WROOM-32S", X(canCx), Y(0), {
      font: K.mono(Math.max(6, S(1.25))),
      fill: "rgba(20,24,30,0.75)",
      align: "center",
      baseline: "middle",
    });
  }

  // Micro USB shell
  const usbGrad = ctx.createLinearGradient(0, Y(-USB.width / 2), 0, Y(USB.width / 2));
  usbGrad.addColorStop(0, "#aab2bc");
  usbGrad.addColorStop(0.5, "#7b838d");
  usbGrad.addColorStop(1, "#5f666f");
  K.roundRect(
    ctx,
    X(USB.centerX - USB.length / 2),
    Y(-USB.width / 2),
    S(USB.length),
    S(USB.width),
    S(0.3),
  );
  ctx.fillStyle = usbGrad;
  ctx.fill();
  ctx.fillStyle = "#2b3038";
  ctx.fillRect(X(USB.centerX + USB.length / 2 - 0.5), Y(-USB.width / 2 + 0.9), S(0.5), S(USB.width - 1.8));

  // Surface-mount parts
  for (const [px, pz, plen, pwid, , color] of SMD_PARTS) {
    ctx.fillStyle = color;
    ctx.fillRect(X(px - plen / 2), Y(pz - pwid / 2), S(plen), S(pwid));
  }

  // EN and BOOT tactiles
  for (const b of BUTTONS) {
    ctx.fillStyle = "#15181e";
    ctx.fillRect(X(b.x - 1.5), Y(b.z - 1.5), S(3), S(3));
    ctx.beginPath();
    ctx.arc(X(b.x), Y(b.z), S(0.85), 0, Math.PI * 2);
    ctx.fillStyle = "#8f97a2";
    ctx.fill();
    if (labels && pxPerMm > 9) {
      K.text(ctx, b.label, X(b.x), Y(b.z + 3.4), {
        font: K.mono(Math.max(6, S(1.1))),
        fill: "#5d6473",
        align: "center",
        baseline: "middle",
      });
    }
  }

  // Indicator LEDs: red power, blue user LED on GPIO2
  const leds = [
    { x: 4.6, z: -4.6, color: "#ff4d3d", on: true },
    { x: 4.6, z: -7.4, color: "#4da3ff", on: ledOn },
  ];
  for (const l of leds) {
    if (l.on) K.glow(ctx, X(l.x), Y(l.z), S(3.6), l.color, 0.75);
    ctx.fillStyle = l.on ? l.color : "#2a2f38";
    ctx.fillRect(X(l.x - 0.8), Y(l.z - 0.5), S(1.6), S(1.0));
  }
}

/** The social card, also used as the README hero. */
export function drawSocial(ctx) {
  const W = 1200;
  const H = 630;

  ctx.fillStyle = K.C.pcb;
  ctx.fillRect(0, 0, W, H);
  K.boardGrid(ctx, W, H, 60);

  // A soft amber wash behind the board, so the card has a focal point.
  const wash = ctx.createRadialGradient(830, 330, 0, 830, 330, 460);
  wash.addColorStop(0, K.alpha(K.C.led, 0.1));
  wash.addColorStop(1, K.alpha(K.C.led, 0));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  drawBoardTopDown(ctx, 838, 322, 11.4, { ledOn: true, labels: true });

  // Left column
  K.text(ctx, "ARDUINO / ESP32 / C++", 72, 118, {
    font: K.mono(14),
    fill: K.C.trace,
  });

  K.text(ctx, "smart_led", 72, 196, { font: K.monoBold(62), fill: K.C.ink });

  K.text(ctx, "One sketch, taken apart and", 72, 250, {
    font: K.sans(21),
    fill: K.C.inkDim,
  });
  K.text(ctx, "put back together in the browser.", 72, 280, {
    font: K.sans(21),
    fill: K.C.inkDim,
  });

  const esp = portComparison(100, BOARDS.esp32);
  const ratio = esp.actual / MAP_BOUNDS.outMax;

  const stats = [
    [`${MAP_BOUNDS.outMax}ms`, "documented ceiling", K.C.ok],
    [`${esp.actual}ms`, "same code, 12-bit ADC", K.C.alarm],
    [`${ratio.toFixed(1)}x`, "slower than intended", K.C.led],
  ];
  stats.forEach(([v, label, color], i) => {
    const x = 72 + i * 168;
    K.text(ctx, v, x, 372, { font: K.monoBold(34), fill: color });
    K.text(ctx, label, x, 396, { font: K.mono(11), fill: K.C.inkFaint });
  });

  // Divider
  ctx.strokeStyle = K.C.edge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(72, 434.5);
  ctx.lineTo(560, 434.5);
  ctx.stroke();

  const bullets = [
    "Live firmware bench with a real logic trace",
    "Line by line .ino to .cpp diff",
    "Port lab: what breaks on a 12-bit ADC",
  ];
  bullets.forEach((b, i) => {
    const y = 468 + i * 28;
    ctx.beginPath();
    ctx.arc(78, y - 4, 3, 0, Math.PI * 2);
    ctx.fillStyle = K.C.trace;
    ctx.fill();
    K.text(ctx, b, 92, y, { font: K.sans(15), fill: K.C.inkDim });
  });

  K.text(ctx, "github.com/HarshMehta9000/Arduino-Starter-ESP32-Echokit---C-code-Starters", 72, 574, {
    font: K.mono(12),
    fill: K.C.inkFaint,
  });
}

/** A standalone board plate for the README's hardware section. */
export function drawBoardPlate(ctx) {
  const W = 980;
  const H = 600;
  ctx.fillStyle = K.C.pcb;
  ctx.fillRect(0, 0, W, H);
  K.boardGrid(ctx, W, H, 50);

  K.text(ctx, "ESP32-WROOM-32S / NodeMCU-32S", 28, 38, {
    font: K.monoMed(15),
    fill: K.C.ink,
  });
  K.text(
    ctx,
    `${BOARD.length} x ${BOARD.width} x ${BOARD.thickness}mm, ` +
      `${HEADER.perSide * 2} pins at ${HEADER.pitch}mm pitch`,
    28,
    58,
    { font: K.mono(11), fill: K.C.inkFaint },
  );

  // 15px/mm leaves room above and below for the rotated silkscreen labels.
  drawBoardTopDown(ctx, W / 2, 300, 15.0, { ledOn: true, labels: true });

  ctx.strokeStyle = K.C.edge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 536.5);
  ctx.lineTo(W - 28, 536.5);
  ctx.stroke();

  K.text(ctx, "the three pins this sketch would land on", 28, 528, {
    font: K.mono(10),
    fill: K.C.inkFaint,
  });

  const legend = Object.entries(MAPPED_PINS);
  legend.forEach(([silk, role], i) => {
    const x = 28 + i * 310;
    const y = 566;
    ctx.beginPath();
    ctx.arc(x + 5, y - 4, 5, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT[role.accent];
    ctx.fill();
    K.text(ctx, `${silk} / ${role.label}`, x + 18, y, {
      font: K.monoMed(12),
      fill: K.C.ink,
    });
    K.text(ctx, role.role, x + 18, y + 16, {
      font: K.mono(10),
      fill: K.C.inkFaint,
    });
  });
}

export const SOCIAL = { width: 1200, height: 630, draw: drawSocial };
export const PLATE = { width: 980, height: 600, draw: drawBoardPlate };
