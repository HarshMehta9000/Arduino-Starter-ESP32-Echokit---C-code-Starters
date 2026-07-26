"use client";

import { useEffect, useRef, useState } from "react";
import { useSim } from "@/lib/sim";
import { DEBOUNCE_MS } from "@/lib/firmware";

/**
 * The body of loop(), lit up as it runs.
 *
 * Every row corresponds to a real statement in smart_led.ino. The row is active
 * when that branch is actually taken in the current pass, so the red stall row
 * is not decoration: it appears exactly when the sketch is sitting inside
 * delay(50) and doing nothing else.
 */

type Row = {
  code: string;
  indent: number;
  key: "read" | "edge" | "stall" | "map" | "gate" | "toggle" | "solid" | "write" | "log";
};

const ROWS: Row[] = [
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

export default function LoopTrace() {
  const { state, stalling, stalledMs, ledWriteCount, serial, serialLogging, millis } =
    useSim();

  // Flash the write and log rows briefly when they fire.
  const [wroteFlash, setWroteFlash] = useState(false);
  const [logFlash, setLogFlash] = useState(false);
  const lastWrite = useRef(ledWriteCount);
  const lastLog = useRef(serial.length);

  useEffect(() => {
    if (ledWriteCount !== lastWrite.current) {
      lastWrite.current = ledWriteCount;
      setWroteFlash(true);
      const t = window.setTimeout(() => setWroteFlash(false), 110);
      return () => window.clearTimeout(t);
    }
  }, [ledWriteCount]);

  useEffect(() => {
    if (serial.length !== lastLog.current) {
      lastLog.current = serial.length;
      setLogFlash(true);
      const t = window.setTimeout(() => setLogFlash(false), 260);
      return () => window.clearTimeout(t);
    }
  }, [serial.length]);

  const isActive = (key: Row["key"]) => {
    switch (key) {
      case "read":
      case "map":
      case "gate":
        return !stalling;
      case "edge":
        return stalling;
      case "stall":
        return stalling;
      case "toggle":
        return wroteFlash && state.modeToggle;
      case "solid":
        return wroteFlash && !state.modeToggle;
      case "write":
        return wroteFlash;
      case "log":
        return logFlash && serialLogging;
      default:
        return false;
    }
  };

  const stallRemaining = stalling
    ? Math.max(0, Math.round(state.stallUntil - millis))
    : 0;

  const stallPercent = millis > 0 ? (stalledMs / millis) * 100 : 0;

  return (
    <div className="border-edge bg-pcb overflow-hidden rounded-lg border">
      <div className="border-edge text-ink-faint flex items-center justify-between border-b px-3 py-2 font-mono text-[10px]">
        <span>void loop()</span>
        <span className="flex items-center gap-3">
          {stalling ? (
            <span className="text-alarm">blocked {stallRemaining}ms</span>
          ) : (
            <span className="text-ok">running</span>
          )}
        </span>
      </div>

      <div className="px-3 py-2.5">
        {ROWS.map((r, i) => {
          const active = isActive(r.key);
          const isStall = r.key === "stall";
          return (
            <div
              key={i}
              className={`-mx-1 rounded px-1 font-mono text-[11px] leading-[1.65] whitespace-pre transition-colors duration-100 ${
                active
                  ? isStall
                    ? "bg-alarm/20 text-alarm"
                    : "bg-trace/12 text-ink"
                  : "text-ink-faint"
              }`}
            >
              {"  ".repeat(r.indent)}
              {r.code}
              {isStall && active && (
                <span className="text-alarm/70"> {"<- loop is stopped here"}</span>
              )}
            </div>
          );
        })}
        {!serialLogging && (
          <div className="text-ink-faint mt-1.5 -mx-1 px-1 font-mono text-[10px]">
            (the .cpp build has no Serial.println line)
          </div>
        )}
      </div>

      <div className="border-edge grid grid-cols-3 gap-px border-t">
        <div className="bg-panel-2 px-3 py-2">
          <div className="text-ink font-mono text-sm tabular-nums">
            {stalledMs}ms
          </div>
          <div className="text-ink-faint mt-0.5 font-mono text-[10px]">
            lost to delay()
          </div>
        </div>
        <div className="bg-panel-2 px-3 py-2">
          <div className="text-ink font-mono text-sm tabular-nums">
            {stallPercent.toFixed(1)}%
          </div>
          <div className="text-ink-faint mt-0.5 font-mono text-[10px]">
            of uptime blocked
          </div>
        </div>
        <div className="bg-panel-2 px-3 py-2">
          <div className="text-ink font-mono text-sm tabular-nums">
            {DEBOUNCE_MS}ms
          </div>
          <div className="text-ink-faint mt-0.5 font-mono text-[10px]">
            per press
          </div>
        </div>
      </div>
    </div>
  );
}
