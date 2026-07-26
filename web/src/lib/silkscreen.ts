import * as THREE from "three";
import {
  BOARD,
  HEADER,
  MAPPED_PINS,
  MODULE,
  PINOUT_LEFT,
  PINOUT_RIGHT,
} from "./board-spec";

/**
 * Draws the board's top silkscreen to a canvas and returns it as a texture.
 *
 * Doing this procedurally rather than shipping an image keeps the page free of
 * external assets, and it means the pin labels come from the same array the
 * hover logic reads, so the render and the interaction can never disagree.
 */
export function makeSilkscreenTexture(): THREE.CanvasTexture {
  const pxPerMM = 20;
  const w = Math.round(BOARD.length * pxPerMM);
  const h = Math.round(BOARD.width * pxPerMM);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Solder mask base. A very dark green-black, which is what black boards
  // actually look like under light rather than pure black.
  ctx.fillStyle = "#0b0e11";
  ctx.fillRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "rgba(30, 40, 38, 0.55)");
  grad.addColorStop(0.5, "rgba(14, 18, 20, 0.2)");
  grad.addColorStop(1, "rgba(26, 34, 34, 0.5)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const mmX = (mm: number) => (mm + BOARD.length / 2) * pxPerMM;
  const mmZ = (mm: number) => (mm + BOARD.width / 2) * pxPerMM;

  // Module outline on the silkscreen.
  ctx.strokeStyle = "rgba(215, 220, 228, 0.5)";
  ctx.lineWidth = 1.6;
  ctx.strokeRect(
    mmX(MODULE.centerX - MODULE.pcbLength / 2),
    mmZ(-MODULE.pcbWidth / 2),
    MODULE.pcbLength * pxPerMM,
    MODULE.pcbWidth * pxPerMM,
  );

  // Pin labels along both header rows.
  const startX = -((HEADER.perSide - 1) * HEADER.pitch) / 2;
  ctx.font = `600 ${Math.round(2.0 * pxPerMM)}px ui-monospace, monospace`;
  ctx.textBaseline = "middle";

  const drawRow = (labels: string[], zMM: number, align: "top" | "bottom") => {
    labels.forEach((label, i) => {
      // Labels run from the USB end, which is +X, so walk backwards.
      const x = startX + (HEADER.perSide - 1 - i) * HEADER.pitch;
      const mapped = MAPPED_PINS[label];

      ctx.save();
      ctx.translate(mmX(x), mmZ(zMM));
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = align === "top" ? "left" : "right";

      if (mapped) {
        ctx.fillStyle =
          mapped.accent === "led"
            ? "#ffb020"
            : mapped.accent === "trace"
              ? "#22d3ee"
              : "#e3c766";
      } else {
        ctx.fillStyle = "rgba(226, 232, 240, 0.72)";
      }
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });
  };

  const rowInset = BOARD.width / 2 - 6.4;
  drawRow(PINOUT_LEFT, -rowInset, "bottom");
  drawRow(PINOUT_RIGHT, rowInset, "top");

  // Board name and a couple of reference designators.
  ctx.save();
  ctx.fillStyle = "rgba(226, 232, 240, 0.6)";
  ctx.font = `600 ${Math.round(2.4 * pxPerMM)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.translate(mmX(6.0), mmZ(0));
  ctx.fillText("NodeMCU-32S", 0, 0);
  ctx.restore();

  ctx.fillStyle = "rgba(226, 232, 240, 0.4)";
  ctx.font = `500 ${Math.round(1.5 * pxPerMM)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.fillText("EN", mmX(17.4), mmZ(-13.0));
  ctx.fillText("BOOT", mmX(17.4), mmZ(13.0));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * The meandered inverted-F antenna on the module's exposed PCB tail, drawn as
 * a gold trace on a dark ground.
 */
export function makeAntennaTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 420;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#0f1214";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#d9b64b";
  ctx.lineWidth = 16;
  ctx.lineCap = "square";

  // A meander: five vertical runs joined alternately top and bottom.
  const runs = 5;
  const margin = 34;
  const usable = w - margin * 2;
  const gap = usable / (runs - 1);

  ctx.beginPath();
  for (let i = 0; i < runs; i++) {
    const x = margin + i * gap;
    const top = margin;
    const bottom = h - margin;
    if (i % 2 === 0) {
      ctx.moveTo(x, bottom);
      ctx.lineTo(x, top);
      if (i < runs - 1) ctx.lineTo(x + gap, top);
    } else {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      if (i < runs - 1) ctx.lineTo(x + gap, bottom);
    }
  }
  ctx.stroke();

  // Feed line down to the module edge.
  ctx.beginPath();
  ctx.moveTo(margin, h - margin);
  ctx.lineTo(margin, h - 6);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Brushed-metal noise for the shield can, so it is not a flat grey slab. */
export function makeCanTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#9fa5ad";
  ctx.fillRect(0, 0, size, size);

  // Fine horizontal brushing.
  for (let y = 0; y < size; y++) {
    const v = 150 + Math.floor(Math.random() * 60);
    ctx.strokeStyle = `rgba(${v},${v + 4},${v + 10},0.28)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(size, y + 0.5);
    ctx.stroke();
  }

  // Stamped dimples along the lid, as on a real shield can.
  ctx.fillStyle = "rgba(90, 96, 104, 0.35)";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(40 + i * 44, size / 2, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
