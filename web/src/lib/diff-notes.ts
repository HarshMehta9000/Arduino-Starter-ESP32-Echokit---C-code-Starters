/**
 * Explanations attached to the diff, matched by what the line contains rather
 * than by line number, so edits to either file cannot misalign the notes.
 */

export type DiffNote = {
  match: (text: string) => boolean;
  heading: string;
  body: string;
  /** Whether this difference is expected when moving .ino to .cpp. */
  expected: boolean;
};

export const DIFF_NOTES: DiffNote[] = [
  {
    match: (t) => t.includes("#include <Arduino.h>"),
    heading: "The include the .ino did not need",
    body: "An .ino file is not compiled directly. The Arduino build prepends this header for you, so the sketch can call pinMode and Serial without declaring anything. A standalone .cpp gets no such help, which is why the port has to ask for it explicitly.",
    expected: true,
  },
  {
    match: (t) => t.includes("Serial.println"),
    heading: "This is the line the port lost",
    body: "The .ino prints the current interval once a second, which is the serial monitoring both READMEs advertise. The .cpp has no equivalent, so the PlatformIO build opens the port at 9600 baud and then says nothing. This is a behavioural difference, not a dialect difference.",
    expected: false,
  },
  {
    match: (t) => t.includes("static unsigned long lastLog"),
    heading: "The timer behind the logging",
    body: "A function-static keeps its value between calls, so lastLog survives each pass of loop() without becoming a global. The .cpp dropped this along with the print it served.",
    expected: false,
  },
  {
    match: (t) => t.includes("lastLog = millis()"),
    heading: "Second call to millis()",
    body: "The sketch calls millis() twice in this block rather than reusing currentMillis from a few lines up. Harmless here, but it is the kind of thing that drifts once a loop gets longer.",
    expected: false,
  },
  {
    match: (t) => t.trim().startsWith("// Arduino .ino version"),
    heading: "Header comment",
    body: "Cosmetic. Each file names its own dialect.",
    expected: true,
  },
  {
    match: (t) => t.trim().startsWith("// Pure C++ version"),
    heading: "Header comment",
    body: "Cosmetic. Each file names its own dialect.",
    expected: true,
  },
];

export function noteFor(text: string): DiffNote | null {
  return DIFF_NOTES.find((n) => n.match(text)) ?? null;
}

/**
 * What the Arduino build actually does to a sketch before handing it to the
 * compiler. Used by the pipeline visual.
 */
export const BUILD_STEPS = [
  {
    id: "concat",
    title: "Concatenate",
    detail:
      "Every .ino in the sketch folder is joined into one translation unit, main sketch first.",
  },
  {
    id: "include",
    title: "Insert Arduino.h",
    detail:
      "The core header is added at the top, which is where pinMode, digitalWrite, millis and Serial come from.",
  },
  {
    id: "prototypes",
    title: "Generate prototypes",
    detail:
      "Forward declarations are synthesised for the functions you defined, so order of definition does not matter the way it does in C++.",
  },
  {
    id: "compile",
    title: "Compile as C++",
    detail:
      "The result is handed to avr-gcc or xtensa-gcc as an ordinary .cpp. The dialect was never separate.",
  },
] as const;
