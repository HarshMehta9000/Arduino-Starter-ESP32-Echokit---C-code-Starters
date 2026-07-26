/**
 * A faithful TypeScript port of firmware/smart_led.ino.
 *
 * Every constant here is read from the real sketch. Nothing is tuned for looks.
 * The port keeps two details that a casual rewrite loses:
 *
 *   1. Arduino's map() is integer math. It truncates toward zero. Using
 *      floating point here would drift from the hardware by a millisecond or
 *      two at most pot positions, so we truncate exactly like avr-libc does.
 *   2. The button branch calls delay(50), which blocks the whole loop. The
 *      sketch advertises itself as non-blocking, so we model the stall rather
 *      than quietly skipping it.
 */

/** Pin assignments, verbatim from the sketch. */
export const PINS = {
  led: 13,
  button: 2,
  pot: "A0",
} as const;

/** map() bounds, verbatim from `map(potValue, 0, 1023, 100, 1000)`. */
export const MAP_BOUNDS = {
  inMin: 0,
  inMax: 1023,
  outMin: 100,
  outMax: 1000,
} as const;

/** Serial.begin(9600) */
export const BAUD = 9600;

/** The blocking debounce inside the button branch. */
export const DEBOUNCE_MS = 50;

/** Serial.println(interval) fires on this cadence in the .ino only. */
export const LOG_INTERVAL_MS = 1000;

/**
 * Arduino's map(), including integer truncation toward zero.
 * Reference: (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
 */
export function arduinoMap(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return Math.trunc(((x - inMin) * (outMax - outMin)) / (inMax - inMin)) + outMin;
}

/** The sketch's exact call, with its hardcoded 10-bit input range. */
export function intervalFromPot(potValue: number): number {
  return arduinoMap(
    potValue,
    MAP_BOUNDS.inMin,
    MAP_BOUNDS.inMax,
    MAP_BOUNDS.outMin,
    MAP_BOUNDS.outMax,
  );
}

export type BoardId = "uno" | "esp32";

export type Board = {
  id: BoardId;
  name: string;
  /** analogRead() full scale. The sketch assumes the Uno's value. */
  adcMax: number;
  adcBits: number;
  ledPin: string;
  buttonPin: string;
  potPin: string;
  note: string;
};

/**
 * Board profiles. The Uno column is what the sketch targets today, per the
 * README. The ESP32 column is the board named in the repository title and is
 * standard datasheet reference, not something inferred from the sketch.
 */
export const BOARDS: Record<BoardId, Board> = {
  uno: {
    id: "uno",
    name: "Arduino Uno",
    adcMax: 1023,
    adcBits: 10,
    ledPin: "D13",
    buttonPin: "D2",
    potPin: "A0",
    note: "10-bit ADC. The sketch's map() bounds match this board exactly.",
  },
  esp32: {
    id: "esp32",
    name: "ESP32",
    adcMax: 4095,
    adcBits: 12,
    ledPin: "GPIO2",
    buttonPin: "GPIO4",
    potPin: "GPIO36 (ADC1_CH0)",
    note: "12-bit ADC. analogRead() returns up to 4095, four times the range the sketch was written against.",
  },
};

/** Machine state, mirroring the sketch's globals one for one. */
export type MachineState = {
  ledState: boolean;
  lastButtonState: boolean;
  modeToggle: boolean;
  previousMillis: number;
  interval: number;
  lastLog: number;
  /** Milliseconds still owed to the blocking delay(50). */
  stallUntil: number;
};

export function initialState(): MachineState {
  return {
    ledState: false,
    lastButtonState: false,
    modeToggle: false,
    previousMillis: 0,
    interval: 500, // `int interval = 500;`
    lastLog: 0,
    stallUntil: 0,
  };
}

export type SerialLine = { t: number; text: string };

export type StepResult = {
  state: MachineState;
  /** Emitted when the sketch would have called Serial.println(interval). */
  log: SerialLine | null;
  /** True on the loop pass where the LED pin was actually written. */
  wrote: boolean;
};

/**
 * One pass of loop(). `now` is millis(), `potValue` is analogRead(potPin),
 * `buttonDown` is digitalRead(buttonPin) == HIGH.
 *
 * `adcMax` lets the port lab feed a 12-bit reading into the sketch's unchanged
 * 10-bit map() call, which is the whole point of that section: the bug is that
 * the sketch does not adapt, so this function must not adapt either.
 */
export function step(
  prev: MachineState,
  now: number,
  potValue: number,
  buttonDown: boolean,
  opts: { serialLogging: boolean } = { serialLogging: true },
): StepResult {
  const s: MachineState = { ...prev };

  // The blocking delay(50) from the previous pass has not expired yet.
  if (now < s.stallUntil) {
    return { state: s, log: null, wrote: false };
  }

  // Rising-edge detection on the button.
  if (buttonDown && !s.lastButtonState) {
    s.modeToggle = !s.modeToggle;
    s.stallUntil = now + DEBOUNCE_MS; // delay(50)
  }
  s.lastButtonState = buttonDown;

  // Note the missing rescale: the bounds stay 0..1023 whatever the board reads.
  s.interval = intervalFromPot(potValue);

  let wrote = false;
  if (now - s.previousMillis >= s.interval) {
    s.previousMillis = now;
    if (s.modeToggle) {
      s.ledState = !s.ledState;
    } else {
      s.ledState = true; // ledState = HIGH
    }
    wrote = true;
  }

  let log: SerialLine | null = null;
  if (opts.serialLogging && now - s.lastLog >= LOG_INTERVAL_MS) {
    s.lastLog = now;
    log = { t: now, text: String(s.interval) };
  }

  return { state: s, log, wrote };
}

/** Percentage of full scale, for rendering a pot at any ADC width. */
export function potPercent(potValue: number, adcMax: number): number {
  return Math.round((potValue / adcMax) * 100);
}

/**
 * What the sketch computes on a given board at a given knob position.
 * Returns both the intended interval and the interval the unmodified sketch
 * actually produces, which diverge on any board wider than 10 bits.
 */
export function portComparison(knobPercent: number, board: Board) {
  const raw = Math.round((knobPercent / 100) * board.adcMax);
  const actual = intervalFromPot(raw); // sketch, unchanged
  const corrected = arduinoMap(raw, 0, board.adcMax, 100, 1000); // bounds fixed
  return {
    raw,
    actual,
    corrected,
    drift: actual - corrected,
    overshoots: actual > MAP_BOUNDS.outMax,
  };
}
