"use client";

import { useEffect, useRef, useState } from "react";
import { useSim } from "@/lib/sim";

/**
 * A rolling logic-analyser trace of the LED pin.
 *
 * It records the real pin state on every animation frame and draws the last
 * WINDOW_MS of history as a square wave, so the period you measure off the
 * screen is the period the firmware is actually producing. The measured period
 * is computed from the recorded edges, not from the interval variable, which
 * makes it an independent check on the simulation rather than a restatement.
 */

const WINDOW_MS = 4000;
const MAX_SAMPLES = 1600;

type Sample = { t: number; on: boolean };

export default function Scope({ height = 120 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samplesRef = useRef<Sample[]>([]);
  const { state, millis, running } = useSim();

  /** Period measured off the recorded edges, refreshed from the draw loop. */
  const [measured, setMeasured] = useState<number | null>(null);

  // The draw loop reads the latest simulation values through refs, which are
  // synced in an effect so the render body stays pure.
  const stateRef = useRef(state);
  const millisRef = useRef(millis);
  useEffect(() => {
    stateRef.current = state;
    millisRef.current = millis;
  });

  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastMeasure = -Infinity;

    const draw = () => {
      raf = requestAnimationFrame(draw);

      const now = millisRef.current;
      const on = stateRef.current.ledState;
      const s = samplesRef.current;

      const lastS = s[s.length - 1];
      if (!lastS || lastS.on !== on || now - lastS.t > 40) {
        s.push({ t: now, on });
        if (s.length > MAX_SAMPLES) s.splice(0, s.length - MAX_SAMPLES);
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const t0 = now - WINDOW_MS;
      const x = (t: number) => ((t - t0) / WINDOW_MS) * w;
      const padY = 16;
      const yHigh = padY;
      const yLow = h - padY;

      // Grid: one line per 500ms.
      ctx.strokeStyle = "rgba(42, 49, 62, 0.7)";
      ctx.lineWidth = 1;
      const firstTick = Math.ceil(t0 / 500) * 500;
      for (let t = firstTick; t <= now; t += 500) {
        const px = Math.round(x(t)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.stroke();
      }

      // Rails
      ctx.strokeStyle = "rgba(42, 49, 62, 0.9)";
      ctx.setLineDash([3, 4]);
      [yHigh, yLow].forEach((y) => {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // The waveform
      const visible = s.filter((p) => p.t >= t0 - 200);
      if (visible.length) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffb020";
        let prevY = visible[0].on ? yHigh : yLow;
        ctx.moveTo(x(visible[0].t), prevY);
        for (const p of visible) {
          const y = p.on ? yHigh : yLow;
          const px = x(p.t);
          if (y !== prevY) {
            ctx.lineTo(px, prevY);
            ctx.lineTo(px, y);
            prevY = y;
          } else {
            ctx.lineTo(px, y);
          }
        }
        ctx.lineTo(x(now), prevY);
        ctx.stroke();

        // Glow under the high sections.
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "#ffb020";
        ctx.lineTo(x(now), yLow);
        ctx.lineTo(x(visible[0].t), yLow);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Labels
      ctx.fillStyle = "#626b7a";
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText("HIGH", 4, yHigh - 4);
      ctx.fillText("LOW", 4, yLow + 11);
      ctx.textAlign = "right";
      ctx.fillText(`${WINDOW_MS / 1000}s window`, w - 4, h - 4);
      ctx.textAlign = "left";

      // Measure the period straight off the recorded edges. Refreshed a few
      // times a second rather than every frame, since it only feeds a readout.
      if (now - lastMeasure > 250) {
        lastMeasure = now;
        const edges: number[] = [];
        for (let k = 1; k < s.length; k++) {
          if (s[k].on !== s[k - 1].on) edges.push(s[k].t);
        }
        if (edges.length >= 3) {
          const recent = edges.slice(-6);
          const gaps: number[] = [];
          for (let k = 1; k < recent.length; k++) {
            gaps.push(recent[k] - recent[k - 1]);
          }
          if (gaps.length) {
            setMeasured(Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length));
          }
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="border-edge bg-pcb overflow-hidden rounded-lg border">
      <div className="border-edge text-ink-faint flex items-center justify-between border-b px-3 py-2 font-mono text-[10px]">
        <span>digitalWrite trace</span>
        <span className="flex items-center gap-3">
          <span>
            computed <span className="text-trace">{state.interval}ms</span>
          </span>
          <span>
            measured{" "}
            <span className="text-led">{measured != null ? `${measured}ms` : "..."}</span>
          </span>
          {!running && <span className="text-alarm">paused</span>}
        </span>
      </div>
      <canvas ref={canvasRef} className="block w-full" style={{ height }} />
    </div>
  );
}
