import { CPP_LINES, INO_LINES } from "./source";
import { CPP_HAS_SERIAL_LOG, INO_HAS_SERIAL_LOG } from "./diff";

/**
 * Review notes on the committed firmware. Every one of these is a property of
 * the real code, and each line number is located by searching the source rather
 * than written down, so the citations cannot go stale.
 */

export type Severity = "bug" | "risk" | "note";

export type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  /** What to change, phrased as the smallest safe edit. */
  fix: string;
  file: "smart_led.ino" | "smart_led.cpp" | "both";
  /** 1-based line in the .ino, resolved at load. */
  line: number | null;
};

function findLine(lines: string[], needle: string): number | null {
  const idx = lines.findIndex((l) => l.includes(needle));
  return idx === -1 ? null : idx + 1;
}

export const FINDINGS: Finding[] = [
  {
    id: "blocking-debounce",
    severity: "bug",
    title: "The non-blocking sketch blocks for 50ms on every press",
    detail:
      "The README leads with non-blocking timing via millis(), and the blink path honours that. The debounce does not: the button branch calls delay(50), which halts loop() entirely. During that stall the LED cannot toggle, the pot is not sampled and serial goes quiet, so a press can visibly stutter the blink it was meant to control.",
    fix: "Record the press time in an unsigned long and ignore further edges until millis() moves past it, the same pattern the blink already uses.",
    file: "both",
    line: findLine(INO_LINES, "delay(50)"),
  },
  {
    id: "floating-input",
    severity: "risk",
    title: "The button pin is configured as a bare INPUT",
    detail:
      "pinMode(buttonPin, INPUT) leaves the pin floating unless an external pull-down is fitted. The wiring notes in the README list a button and a resistor for the LED, but no pull-down for the button, so on an open input the sketch can read phantom presses from nearby noise and flip modes on its own.",
    fix: "Use INPUT_PULLUP and invert the comparison, which needs no extra parts, or fit an external pull-down resistor.",
    file: "both",
    line: findLine(INO_LINES, "pinMode(buttonPin"),
  },
  {
    id: "dropped-serial",
    severity: "bug",
    title: "The C++ port silently drops the serial logging",
    detail:
      "Both READMEs list serial monitoring as a core feature, and the .ino prints the current interval once a second. The .cpp calls Serial.begin(9600) but never prints anything, so opening the serial monitor against the PlatformIO build shows an empty pane. The port kept the setup cost and lost the payoff.",
    fix: "Carry the static lastLog block from the .ino across to the .cpp, or drop the unused Serial.begin so the two builds make the same promise.",
    file: "smart_led.cpp",
    line: findLine(CPP_LINES, "Serial.begin"),
  },
  {
    id: "adc-width",
    severity: "bug",
    title: "map() is hardcoded to a 10-bit ADC",
    detail:
      "The call map(potValue, 0, 1023, 100, 1000) assumes analogRead() tops out at 1023, which is true on the Uno the README targets. The repository is named for the ESP32, whose ADC is 12-bit and returns up to 4095. Compiled unchanged for that board, a fully open knob computes 3702ms rather than 1000ms, so the documented 100ms to 1000ms range no longer holds.",
    fix: "Replace the literal 1023 with a board constant, or divide the reading down to 10 bits before mapping.",
    file: "both",
    line: findLine(INO_LINES, "map(potValue"),
  },
  {
    id: "solid-mode-latency",
    severity: "note",
    title: "Solid mode still waits for the interval to elapse",
    detail:
      "In solid mode the write ledState = HIGH sits inside the same timing gate as the toggle. The LED therefore does not light the moment the mode changes, it lights on the next interval boundary, which at a slow knob setting is up to a full second later. The behaviour is harmless but it reads as lag when you press the button.",
    fix: "Write the pin immediately on a mode change, and keep the gate for the blinking branch only.",
    file: "both",
    line: findLine(INO_LINES, "ledState = HIGH"),
  },
];

/** Guards the claim made by the dropped-serial finding. */
export const SERIAL_CLAIM_HOLDS = INO_HAS_SERIAL_LOG && !CPP_HAS_SERIAL_LOG;

export const SEVERITY_COUNTS = {
  bug: FINDINGS.filter((f) => f.severity === "bug").length,
  risk: FINDINGS.filter((f) => f.severity === "risk").length,
  note: FINDINGS.filter((f) => f.severity === "note").length,
};
