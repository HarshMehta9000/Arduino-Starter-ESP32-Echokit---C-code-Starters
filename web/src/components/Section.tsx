"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-7 max-w-2xl"
        >
          <div className="text-trace font-mono text-[11px] tracking-widest uppercase">
            {eyebrow}
          </div>
          <h2 className="mt-2.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h2>
          <p className="text-ink-dim mt-3 text-[15px] leading-relaxed">{lede}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
