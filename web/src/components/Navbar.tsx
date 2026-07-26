"use client";

import { useEffect, useState } from "react";
import { useSim } from "@/lib/sim";
import { BOARDS } from "@/lib/firmware";

const LINKS = [
  { href: "#bench", label: "Bench" },
  { href: "#diff", label: "Diff" },
  { href: "#port", label: "Port lab" },
  { href: "#media", label: "Media" },
  { href: "#review", label: "Review" },
];

export default function Navbar() {
  const { state, millis, boardId } = useSim();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const uptime = (millis / 1000).toFixed(1);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-pcb/85 border-edge backdrop-blur-md" : "border-transparent"
      } border-b`}
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <a href="#top" className="flex shrink-0 items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full transition-opacity duration-100 ${
                state.ledState ? "bg-led led-glow opacity-100" : "bg-edge-2 opacity-70"
              }`}
            />
          </span>
          <span className="font-mono text-[13px] font-medium tracking-tight">
            smart_led
          </span>
        </a>

        <ul className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-ink-dim hover:text-ink hover:bg-panel-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-3 font-mono text-[11px]">
          <span className="text-ink-faint hidden sm:inline">
            {BOARDS[boardId].name}
          </span>
          <span className="bg-edge hidden h-3 w-px sm:inline-block" />
          <span className="text-ink-faint hidden tabular-nums sm:inline">
            millis {uptime}s
          </span>
          <span
            className="text-trace border-trace/25 bg-trace/10 rounded-full border px-2 py-0.5 tabular-nums"
            title="Current blink interval computed by the sketch"
          >
            {state.interval}ms
          </span>
        </div>
      </nav>
    </header>
  );
}
