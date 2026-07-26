/**
 * Gate 1: prove the TypeScript port reproduces the C++ integer semantics.
 *
 * The reference values below are computed independently, straight from
 * avr-libc's map() definition using BigInt truncating division, so this is a
 * real cross-check and not the port grading its own homework.
 */
const MAP = { inMin: 0, inMax: 1023, outMin: 100, outMax: 1000 };

// Independent reference: integer math via BigInt, truncating toward zero.
function referenceMap(x, inMin, inMax, outMin, outMax) {
  const num = BigInt(x - inMin) * BigInt(outMax - outMin);
  const den = BigInt(inMax - inMin);
  let q = num / den; // BigInt division truncates toward zero
  return Number(q) + outMin;
}

// The port under test, copied to keep this script dependency free.
function arduinoMap(x, inMin, inMax, outMin, outMax) {
  return Math.trunc(((x - inMin) * (outMax - outMin)) / (inMax - inMin)) + outMin;
}

let checks = 0;
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error("FAIL: " + msg);
};
const eq = (a, b, msg) => {
  checks++;
  if (a !== b) fail(`${msg}: got ${a}, expected ${b}`);
};

// 1. Every reachable 10-bit pot position must match the reference exactly.
for (let pot = 0; pot <= 1023; pot++) {
  eq(
    arduinoMap(pot, MAP.inMin, MAP.inMax, MAP.outMin, MAP.outMax),
    referenceMap(pot, MAP.inMin, MAP.inMax, MAP.outMin, MAP.outMax),
    `map(${pot})`,
  );
}

// 2. Endpoints stated in the README ("100ms to 1000ms").
eq(arduinoMap(0, 0, 1023, 100, 1000), 100, "pot floor is 100ms");
eq(arduinoMap(1023, 0, 1023, 100, 1000), 1000, "pot ceiling is 1000ms");

// 3. The output must never leave the documented band on a 10-bit board.
for (let pot = 0; pot <= 1023; pot++) {
  const v = arduinoMap(pot, 0, 1023, 100, 1000);
  checks++;
  if (v < 100 || v > 1000) fail(`pot ${pot} produced ${v}, outside 100..1000`);
}

// 4. Monotonic: turning the knob up never speeds the blink up.
let prev = -Infinity;
for (let pot = 0; pot <= 1023; pot++) {
  const v = arduinoMap(pot, 0, 1023, 100, 1000);
  checks++;
  if (v < prev) fail(`map is not monotonic at pot ${pot}`);
  prev = v;
}

// 5. The ESP32 port bug: a 12-bit reading through the unchanged 10-bit bounds.
const esp32FullScale = arduinoMap(4095, 0, 1023, 100, 1000);
eq(esp32FullScale, 3702, "ESP32 full scale through unchanged map()");
checks++;
if (esp32FullScale <= 1000) {
  fail("expected the unchanged sketch to overshoot 1000ms on a 12-bit ADC");
}

// 6. With bounds corrected to the board's real full scale, the band is restored.
eq(arduinoMap(4095, 0, 4095, 100, 1000), 1000, "corrected ESP32 ceiling");
eq(arduinoMap(0, 0, 4095, 100, 1000), 100, "corrected ESP32 floor");

// 7. Truncation actually bites. At pot 100 the exact quotient is 87.976, so
//    truncating gives 187ms where rounding would give 188ms. If the port used
//    floating point and rounded, this assertion is what catches it.
eq(arduinoMap(100, 0, 1023, 100, 1000), 187, "pot 100 truncates to 187ms");
checks++;
const floaty = ((100 - 0) * (1000 - 100)) / (1023 - 0) + 100;
if (Math.round(floaty) === 187) {
  fail("pot position chosen does not distinguish truncation from rounding");
}

// 8. Count how many of the 1024 positions differ under rounding, so the
//    fidelity claim is a measured number rather than an assertion of taste.
let truncRoundDiffs = 0;
for (let pot = 0; pot <= 1023; pot++) {
  const t = arduinoMap(pot, 0, 1023, 100, 1000);
  const r = Math.round(((pot * 900) / 1023) * 1) + 100;
  if (t !== r) truncRoundDiffs++;
}
console.log(
  `note: ${truncRoundDiffs} of 1024 pot positions differ between truncation and rounding`,
);

console.log(`\n${checks} assertions, ${failures} failures`);
if (failures > 0) process.exit(1);
console.log("PASS: TypeScript port matches C++ integer semantics.");
