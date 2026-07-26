"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { useSim } from "@/lib/sim";
import { BOARDS, intervalFromPot } from "@/lib/firmware";

/**
 * Scripted demonstrations. Each one drives the same two inputs a person would,
 * so nothing here bypasses the firmware: the script moves the knob, the sketch
 * decides what that means.
 *
 * These exist because two of the interesting behaviours are hard to stumble on
 * by hand. The debounce stall only shows up if you press the button repeatedly,
 * and the full sweep is what makes the truncation staircase visible.
 */

type Keyframe = { atMs: number; pot?: number; press?: boolean };

type Scenario = {
  id: string;
  label: string;
  blurb: string;
  durationMs: number;
  frames: Keyframe[];
};

function buildScenarios(adcMax: number): Scenario[] {
  const sweep: Keyframe[] = [];
  // 24 steps across the full travel, quick enough to read on camera.
  for (let i = 0; i <= 24; i++) {
    sweep.push({ atMs: i * 190, pot: Math.round((i / 24) * adcMax) });
  }

  return [
    {
      id: "sweep",
      label: "Full sweep",
      blurb:
        "Walks the knob from stop to stop. The trace stretches as the interval climbs from 100ms to 1000ms.",
      durationMs: 24 * 190 + 600,
      frames: sweep,
    },
    {
      id: "modes",
      label: "Mode flip",
      blurb:
        "Presses the button at a slow setting, so the gap between the press and the LED responding is visible.",
      durationMs: 5200,
      frames: [
        { atMs: 0, pot: Math.round(adcMax * 0.85) },
        { atMs: 900, press: true },
        { atMs: 2600, press: true },
        { atMs: 4200, press: true },
      ],
    },
    {
      id: "debounce",
      label: "Stress the debounce",
      blurb:
        "Six presses in quick succession. Each one costs 50ms of blocked loop time, and the trace shows the blink stuttering.",
      durationMs: 4200,
      frames: [
        { atMs: 0, pot: Math.round(adcMax * 0.12) },
        { atMs: 500, press: true },
        { atMs: 900, press: true },
        { atMs: 1300, press: true },
        { atMs: 1700, press: true },
        { atMs: 2100, press: true },
        { atMs: 2500, press: true },
      ],
    },
  ];
}

export default function Scenarios() {
  const { setPotValue, pressButton, boardId, setRunning } = useSim();
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);

  const scenarios = buildScenarios(BOARDS[boardId].adcMax);

  const clearAll = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => clearAll, []);

  const stop = () => {
    clearAll();
    setActive(null);
    setProgress(0);
  };

  const run = (s: Scenario) => {
    clearAll();
    setRunning(true);
    setActive(s.id);
    setProgress(0);

    s.frames.forEach((f) => {
      timers.current.push(
        window.setTimeout(() => {
          if (f.pot !== undefined) setPotValue(f.pot);
          if (f.press) pressButton();
        }, f.atMs),
      );
    });

    // Progress ticker, 20 steps is enough for a smooth bar.
    for (let i = 1; i <= 20; i++) {
      timers.current.push(
        window.setTimeout(() => setProgress(i / 20), (s.durationMs / 20) * i),
      );
    }
    timers.current.push(
      window.setTimeout(() => {
        setActive(null);
        setProgress(0);
      }, s.durationMs),
    );
  };

  const activeScenario = scenarios.find((s) => s.id === active);

  return (
    <div className="border-edge bg-panel rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm">Scripted runs</h3>
        {active && (
          <button
            onClick={stop}
            className="border-edge-2 text-ink-dim hover:text-ink inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px]"
          >
            <Square className="h-2.5 w-2.5" /> stop
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => run(s)}
            className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-colors ${
              active === s.id
                ? "border-led/50 bg-led/10"
                : "border-edge-2 hover:bg-panel-2"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Play
                className={`h-3 w-3 ${
                  active === s.id ? "text-led" : "text-ink-faint"
                }`}
              />
              <span className="font-mono text-[11px]">{s.label}</span>
            </span>
            {active === s.id && (
              <span
                className="bg-led absolute bottom-0 left-0 h-0.5 transition-[width] duration-150 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            )}
          </button>
        ))}
      </div>

      <p className="text-ink-faint mt-3 min-h-[2.5rem] text-xs leading-relaxed">
        {activeScenario
          ? activeScenario.blurb
          : "Pick a run, or drive the knob and button yourself above."}
      </p>

      <div className="border-edge bg-pcb mt-1 rounded-lg border px-3 py-2">
        <div className="text-ink-faint font-mono text-[10px]">
          full travel produces
        </div>
        <div className="mt-1 font-mono text-[11px]">
          <span className="text-trace">{intervalFromPot(0)}ms</span>
          <span className="text-ink-faint"> at rest, </span>
          <span className="text-led">
            {intervalFromPot(BOARDS.uno.adcMax)}ms
          </span>
          <span className="text-ink-faint"> wide open</span>
        </div>
      </div>
    </div>
  );
}
