"use client";

import { useSim } from "@/lib/sim";
import { BAUD, PINS } from "@/lib/firmware";

const REPO_URL =
  "https://github.com/HarshMehta9000/Arduino-Starter-ESP32-Echokit---C-code-Starters";

export default function Footer() {
  const { millis, interactions, state } = useSim();

  return (
    <footer className="border-edge mt-8 border-t">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className={`h-2.5 w-2.5 rounded-full transition-colors duration-75 ${
                  state.ledState ? "bg-led led-glow" : "bg-edge-2"
                }`}
              />
              <span className="font-mono text-sm">smart_led</span>
            </div>
            <p className="text-ink-dim mt-3 max-w-md text-[13px] leading-relaxed">
              Every figure on this page is computed in the browser from the
              committed firmware. There is no backend, no API key and no recorded
              data, so the numbers change when you change the inputs, the same way
              the hardware would.
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-trace hover:text-trace-soft mt-4 inline-block font-mono text-[13px] transition-colors"
            >
              View the repository
            </a>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 font-mono text-[11px] sm:grid-cols-3">
            {[
              { k: "LED pin", v: `D${PINS.led}` },
              { k: "Button pin", v: `D${PINS.button}` },
              { k: "Pot pin", v: PINS.pot },
              { k: "Baud", v: String(BAUD) },
              { k: "Uptime", v: `${(millis / 1000).toFixed(0)}s` },
              { k: "Inputs", v: String(interactions) },
            ].map((s) => (
              <div key={s.k}>
                <div className="text-ink tabular-nums">{s.v}</div>
                <div className="text-ink-faint mt-0.5">{s.k}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-edge text-ink-faint mt-8 border-t pt-6 font-mono text-[11px]">
          Built from the repository source. Board pin references are standard ESP32
          documentation, not inferred from the sketch.
        </div>
      </div>
    </footer>
  );
}
