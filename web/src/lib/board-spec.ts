/**
 * Physical spec for an ESP32-WROOM-32S NodeMCU-32S development board.
 *
 * Dimensions are the published mechanical figures in millimetres. The renderer
 * works in units of 10mm, so every value here is multiplied by MM at use.
 * Keeping the numbers in real units means the proportions cannot drift.
 */

export const MM = 0.1;

export const BOARD = {
  length: 48.2,
  width: 25.4,
  thickness: 1.6,
  cornerRadius: 1.2,
};

/** ESP32-WROOM-32S: 18.0 x 25.5 x 3.1mm including the antenna section. */
export const MODULE = {
  pcbLength: 25.5,
  pcbWidth: 18.0,
  pcbThickness: 0.8,
  canLength: 17.6,
  canWidth: 15.6,
  canHeight: 2.4,
  /** Module sits with its antenna end toward negative X. */
  centerX: -9.4,
};

/**
 * The meander occupies roughly the last 6mm of the module's 25.5mm length, so
 * its centre sits 9.65mm from the module centre and it stays on the module PCB
 * rather than overhanging it.
 */
export const ANTENNA = {
  length: 6.2,
  width: 10.0,
  centerX: MODULE.centerX - 9.65,
};

export const USB = {
  length: 5.9,
  width: 7.9,
  height: 2.6,
  centerX: 22.4,
};

export const HEADER = {
  perSide: 19,
  pitch: 2.54,
  pinSize: 0.64,
  pinHeight: 3.2,
  stripHeight: 2.5,
};

/**
 * NodeMCU-32S silkscreen labels, USB end first on each side.
 * These are the board's real markings, used for the silkscreen texture and the
 * hover labels.
 */
export const PINOUT_LEFT = [
  "3V3", "EN", "VP", "VN", "D34", "D35", "D32", "D33", "D25", "D26",
  "D27", "D14", "D12", "GND", "D13", "SD2", "SD3", "CMD", "5V",
];

export const PINOUT_RIGHT = [
  "GND", "D23", "D22", "TX0", "RX0", "D21", "GND", "D19", "D18", "D5",
  "TX2", "RX2", "D4", "D0", "D2", "D15", "SD1", "SD0", "CLK",
];

export type PinRole = {
  label: string;
  role: string;
  accent: "led" | "trace" | "gold";
};

/**
 * The three pins a port of this sketch would land on, keyed by silkscreen
 * label so they stay attached to the right physical pin if the layout changes.
 * Sourced from the ESP32 datasheet, not inferred from the sketch.
 */
export const MAPPED_PINS: Record<string, PinRole> = {
  D2: { label: "GPIO2", role: "onboard LED, ledPin", accent: "led" },
  D4: { label: "GPIO4", role: "button in, buttonPin", accent: "trace" },
  VP: { label: "GPIO36", role: "pot wiper, ADC1_CH0", accent: "gold" },
};

/** Small surface-mount parts: [x, z, lengthMM, widthMM, heightMM, color]. */
export const SMD_PARTS: [number, number, number, number, number, string][] = [
  [13.6, -4.2, 3.4, 3.4, 1.0, "#1a1d24"], // CP2102 USB-UART
  [8.2, 6.4, 4.6, 2.6, 1.2, "#15181e"], // AMS1117 LDO
  [8.2, 2.4, 1.6, 0.9, 0.6, "#3a4150"],
  [10.6, 2.4, 1.6, 0.9, 0.6, "#3a4150"],
  [5.4, -6.8, 2.0, 1.2, 0.9, "#8a6a3a"], // tantalum cap
  [17.0, 4.0, 1.6, 0.9, 0.6, "#3a4150"],
  [17.0, 6.2, 1.6, 0.9, 0.6, "#3a4150"],
  [4.0, 8.0, 1.6, 0.9, 0.6, "#3a4150"],
];

/** Tactile buttons flanking the USB end. */
export const BUTTONS: { x: number; z: number; label: string }[] = [
  { x: 17.4, z: -9.2, label: "EN" },
  { x: 17.4, z: 9.2, label: "BOOT" },
];
