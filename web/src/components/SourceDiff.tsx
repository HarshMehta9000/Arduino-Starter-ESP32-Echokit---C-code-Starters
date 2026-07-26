"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, TriangleAlert } from "lucide-react";
import { useSim } from "@/lib/sim";
import { DIFF_ROWS, DIFF_STATS, CPP_HAS_SERIAL_LOG } from "@/lib/diff";
import { INO_LINES, CPP_LINES } from "@/lib/source";
import { tokenize, TOKEN_CLASS } from "@/lib/highlight";
import { noteFor, BUILD_STEPS } from "@/lib/diff-notes";
import Section from "./Section";

/**
 * Interactive element 2: the real diff.
 *
 * The rows come from an LCS diff of the two committed files, computed in the
 * browser at load. Toggling the running build here also changes what the bench
 * prints, because the .cpp genuinely lacks the logging block.
 */

type View = "unified" | "split";

function Code({ text }: { text: string }) {
  const tokens = useMemo(() => tokenize(text), [text]);
  if (!text) return <span> </span>;
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} className={TOKEN_CLASS[t.kind]}>
          {t.text}
        </span>
      ))}
    </>
  );
}

function Gutter({ n }: { n: number | null }) {
  return (
    <span className="text-ink-faint inline-block w-8 shrink-0 pr-2 text-right tabular-nums select-none">
      {n ?? ""}
    </span>
  );
}

export default function SourceDiff() {
  const [view, setView] = useState<View>("unified");
  const [onlyChanged, setOnlyChanged] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const { serialLogging, setSerialLogging } = useSim();

  const rows = useMemo(
    () => (onlyChanged ? DIFF_ROWS.filter((r) => r.op !== "same") : DIFF_ROWS),
    [onlyChanged],
  );

  const selectedNote = selected ? noteFor(selected) : null;

  const rowClass = (op: string) =>
    op === "add"
      ? "bg-ok/10 border-l-2 border-ok"
      : op === "del"
        ? "bg-alarm/10 border-l-2 border-alarm"
        : "border-l-2 border-transparent";

  return (
    <Section
      id="diff"
      eyebrow="Interactive 02"
      title="What actually changed in the C++ port"
      lede="Both files claim to be the same program in two dialects. Diffing them line by line shows that is not quite true, and the difference is not the one the README advertises. Click any changed line for the reason."
    >
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="border-edge bg-panel overflow-hidden rounded-xl border">
          <div className="border-edge flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-alarm">{DIFF_STATS.removed} only in .ino</span>
              <span className="text-ok">{DIFF_STATS.added} only in .cpp</span>
              <span className="text-ink-faint hidden sm:inline">
                {DIFF_STATS.unchanged} identical
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOnlyChanged(!onlyChanged)}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors ${
                  onlyChanged
                    ? "border-trace/40 bg-trace/10 text-trace"
                    : "border-edge-2 text-ink-faint hover:text-ink-dim"
                }`}
              >
                changes only
              </button>
              <div className="border-edge flex overflow-hidden rounded-md border">
                {(["unified", "split"] as View[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 font-mono text-[11px] transition-colors ${
                      view === v
                        ? "bg-trace/15 text-trace"
                        : "text-ink-faint hover:text-ink-dim"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {view === "unified" ? (
            <div className="max-h-[440px] overflow-auto py-1">
              {rows.map((r, i) => {
                const clickable = r.op !== "same" && noteFor(r.text);
                return (
                  <button
                    key={i}
                    disabled={!clickable}
                    onClick={() => setSelected(r.text)}
                    className={`flex w-full items-start px-3 py-0.5 text-left font-mono text-[11.5px] whitespace-pre transition-colors ${rowClass(
                      r.op,
                    )} ${clickable ? "hover:bg-panel-2 cursor-pointer" : "cursor-default"} ${
                      selected === r.text ? "bg-panel-2" : ""
                    }`}
                  >
                    <Gutter n={r.inoLine} />
                    <Gutter n={r.cppLine} />
                    <span className="text-ink-faint mr-2 w-2 shrink-0 select-none">
                      {r.op === "add" ? "+" : r.op === "del" ? "-" : " "}
                    </span>
                    <span className="min-w-0">
                      <Code text={r.text} />
                    </span>
                    {clickable && (
                      <span className="text-ink-faint ml-auto pl-3 text-[10px]">
                        why
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid max-h-[440px] grid-cols-2 divide-x divide-[color:var(--color-edge)] overflow-auto">
              {[
                { lines: INO_LINES, name: "smart_led.ino", side: "del" as const },
                { lines: CPP_LINES, name: "smart_led.cpp", side: "add" as const },
              ].map((pane) => (
                <div key={pane.name} className="min-w-0">
                  <div className="bg-panel-2 text-ink-faint sticky top-0 px-3 py-1.5 font-mono text-[10px]">
                    {pane.name}
                  </div>
                  <div className="py-1">
                    {pane.lines.map((line, i) => {
                      const changed = DIFF_ROWS.some(
                        (r) => r.op === pane.side && r.text === line && line.trim(),
                      );
                      return (
                        <div
                          key={i}
                          className={`flex items-start px-2 py-0.5 font-mono text-[11px] whitespace-pre ${
                            changed ? rowClass(pane.side) : "border-l-2 border-transparent"
                          }`}
                        >
                          <Gutter n={i + 1} />
                          <span className="min-w-0">
                            <Code text={line} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-edge text-ink-faint border-t px-4 py-2 font-mono text-[10px]">
            left gutter: smart_led.ino · right gutter: smart_led.cpp
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Annotation panel */}
          <div className="border-edge bg-panel min-h-[190px] rounded-xl border p-5">
            <AnimatePresence mode="wait">
              {selectedNote ? (
                <motion.div
                  key={selectedNote.heading}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                      selectedNote.expected
                        ? "border-ok/30 bg-ok/10 text-ok"
                        : "border-alarm/30 bg-alarm/10 text-alarm"
                    }`}
                  >
                    {selectedNote.expected ? (
                      <>
                        <Check className="h-3 w-3" /> expected
                      </>
                    ) : (
                      <>
                        <TriangleAlert className="h-3 w-3" /> not a dialect change
                      </>
                    )}
                  </span>
                  <h3 className="text-ink mt-3 text-[15px] font-medium">
                    {selectedNote.heading}
                  </h3>
                  <p className="text-ink-dim mt-2 text-[13px] leading-relaxed">
                    {selectedNote.body}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col justify-center"
                >
                  <h3 className="font-mono text-sm">Pick a line</h3>
                  <p className="text-ink-dim mt-2 text-[13px] leading-relaxed">
                    Every changed line has a reason. Two of them are the dialect
                    doing its job. The rest are the port quietly losing a feature.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Build pipeline */}
          <div className="border-edge bg-panel rounded-xl border p-5">
            <h3 className="font-mono text-sm">How .ino becomes .cpp</h3>
            <p className="text-ink-dim mt-2 text-[13px] leading-relaxed">
              The README says Arduino converts one to the other. It does, in four
              steps, and none of them are a different language.
            </p>

            <div className="mt-4 flex gap-1.5">
              {BUILD_STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setStep(i)}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= step ? "bg-trace" : "bg-edge-2"
                  }`}
                  aria-label={s.title}
                />
              ))}
            </div>

            <div className="mt-3 min-h-[74px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={BUILD_STEPS[step].id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.16 }}
                >
                  <div className="text-trace font-mono text-[11px]">
                    step {step + 1} of {BUILD_STEPS.length}
                  </div>
                  <div className="text-ink mt-1 text-sm font-medium">
                    {BUILD_STEPS[step].title}
                  </div>
                  <p className="text-ink-dim mt-1 text-[12.5px] leading-relaxed">
                    {BUILD_STEPS[step].detail}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              onClick={() => setStep((s) => (s + 1) % BUILD_STEPS.length)}
              className="border-edge-2 text-ink-dim hover:text-ink hover:bg-panel-2 mt-3 w-full rounded-md border px-3 py-2 font-mono text-[11px] transition-colors"
            >
              next step
            </button>
          </div>

          {/* Build switch */}
          <div className="border-edge bg-panel rounded-xl border p-5">
            <h3 className="font-mono text-sm">Hear the difference</h3>
            <p className="text-ink-dim mt-2 text-[13px] leading-relaxed">
              Switch the running build. This drives the serial pane on the bench,
              which is what a serial monitor connected to each one would show.
            </p>

            <div className="mt-4 flex gap-2">
              {[
                { on: true, label: ".ino build" },
                { on: false, label: ".cpp build" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setSerialLogging(opt.on)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 font-mono text-[11px] transition-colors ${
                    serialLogging === opt.on
                      ? "border-led/40 bg-led/10 text-led"
                      : "border-edge-2 text-ink-faint hover:text-ink-dim"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="border-edge bg-pcb mt-3 rounded-lg border px-3 py-2">
              <div className="text-ink-faint font-mono text-[10px]">
                Serial.println present
              </div>
              <div className="mt-1.5 flex gap-4 font-mono text-[11px]">
                <span>
                  <span className="text-ink-faint">.ino </span>
                  <span className="text-ok">yes</span>
                </span>
                <span>
                  <span className="text-ink-faint">.cpp </span>
                  <span className={CPP_HAS_SERIAL_LOG ? "text-ok" : "text-alarm"}>
                    {CPP_HAS_SERIAL_LOG ? "yes" : "no"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
