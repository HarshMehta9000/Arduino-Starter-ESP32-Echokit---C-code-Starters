"use client";

import { motion } from "framer-motion";
import { ArrowDown, Cpu, GitBranch } from "lucide-react";
import { useSim } from "@/lib/sim";
import { BAUD } from "@/lib/firmware";
import { DIFF_STATS } from "@/lib/diff";
import { SEVERITY_COUNTS } from "@/lib/findings";
import { MAPPED_PINS } from "@/lib/board-spec";
import BoardCanvas from "./BoardCanvas";

const REPO_URL =
  "https://github.com/HarshMehta9000/Arduino-Starter-ESP32-Echokit---C-code-Starters";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-edge bg-panel/60 rounded-lg border px-3 py-2.5">
      <div className="text-ink font-mono text-lg leading-none tabular-nums">
        {value}
      </div>
      <div className="text-ink-faint mt-1.5 text-[11px] tracking-wide uppercase">
        {label}
      </div>
    </div>
  );
}

export default function Hero() {
  const { state, serial, millis } = useSim();
  const last = serial[serial.length - 1];

  return (
    <section id="top" className="relative overflow-hidden pt-24 pb-14 sm:pt-32 sm:pb-20">
      <div className="board-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="from-pcb pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="border-edge bg-panel/70 text-ink-dim inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px]"
            >
              <Cpu className="text-trace h-3.5 w-3.5" />
              {DIFF_STATS.inoLines + DIFF_STATS.cppLines} lines of firmware, running
              in your browser
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl"
            >
              An LED controller,
              <br />
              <span className="text-led">taken seriously.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="text-ink-dim mt-5 max-w-xl text-[15px] leading-relaxed"
            >
              A button, a potentiometer and one LED. The sketch is small enough to
              read in a minute, which makes it a good place to be precise. Every
              number here is recomputed from the real{" "}
              <code className="text-trace font-mono text-[13px]">smart_led.ino</code>,
              including the integer truncation inside{" "}
              <code className="text-trace font-mono text-[13px]">map()</code>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <a
                href="#bench"
                className="bg-led text-pcb inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-transform hover:scale-[1.02]"
              >
                Run the firmware
                <ArrowDown className="h-4 w-4" />
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="border-edge-2 text-ink hover:bg-panel-2 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors"
              >
                <GitBranch className="h-4 w-4" />
                Source
              </a>
            </motion.div>

            {/* Live strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="border-edge bg-panel/70 mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border px-4 py-3 font-mono text-[11px]"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full transition-colors duration-75 ${
                    state.ledState ? "bg-led led-glow" : "bg-edge-2"
                  }`}
                />
                <span className="text-ink-faint">GPIO2</span>
                <span className={state.ledState ? "text-led" : "text-ink-faint"}>
                  {state.ledState ? "HIGH" : "LOW"}
                </span>
              </span>
              <span className="text-ink-faint">
                interval <span className="text-trace">{state.interval}ms</span>
              </span>
              <span className="text-ink-faint">
                mode{" "}
                <span className="text-ink">
                  {state.modeToggle ? "BLINK" : "SOLID"}
                </span>
              </span>
              <span className="text-ink-faint hidden sm:inline">
                serial {last ? last.text : "..."} @ {BAUD}
              </span>
              <span className="text-ink-faint ml-auto tabular-nums">
                millis {(millis / 1000).toFixed(1)}s
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-4 grid max-w-lg grid-cols-2 gap-2.5 sm:grid-cols-4"
            >
              <Stat label="Sketch lines" value={String(DIFF_STATS.inoLines)} />
              <Stat label="Port lines" value={String(DIFF_STATS.cppLines)} />
              <Stat
                label="Real diffs"
                value={String(DIFF_STATS.added + DIFF_STATS.removed)}
              />
              <Stat
                label="Review flags"
                value={String(SEVERITY_COUNTS.bug + SEVERITY_COUNTS.risk)}
              />
            </motion.div>
          </div>

          {/* The board */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="border-edge bg-panel/60 relative overflow-hidden rounded-2xl border backdrop-blur-sm"
          >
            <BoardCanvas height={520} autoRotate />

            <div className="border-edge grid grid-cols-3 gap-px border-t">
              {Object.entries(MAPPED_PINS).map(([silk, p]) => (
                <div key={silk} className="bg-panel-2 px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        p.accent === "led"
                          ? "bg-led"
                          : p.accent === "trace"
                            ? "bg-trace"
                            : "bg-gold"
                      }`}
                    />
                    <span className="text-ink font-mono text-[11px]">{p.label}</span>
                  </div>
                  <div className="text-ink-faint mt-1 font-mono text-[10px]">
                    silk {silk} · {p.role.split(",")[0]}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
