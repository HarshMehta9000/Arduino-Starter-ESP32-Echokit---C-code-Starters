import { CPP_LINES, INO_LINES } from "./source";

/**
 * A real line diff between the two committed firmware files, computed at load
 * from the generated sources. Nothing about the diff is hardcoded, so if the
 * firmware changes the viewer follows it.
 */

export type DiffOp = "same" | "add" | "del";

export type DiffRow = {
  op: DiffOp;
  /** 1-based line number in the .ino, null for lines only in the .cpp. */
  inoLine: number | null;
  /** 1-based line number in the .cpp, null for lines only in the .ino. */
  cppLine: number | null;
  text: string;
};

/** Classic LCS table, fine at these file sizes (50 and 47 lines). */
function lcs(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

export function computeDiff(a: string[] = INO_LINES, b: string[] = CPP_LINES): DiffRow[] {
  const table = lcs(a, b);
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ op: "same", inoLine: i + 1, cppLine: j + 1, text: a[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rows.push({ op: "del", inoLine: i + 1, cppLine: null, text: a[i] });
      i++;
    } else {
      rows.push({ op: "add", inoLine: null, cppLine: j + 1, text: b[j] });
      j++;
    }
  }
  while (i < a.length) {
    rows.push({ op: "del", inoLine: i + 1, cppLine: null, text: a[i] });
    i++;
  }
  while (j < b.length) {
    rows.push({ op: "add", inoLine: null, cppLine: j + 1, text: b[j] });
    j++;
  }
  return rows;
}

export const DIFF_ROWS = computeDiff();

export const DIFF_STATS = {
  added: DIFF_ROWS.filter((r) => r.op === "add").length,
  removed: DIFF_ROWS.filter((r) => r.op === "del").length,
  unchanged: DIFF_ROWS.filter((r) => r.op === "same").length,
  inoLines: INO_LINES.length,
  cppLines: CPP_LINES.length,
};

/**
 * Whether the .cpp still contains the serial logging block that the .ino has.
 * Computed, not asserted, so the claim on the page stays true if either file
 * is edited later.
 */
export const CPP_HAS_SERIAL_LOG = CPP_LINES.some((l) => l.includes("Serial.println"));
export const INO_HAS_SERIAL_LOG = INO_LINES.some((l) => l.includes("Serial.println"));
