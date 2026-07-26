/**
 * Runs the real firmware port to produce the frame data the GIFs draw.
 *
 * The loop is stepped at 1ms resolution, which is the resolution millis() has,
 * so the timings captured here are the timings the sketch produces. Nothing in
 * the animations is keyframed by hand: the LED edges, the serial lines and the
 * blocked windows all come out of step().
 */

import { DEBOUNCE_MS, initialState, step } from "../../.media-build/firmware.js";

/**
 * @param {object} o
 * @param {number} o.durationMs   virtual milliseconds to run
 * @param {number} o.msPerFrame   virtual milliseconds between captured frames
 * @param {(t: number) => {pot: number, button: boolean}} o.script  the inputs
 * @param {boolean} [o.serialLogging]
 */
export function runSim({ durationMs, msPerFrame, script, serialLogging = true }) {
  let s = initialState();

  const edges = []; // {t, on}, one entry per real change of the LED pin
  const serial = []; // {t, text}
  const frames = [];

  let stalledMs = 0;
  let modeChanges = 0;
  let ledWrites = 0;
  let lastOn = null;
  let lastWriteAt = -Infinity;
  let lastLogAt = -Infinity;

  for (let t = 0; t <= durationMs; t++) {
    const { pot, button } = script(t);
    const before = s;
    const r = step(before, t, pot, button, { serialLogging });

    if (r.state.stallUntil > before.stallUntil) {
      stalledMs += DEBOUNCE_MS;
      modeChanges += 1;
    }
    s = r.state;

    if (r.wrote) {
      ledWrites += 1;
      lastWriteAt = t;
    }
    if (r.log) {
      serial.push(r.log);
      lastLogAt = t;
    }
    if (lastOn === null || s.ledState !== lastOn) {
      edges.push({ t, on: s.ledState });
      lastOn = s.ledState;
    }

    if (t % msPerFrame === 0) {
      frames.push({
        t,
        pot,
        button,
        state: { ...s },
        stalling: t < s.stallUntil,
        stallRemaining: Math.max(0, s.stallUntil - t),
        stalledMs,
        modeChanges,
        ledWrites,
        sinceWrite: t - lastWriteAt,
        sinceLog: t - lastLogAt,
        serialCount: serial.length,
      });
    }
  }

  return { frames, edges, serial };
}

/** LED level at an arbitrary time, read back off the recorded edge list. */
export function levelAt(edges, t) {
  let on = false;
  for (const e of edges) {
    if (e.t > t) break;
    on = e.on;
  }
  return on;
}

/**
 * Average period measured off the recorded edges inside a window, the same
 * cross-check the on-page scope does. Returns null before enough edges exist.
 */
export function measuredPeriod(edges, t, windowMs) {
  const inWindow = edges.filter((e) => e.t <= t && e.t >= t - windowMs);
  if (inWindow.length < 3) return null;
  const recent = inWindow.slice(-6);
  let sum = 0;
  for (let i = 1; i < recent.length; i++) sum += recent[i].t - recent[i - 1].t;
  return Math.round(sum / (recent.length - 1));
}

/** Smooth ease so scripted knob sweeps look like a hand, not a sawtooth. */
export function ease(a, b, p) {
  const c = p < 0 ? 0 : p > 1 ? 1 : p;
  return a + (b - a) * (c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2);
}
