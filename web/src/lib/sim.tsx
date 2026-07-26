"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  BOARDS,
  DEBOUNCE_MS,
  initialState,
  step,
  type BoardId,
  type MachineState,
  type SerialLine,
} from "./firmware";

/**
 * One simulation, shared by every interactive element on the page. Turning the
 * knob in the bench changes the blink rate of the 3D board, the serial tape and
 * the hero readout at the same instant, because all of them read this state.
 */

const MAX_SERIAL_LINES = 40;

export type SimValue = {
  /** Raw analogRead() value, 0..adcMax for the selected board. */
  potValue: number;
  setPotValue: (v: number) => void;
  buttonDown: boolean;
  pressButton: () => void;
  setButtonDown: (down: boolean) => void;
  state: MachineState;
  serial: SerialLine[];
  /** Virtual millis() since the sketch started. */
  millis: number;
  running: boolean;
  setRunning: (r: boolean) => void;
  boardId: BoardId;
  setBoardId: (b: BoardId) => void;
  /** Whether the running variant emits Serial.println, ie. the .ino. */
  serialLogging: boolean;
  setSerialLogging: (on: boolean) => void;
  /** Count of user interactions, used by the live layer. */
  interactions: number;
  reducedMotion: boolean;
  /** Rising edge of the LED write, for pulse effects. */
  ledWriteCount: number;
  /** True while the blocking delay(50) is holding loop() up. */
  stalling: boolean;
  /** Milliseconds of loop time lost to delay(50) since boot. */
  stalledMs: number;
  /** Number of mode changes, ie. accepted button edges. */
  modeChanges: number;
};

const SimContext = createContext<SimValue | null>(null);

export function useSim(): SimValue {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim must be used inside <SimProvider>");
  return ctx;
}

export function SimProvider({ children }: { children: ReactNode }) {
  const [boardId, setBoardIdRaw] = useState<BoardId>("uno");
  const [potValue, setPotValueRaw] = useState(512);
  const [buttonDown, setButtonDown] = useState(false);
  const [running, setRunning] = useState(true);
  const [serialLogging, setSerialLogging] = useState(true);
  const [interactions, setInteractions] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const [state, setState] = useState<MachineState>(() => initialState());
  const [serial, setSerial] = useState<SerialLine[]>([]);
  const [millis, setMillis] = useState(0);
  const [ledWriteCount, setLedWriteCount] = useState(0);
  const [stalling, setStalling] = useState(false);
  const [stalledMs, setStalledMs] = useState(0);
  const [modeChanges, setModeChanges] = useState(0);

  // Refs let the animation loop read fresh values without re-subscribing.
  const stateRef = useRef(state);
  const potRef = useRef(potValue);
  const buttonRef = useRef(buttonDown);
  const runningRef = useRef(running);
  const loggingRef = useRef(serialLogging);
  const startRef = useRef<number | null>(null);
  const pausedAtRef = useRef(0);
  const offsetRef = useRef(0);

  // Kept in an effect rather than assigned during render, so the render stays
  // pure. The animation loop reads these to avoid re-subscribing every frame.
  useEffect(() => {
    stateRef.current = state;
    potRef.current = potValue;
    buttonRef.current = buttonDown;
    runningRef.current = running;
    loggingRef.current = serialLogging;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const setPotValue = useCallback((v: number) => {
    setPotValueRaw(v);
    setInteractions((n) => n + 1);
  }, []);

  /** A momentary press: down now, up shortly after, like a real pushbutton. */
  const pressButton = useCallback(() => {
    setButtonDown(true);
    setInteractions((n) => n + 1);
    window.setTimeout(() => setButtonDown(false), 120);
  }, []);

  /** Switching boards clamps the pot, since ADC width differs between them. */
  const setBoardId = useCallback((b: BoardId) => {
    setBoardIdRaw(b);
    setPotValueRaw((v) => Math.min(v, BOARDS[b].adcMax));
  }, []);

  useEffect(() => {
    let raf = 0;

    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);

      if (startRef.current === null) startRef.current = ts;

      if (!runningRef.current) {
        // Freeze virtual time while paused.
        pausedAtRef.current = ts;
        return;
      }
      if (pausedAtRef.current) {
        offsetRef.current += ts - pausedAtRef.current;
        pausedAtRef.current = 0;
      }

      const now = Math.floor(ts - startRef.current - offsetRef.current);

      const before = stateRef.current;
      const result = step(before, now, potRef.current, buttonRef.current, {
        serialLogging: loggingRef.current,
      });

      // A fresh stall window means the button branch just ran delay(50).
      if (result.state.stallUntil > before.stallUntil) {
        setStalledMs((ms) => ms + DEBOUNCE_MS);
        setModeChanges((n) => n + 1);
      }
      setStalling(now < result.state.stallUntil);

      stateRef.current = result.state;
      setState(result.state);
      setMillis(now);
      if (result.wrote) setLedWriteCount((n) => n + 1);
      if (result.log) {
        setSerial((prev) => {
          const next = [...prev, result.log as SerialLine];
          return next.length > MAX_SERIAL_LINES
            ? next.slice(next.length - MAX_SERIAL_LINES)
            : next;
        });
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const value = useMemo<SimValue>(
    () => ({
      potValue,
      setPotValue,
      buttonDown,
      pressButton,
      setButtonDown,
      state,
      serial,
      millis,
      running,
      setRunning,
      boardId,
      setBoardId,
      serialLogging,
      setSerialLogging,
      interactions,
      reducedMotion,
      ledWriteCount,
      stalling,
      stalledMs,
      modeChanges,
    }),
    [
      potValue,
      setPotValue,
      buttonDown,
      pressButton,
      state,
      serial,
      millis,
      running,
      boardId,
      setBoardId,
      serialLogging,
      interactions,
      reducedMotion,
      ledWriteCount,
      stalling,
      stalledMs,
      modeChanges,
    ],
  );

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}
