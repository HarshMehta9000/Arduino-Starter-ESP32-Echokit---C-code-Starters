"use client";

import { useEffect, useRef } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useSim } from "@/lib/sim";
import { BOARDS, MAP_BOUNDS, PINS, potPercent } from "@/lib/firmware";
import Section from "./Section";
import Scope from "./Scope";
import LoopTrace from "./LoopTrace";
import Scenarios from "./Scenarios";

/**
 * Interactive element 1: the firmware bench.
 *
 * The knob and the button are the sketch's only two inputs, so this is the whole
 * program exposed. Everything reacts through the shared simulation, which means
 * the board in the hero blinks on exactly the same schedule.
 */
export default function Bench() {
  const {
    potValue,
    setPotValue,
    pressButton,
    buttonDown,
    state,
    serial,
    running,
    setRunning,
    boardId,
    modeChanges,
  } = useSim();

  const board = BOARDS[boardId];
  const tapeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tapeRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [serial]);

  const pct = potPercent(potValue, board.adcMax);

  return (
    <Section
      id="bench"
      eyebrow="Interactive 01"
      title="The bench"
      lede="Drag the trimmer and press the button. The interval readout is the result of the sketch's own map() call, integer truncation included. The trace underneath is measured off the pin, so it is an independent check rather than a restatement of the same number."
    >
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left: inputs */}
        <div className="flex flex-col gap-4">
          <div className="border-edge bg-panel rounded-xl border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-mono text-sm">Inputs</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRunning(!running)}
                  className="border-edge-2 text-ink-dim hover:text-ink hover:bg-panel-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors"
                >
                  {running ? (
                    <>
                      <Pause className="h-3 w-3" /> pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" /> resume
                    </>
                  )}
                </button>
                <button
                  onClick={() => setPotValue(Math.round(board.adcMax / 2))}
                  className="border-edge-2 text-ink-dim hover:text-ink hover:bg-panel-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> centre
                </button>
              </div>
            </div>

            {/* Potentiometer */}
            <div className="border-edge bg-panel-2 mt-4 rounded-lg border p-4">
              <div className="flex items-baseline justify-between">
                <label htmlFor="pot" className="text-ink-dim font-mono text-xs">
                  analogRead({PINS.pot})
                </label>
                <span className="text-ink font-mono text-sm tabular-nums">
                  {potValue}
                  <span className="text-ink-faint"> / {board.adcMax}</span>
                </span>
              </div>

              <input
                id="pot"
                type="range"
                className="pot mt-4 w-full"
                min={0}
                max={board.adcMax}
                value={potValue}
                onChange={(e) => setPotValue(Number(e.target.value))}
                aria-valuetext={`${potValue} of ${board.adcMax}, ${state.interval} milliseconds`}
              />

              <div className="text-ink-faint mt-3 flex justify-between font-mono text-[10px]">
                <span>0</span>
                <span>{pct}% of full scale</span>
                <span>{board.adcMax}</span>
              </div>
            </div>

            {/* Button */}
            <div className="border-edge bg-panel-2 mt-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-ink-dim font-mono text-xs">
                    digitalRead(D{PINS.button})
                  </div>
                  <p className="text-ink-faint mt-1.5 text-xs">
                    Rising edge flips the mode, then the sketch blocks for 50ms.
                  </p>
                  <p className="text-ink-faint mt-2 font-mono text-[10px]">
                    {modeChanges} mode {modeChanges === 1 ? "change" : "changes"}
                  </p>
                </div>
                <button
                  onClick={pressButton}
                  aria-pressed={buttonDown}
                  className={`relative h-16 w-16 shrink-0 rounded-full border-2 font-mono text-[10px] transition-all active:scale-95 ${
                    buttonDown
                      ? "border-led bg-led/25 text-led scale-95"
                      : "border-edge-2 bg-panel text-ink-dim hover:border-ink-faint"
                  }`}
                >
                  {buttonDown ? "HIGH" : "PRESS"}
                </button>
              </div>
            </div>

            {/* The computation, spelled out */}
            <div className="border-edge bg-pcb mt-3 overflow-x-auto rounded-lg border p-4">
              <div className="text-ink-faint font-mono text-[10px]">
                the sketch computes
              </div>
              <code className="mt-2 block font-mono text-xs whitespace-nowrap">
                <span className="text-ink-dim">interval = map(</span>
                <span className="text-led">{potValue}</span>
                <span className="text-ink-dim">
                  , {MAP_BOUNDS.inMin}, {MAP_BOUNDS.inMax}, {MAP_BOUNDS.outMin},{" "}
                  {MAP_BOUNDS.outMax})
                </span>
              </code>
              <code className="text-ink-faint mt-1.5 block font-mono text-xs whitespace-nowrap">
                = trunc({potValue} * {MAP_BOUNDS.outMax - MAP_BOUNDS.outMin} /{" "}
                {MAP_BOUNDS.inMax}) + {MAP_BOUNDS.outMin} ={" "}
                <span className="text-trace">{state.interval}</span>
              </code>
            </div>
          </div>

          <Scenarios />
        </div>

        {/* Right: outputs */}
        <div className="flex flex-col gap-4">
          <div className="border-edge bg-panel rounded-xl border p-5">
            <div className="flex items-center gap-5">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                {state.ledState && (
                  <span className="border-led/40 pulse-ring absolute h-20 w-20 rounded-full border" />
                )}
                <div
                  className={`h-14 w-14 rounded-full transition-all duration-75 ${
                    state.ledState
                      ? "bg-led led-glow"
                      : "bg-edge-2/60 border-edge border"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-ink font-mono text-3xl tabular-nums">
                  {state.interval}
                  <span className="text-ink-faint text-base">ms</span>
                </div>
                <div className="border-edge mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-md border">
                  {[
                    { k: "mode", v: state.modeToggle ? "BLINK" : "SOLID" },
                    { k: "ledState", v: state.ledState ? "HIGH" : "LOW" },
                    { k: "pin", v: `D${PINS.led}` },
                  ].map((c) => (
                    <div key={c.k} className="bg-panel-2 px-2 py-1.5 text-center">
                      <div className="text-ink font-mono text-[11px]">{c.v}</div>
                      <div className="text-ink-faint mt-0.5 font-mono text-[9px]">
                        {c.k}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Scope height={120} />
            </div>
          </div>

          <LoopTrace />

          {/* Serial monitor */}
          <div className="border-edge bg-pcb rounded-xl border">
            <div className="border-edge text-ink-faint flex items-center justify-between border-b px-3 py-2 font-mono text-[10px]">
              <span>Serial Monitor</span>
              <span>{serial.length} lines</span>
            </div>
            <div
              ref={tapeRef}
              className="h-32 overflow-y-auto px-3 py-2 font-mono text-xs"
            >
              {serial.length === 0 && (
                <div className="text-ink-faint">waiting for first print...</div>
              )}
              {serial.map((line, i) => (
                <div key={`${line.t}-${i}`} className="flex gap-3 py-0.5">
                  <span className="text-ink-faint tabular-nums">
                    {(line.t / 1000).toFixed(0).padStart(3, " ")}s
                  </span>
                  <span className="text-trace tabular-nums">{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
