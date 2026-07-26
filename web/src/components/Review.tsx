"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FINDINGS, SEVERITY_COUNTS, type Severity } from "@/lib/findings";
import { DIFF_STATS } from "@/lib/diff";
import Section from "./Section";

const SEVERITY_META: Record<Severity, { label: string; cls: string }> = {
  bug: { label: "bug", cls: "bg-alarm/15 text-alarm border-alarm/30" },
  risk: { label: "risk", cls: "bg-led/15 text-led border-led/30" },
  note: { label: "note", cls: "bg-trace/15 text-trace border-trace/30" },
};

export default function Review() {
  const [open, setOpen] = useState<string | null>(FINDINGS[0]?.id ?? null);

  return (
    <Section
      id="review"
      eyebrow="Findings"
      title={`A code review of ${DIFF_STATS.inoLines + DIFF_STATS.cppLines} lines`}
      lede="Small programs are where sloppiness is cheapest to fix and easiest to see. These are the things worth changing, each one anchored to a line in the committed source."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(SEVERITY_META) as Severity[]).map((s) => (
          <span
            key={s}
            className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${SEVERITY_META[s].cls}`}
          >
            {SEVERITY_COUNTS[s]} {SEVERITY_META[s].label}
            {SEVERITY_COUNTS[s] === 1 ? "" : "s"}
          </span>
        ))}
      </div>

      <div className="border-edge bg-panel divide-edge divide-y overflow-hidden rounded-xl border">
        {FINDINGS.map((f) => {
          const isOpen = open === f.id;
          const meta = SEVERITY_META[f.severity];
          return (
            <div key={f.id}>
              <button
                onClick={() => setOpen(isOpen ? null : f.id)}
                aria-expanded={isOpen}
                className="hover:bg-panel-2 flex w-full items-start gap-3 px-4 py-4 text-left transition-colors sm:px-5"
              >
                <span
                  className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] ${meta.cls}`}
                >
                  {meta.label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-ink block text-[15px] leading-snug font-medium">
                    {f.title}
                  </span>
                  <span className="text-ink-faint mt-1 block font-mono text-[11px]">
                    {f.file}
                    {f.line ? `:${f.line}` : ""}
                  </span>
                </span>
                <ChevronDown
                  className={`text-ink-faint mt-1 h-4 w-4 shrink-0 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-5 sm:px-5 sm:pl-[4.5rem]">
                      <p className="text-ink-dim text-[14px] leading-relaxed">
                        {f.detail}
                      </p>
                      <div className="border-edge bg-pcb mt-3 rounded-lg border p-3">
                        <div className="text-ink-faint font-mono text-[10px]">
                          smallest safe fix
                        </div>
                        <p className="text-ink mt-1.5 text-[13px] leading-relaxed">
                          {f.fix}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
