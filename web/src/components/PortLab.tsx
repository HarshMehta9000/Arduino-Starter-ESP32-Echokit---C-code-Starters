"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TriangleAlert, Check } from "lucide-react";
import { BOARDS, MAP_BOUNDS, portComparison, type BoardId } from "@/lib/firmware";
import Section from "./Section";

/**
 * Interactive element 4: the port lab.
 *
 * Sweep the knob and watch what the unmodified sketch computes on each board.
 * The Uno trace stays inside the documented band. The ESP32 trace leaves it,
 * because map() is pinned to 1023 while analogRead() now returns up to 4095.
 */

const SAMPLES = 41; // knob positions sampled across the sweep

function Curve({ boardId, knob }: { boardId: BoardId; knob: number }) {
  const board = BOARDS[boardId];
  const w = 320;
  const h = 150;
  const pad = 6;

  // Chart to the worst case so both boards share one vertical scale.
  const yMax = Math.max(1000, portComparison(100, BOARDS.esp32).actual);

  const pts = Array.from({ length: SAMPLES }, (_, i) => {
    const pct = (i / (SAMPLES - 1)) * 100;
    const { actual } = portComparison(pct, board);
    const x = pad + (pct / 100) * (w - pad * 2);
    const y = h - pad - (actual / yMax) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const here = portComparison(knob, board);
  const cx = pad + (knob / 100) * (w - pad * 2);
  const cy = h - pad - (here.actual / yMax) * (h - pad * 2);
  const bandY = h - pad - (MAP_BOUNDS.outMax / yMax) * (h - pad * 2);

  const accent = here.overshoots ? "#ff5f56" : "#3fd18b";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img"
      aria-label={`${board.name}: knob at ${knob} percent produces ${here.actual} milliseconds`}>
      {/* Documented ceiling */}
      <line
        x1={pad}
        y1={bandY}
        x2={w - pad}
        y2={bandY}
        stroke="#2a313e"
        strokeDasharray="4 4"
      />
      <text x={pad + 2} y={bandY - 5} fill="#626b7a" fontSize="9" fontFamily="monospace">
        1000ms documented ceiling
      </text>

      <polyline points={pts} fill="none" stroke={accent} strokeWidth="2" />
      <circle cx={cx} cy={cy} r="4.5" fill={accent} />
      <circle cx={cx} cy={cy} r="9" fill={accent} opacity="0.18" />
    </svg>
  );
}

export default function PortLab() {
  const [knob, setKnob] = useState(100);

  const uno = portComparison(knob, BOARDS.uno);
  const esp = portComparison(knob, BOARDS.esp32);

  return (
    <Section
      id="port"
      eyebrow="Interactive 03"
      title="Porting it to the board on the label"
      lede="This repository is named for the ESP32, and the sketch inside targets an Uno. Recompiling it unchanged is not a no-op, because one hardcoded number stops being true. Sweep the knob to see where it breaks."
    >
      <div className="border-edge bg-panel rounded-xl border p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <label htmlFor="knob" className="text-ink-dim font-mono text-xs">
            knob position, both boards
          </label>
          <span className="text-ink font-mono text-sm tabular-nums">{knob}%</span>
        </div>
        <input
          id="knob"
          type="range"
          className="pot mt-3 w-full"
          min={0}
          max={100}
          value={knob}
          onChange={(e) => setKnob(Number(e.target.value))}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(
            [
              { id: "uno" as BoardId, res: uno },
              { id: "esp32" as BoardId, res: esp },
            ]
          ).map(({ id, res }) => {
            const board = BOARDS[id];
            return (
              <div
                key={id}
                className={`rounded-xl border p-4 transition-colors ${
                  res.overshoots
                    ? "border-alarm/40 bg-alarm/5"
                    : "border-edge bg-panel-2"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-sm">{board.name}</h3>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] ${
                      res.overshoots
                        ? "bg-alarm/15 text-alarm"
                        : "bg-ok/15 text-ok"
                    }`}
                  >
                    {res.overshoots ? (
                      <>
                        <TriangleAlert className="h-3 w-3" /> out of range
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" /> in range
                      </>
                    )}
                  </span>
                </div>

                <div className="mt-3">
                  <Curve boardId={id} knob={knob} />
                </div>

                <div className="border-edge mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border">
                  <div className="bg-panel px-2 py-2 text-center">
                    <div className="text-ink font-mono text-sm tabular-nums">
                      {res.raw}
                    </div>
                    <div className="text-ink-faint mt-0.5 font-mono text-[10px]">
                      analogRead
                    </div>
                  </div>
                  <div className="bg-panel px-2 py-2 text-center">
                    <div
                      className={`font-mono text-sm tabular-nums ${
                        res.overshoots ? "text-alarm" : "text-ink"
                      }`}
                    >
                      {res.actual}
                    </div>
                    <div className="text-ink-faint mt-0.5 font-mono text-[10px]">
                      sketch says
                    </div>
                  </div>
                  <div className="bg-panel px-2 py-2 text-center">
                    <div className="text-ok font-mono text-sm tabular-nums">
                      {res.corrected}
                    </div>
                    <div className="text-ink-faint mt-0.5 font-mono text-[10px]">
                      intended
                    </div>
                  </div>
                </div>

                <p className="text-ink-dim mt-3 font-mono text-[11px]">
                  map(x, 0, {MAP_BOUNDS.inMax}, ...) with x up to {board.adcMax}
                </p>
              </div>
            );
          })}
        </div>

        <motion.div
          key={esp.overshoots ? "over" : "ok"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-edge bg-pcb mt-5 rounded-lg border p-4"
        >
          {esp.overshoots ? (
            <p className="text-ink-dim text-[13px] leading-relaxed">
              At this position the ESP32 build blinks at{" "}
              <span className="text-alarm font-mono">{esp.actual}ms</span> where the
              sketch intends{" "}
              <span className="text-ok font-mono">{esp.corrected}ms</span>, a drift of{" "}
              <span className="text-ink font-mono">{esp.drift}ms</span>. The knob still
              turns and the LED still blinks, so nothing looks broken. It is just
              slower than the documentation says, by up to{" "}
              {(portComparison(100, BOARDS.esp32).actual / MAP_BOUNDS.outMax).toFixed(1)}
              x at full scale.
            </p>
          ) : (
            <p className="text-ink-dim text-[13px] leading-relaxed">
              Below roughly a quarter turn the two boards agree, because a 12-bit
              reading in that range still lands inside the 10-bit span the sketch was
              written against. The failure only appears once you turn the knob up,
              which is what makes it easy to miss on the bench.
            </p>
          )}
        </motion.div>

        {/* Pin moves that come with the board change */}
        <div className="border-edge mt-4 rounded-lg border p-4">
          <h3 className="font-mono text-sm">The pins move too</h3>
          <p className="text-ink-dim mt-2 text-[13px] leading-relaxed">
            Beyond the ADC width, the three pin constants at the top of the sketch
            all change. These are the ESP32 equivalents, hover the matching headers
            on the board above to find them.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              { k: "ledPin", uno: "13", esp: BOARDS.esp32.ledPin, dot: "bg-led" },
              { k: "buttonPin", uno: "2", esp: BOARDS.esp32.buttonPin, dot: "bg-trace" },
              { k: "potPin", uno: "A0", esp: BOARDS.esp32.potPin, dot: "bg-gold" },
            ].map((row) => (
              <div
                key={row.k}
                className="border-edge bg-panel-2 rounded-lg border px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${row.dot}`} />
                  <span className="text-ink-dim font-mono text-[11px]">{row.k}</span>
                </div>
                <div className="mt-1.5 font-mono text-[11px]">
                  <span className="text-ink-faint">{row.uno}</span>
                  <span className="text-ink-faint"> to </span>
                  <span className="text-ink">{row.esp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
