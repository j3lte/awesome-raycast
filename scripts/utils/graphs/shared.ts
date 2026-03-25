export const C = {
  orange: "#FF6363",
  blue: "#4F8EF7",
  green: "#34C759",
  purple: "#BF5AF2",
  yellow: "#FF9F0A",
  text: "#111827",
  sub: "#6b7280",
  border: "#e5e7eb",
  grid: "#f3f4f6",
  bg: "#ffffff",
};

export const FONT =
  `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`;

export function lerp(v: number, [d0, d1]: [number, number], [r0, r1]: [number, number]): number {
  return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

export function fmtShortDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric" });
}

/** Pick a "nice" round number for axis tick spacing so labels never duplicate. */
export function niceNum(value: number, round: boolean): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const frac = value / Math.pow(10, exp);
  let nice: number;
  if (round) {
    nice = frac <= 1.5 ? 1 : frac <= 3 ? 2 : frac <= 7 ? 5 : 10;
  } else {
    nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  }
  return nice * Math.pow(10, exp);
}

export interface Bar {
  label: string;
  value: number;
}
