"use client";

import dynamic from "next/dynamic";

/**
 * three.js is dynamic-imported with ssr disabled so it stays out of the initial
 * bundle and never runs during prerender, where there is no WebGL context.
 */
const Board3DScene = dynamic(() => import("./Board3DScene"), {
  ssr: false,
  loading: () => (
    <div className="border-edge bg-panel flex w-full items-center justify-center rounded-xl border" style={{ height: 460 }}>
      <div className="text-ink-faint font-mono text-xs">loading board...</div>
    </div>
  ),
});

export default Board3DScene;
