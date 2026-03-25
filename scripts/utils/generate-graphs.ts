import { emptyDir } from "@std/fs";

import type { ApiVersion, DataObject, HistoryItem } from "../types/external.ts";

const graphsFolder = import.meta.resolve("../../graphics").replace("file://", "");

const C = {
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

const FONT = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`;

function lerp(v: number, [d0, d1]: [number, number], [r0, r1]: [number, number]): number {
  return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

function fmtShortDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric" });
}

/** Pick a "nice" round number for axis tick spacing so labels never duplicate. */
function niceNum(value: number, round: boolean): number {
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

// ─── Chart 1 & 2: Generic multi-series line chart ────────────────────────────

interface LineSeries {
  label: string;
  color: string;
  gradId: string;
  data: number[]; // one value per history entry (aligned to x-axis)
}

function lineChart(
  history: HistoryItem[],
  title: string,
  series: LineSeries[],
  yLabel: string,
): string {
  const W = 800, H = 400;
  const pt = 45, pr = 30, pb = 60, pl = 72;
  const cw = W - pl - pr;
  const ch = H - pt - pb;
  const ox = pl, oy = pt;

  const allY = series.flatMap((s) => s.data);
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const rawRange = yMax - yMin;
  const niceRange = niceNum(rawRange > 0 ? rawRange : Math.max(1, yMax * 0.1), false);
  const yTickStep = niceNum(niceRange / 5, true);
  const yd: [number, number] = [
    Math.max(0, Math.floor(yMin / yTickStep) * yTickStep),
    Math.ceil(yMax / yTickStep) * yTickStep,
  ];
  const xd: [number, number] = [0, history.length - 1];

  const px = (i: number) => ox + lerp(i, xd, [0, cw]);
  const py = (v: number) => oy + ch - lerp(v, yd, [0, ch]);

  // Horizontal grid lines — nice tick values to avoid duplicate labels
  const yTicks: number[] = [];
  for (let v = yd[0]; v <= yd[1] + yTickStep * 0.001; v += yTickStep) {
    yTicks.push(Math.round(v));
  }
  const kDecimals = yTickStep >= 1000 ? 0
    : Math.max(1, Math.ceil(-Math.log10(yTickStep / 1000) - 1e-9));
  const grid = yTicks.map((val) => {
    const y = py(val).toFixed(1);
    const label = val >= 1000 ? `${(val / 1000).toFixed(kDecimals)}k` : val.toString();
    return `<line x1="${ox}" y1="${y}" x2="${ox + cw}" y2="${y}" stroke="${C.grid}" stroke-width="1"/>
<text x="${ox - 6}" y="${(+y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${C.sub}">${label}</text>`;
  }).join("\n");

  // Month boundary indices (indices where a new month begins)
  const monthBoundaryIndices: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = new Date(history[i - 1].timestamp);
    const curr = new Date(history[i].timestamp);
    if (prev.getMonth() !== curr.getMonth() || prev.getFullYear() !== curr.getFullYear()) {
      monthBoundaryIndices.push(i);
    }
  }

  // Dotted vertical lines at month boundaries
  const monthLines = monthBoundaryIndices.map((i) => {
    const x = px(i).toFixed(1);
    return `<line x1="${x}" y1="${oy}" x2="${x}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1" stroke-dasharray="3,3" clip-path="url(#ca)"/>`;
  }).join("\n");

  // Per-month growth labels: one label per series per block, stacked top-down
  const blockBounds = [0, ...monthBoundaryIndices, history.length];
  const monthGrowthLabels = blockBounds.slice(1).flatMap((cur, bIdx) => {
    const startIdx = blockBounds[bIdx];
    const endIdx = cur - 1;
    const midX = ((px(startIdx) + px(endIdx)) / 2).toFixed(1);
    return series.map((s, si) => {
      const startVal = s.data[startIdx] ?? 0;
      const endVal = s.data[endIdx] ?? 0;
      const diff = endVal - startVal;
      const pct = startVal > 0 ? (diff / startVal) * 100 : 0;
      const sign = pct >= 0 ? "+" : "";
      const diffSign = diff >= 0 ? "+" : "";
      const y = (oy + 10 + si * 11).toFixed(1);
      return `<text x="${midX}" y="${y}" text-anchor="middle" font-size="9" fill="${s.color}" opacity="0.85" clip-path="url(#ca)">${sign}${pct.toFixed(1)}% (${diffSign}${Math.round(diff)})</text>`;
    });
  }).join("\n");

  // X-axis labels (6 evenly spaced)
  const xLabelCount = 6;
  const xLabels = Array.from({ length: xLabelCount }, (_, i) => {
    const idx = Math.round((i / (xLabelCount - 1)) * (history.length - 1));
    const x = px(idx).toFixed(1);
    return `<text x="${x}" y="${(oy + ch + 18).toFixed(1)}" text-anchor="middle" font-size="11" fill="${C.sub}">${fmtShortDate(history[idx].timestamp)}</text>`;
  }).join("\n");

  // Clip path
  const clip = `<clipPath id="ca"><rect x="${ox}" y="${oy}" width="${cw}" height="${ch}"/></clipPath>`;

  // Gradients
  const defs = series.map((s) =>
    `<linearGradient id="${s.gradId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${s.color}" stop-opacity="0.25"/>
  <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/>
</linearGradient>`
  ).join("\n");

  // Series paths
  const paths = series.map((s) => {
    const pts = s.data.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`);
    const lineD = `M ${pts.join(" L ")}`;
    const fillD = `M ${px(0).toFixed(1)},${oy + ch} L ${pts.join(" L ")} L ${px(history.length - 1).toFixed(1)},${oy + ch} Z`;
    return `<path d="${fillD}" fill="url(#${s.gradId})" clip-path="url(#ca)"/>
<path d="${lineD}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" clip-path="url(#ca)"/>`;
  }).join("\n");

  // Legend
  const legendTotal = series.length;
  const legendWidth = legendTotal * 140;
  const legendStartX = ox + (cw - legendWidth) / 2;
  const legend = series.map((s, i) => {
    const lx = legendStartX + i * 140;
    const ly = oy + ch + 38;
    return `<rect x="${lx}" y="${ly - 9}" width="12" height="12" fill="${s.color}" rx="2"/>
<text x="${lx + 16}" y="${ly + 1}" font-size="12" fill="${C.text}">${s.label}</text>`;
  }).join("\n");

  // "data since …" footnote — earliest known history point
  const earliestDate = new Date(history[0].timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <style>text { ${FONT} }</style>
  ${defs}
  ${clip}
</defs>
<rect width="${W}" height="${H}" fill="${C.bg}" rx="12"/>
<text x="${W / 2}" y="26" text-anchor="middle" font-size="15" font-weight="600" fill="${C.text}">${title}</text>
${grid}
${monthLines}
${xLabels}
<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<line x1="${ox}" y1="${oy + ch}" x2="${ox + cw}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<text x="${-(oy + ch / 2)}" y="18" text-anchor="middle" font-size="12" fill="${C.sub}" transform="rotate(-90)">${yLabel}</text>
${paths}
${monthGrowthLabels}
${legend}
<text x="${ox}" y="${H - 6}" font-size="8" fill="${C.border}">data since ${earliestDate}</text>
</svg>`;
}

// ─── Chart 3: Donut chart ─────────────────────────────────────────────────────

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function donutChart(title: string, segments: DonutSegment[]): string {
  const W = 800, H = 400;
  const cx = 220, cy = 200;
  const outerR = 140, innerR = 86;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let angle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const sweep = (seg.value / total) * 2 * Math.PI;
    const end = angle + sweep;
    const large = sweep > Math.PI ? 1 : 0;
    const cos0 = Math.cos(angle), sin0 = Math.sin(angle);
    const cos1 = Math.cos(end), sin1 = Math.sin(end);
    const d = [
      `M ${(cx + outerR * cos0).toFixed(2)} ${(cy + outerR * sin0).toFixed(2)}`,
      `A ${outerR} ${outerR} 0 ${large} 1 ${(cx + outerR * cos1).toFixed(2)} ${(cy + outerR * sin1).toFixed(2)}`,
      `L ${(cx + innerR * cos1).toFixed(2)} ${(cy + innerR * sin1).toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${(cx + innerR * cos0).toFixed(2)} ${(cy + innerR * sin0).toFixed(2)}`,
      "Z",
    ].join(" ");
    angle = end;
    return `<path d="${d}" fill="${seg.color}"/>`;
  }).join("\n");

  const centerText = `<text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="28" font-weight="700" fill="${C.text}">${total.toLocaleString()}</text>
<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="12" fill="${C.sub}">extensions</text>`;

  const legendX = 430;
  const rowH = 52;
  const startY = cy - ((segments.length * rowH) / 2) + 10;
  const legend = segments.map((seg, i) => {
    const y = startY + i * rowH;
    const pct = ((seg.value / total) * 100).toFixed(1);
    return `<rect x="${legendX}" y="${y}" width="14" height="14" fill="${seg.color}" rx="3"/>
<text x="${legendX + 20}" y="${y + 11}" font-size="13" font-weight="500" fill="${C.text}">${seg.label}</text>
<text x="${legendX + 20}" y="${y + 27}" font-size="11" fill="${C.sub}">${seg.value.toLocaleString()} (${pct}%)</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><style>text { ${FONT} }</style></defs>
<rect width="${W}" height="${H}" fill="${C.bg}" rx="12"/>
<text x="${W / 2}" y="26" text-anchor="middle" font-size="15" font-weight="600" fill="${C.text}">${title}</text>
${arcs}
${centerText}
${legend}
</svg>`;
}

// ─── Chart 4: Horizontal bar chart (top N, fixed height) ─────────────────────

interface Bar {
  label: string;
  value: number;
}

function barChart(title: string, bars: Bar[], xLabel: string, color: string): string {
  const W = 800, H = 420;
  const pt = 45, pr = 60, pb = 45, pl = 120;
  const cw = W - pl - pr;
  const ch = H - pt - pb;
  const ox = pl, oy = pt;
  const n = bars.length;
  const rowH = ch / n;
  const barH = Math.max(16, Math.floor(rowH * 0.6));
  const maxVal = Math.max(...bars.map((b) => b.value));

  const barsEl = bars.map((bar, i) => {
    const y = oy + i * rowH + (rowH - barH) / 2;
    const bw = (bar.value / maxVal) * cw;
    return `<rect x="${ox}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH}" fill="${color}" rx="3" opacity="0.85"/>
<text x="${ox - 6}" y="${(y + barH / 2 + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${C.text}">${bar.label}</text>
<text x="${(ox + bw + 5).toFixed(1)}" y="${(y + barH / 2 + 4).toFixed(1)}" font-size="11" fill="${C.sub}">${bar.value}</text>`;
  }).join("\n");

  // X-axis ticks
  const xTickCount = 4;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => {
    const val = Math.round((i / xTickCount) * maxVal);
    const x = (ox + (val / maxVal) * cw).toFixed(1);
    return `<line x1="${x}" y1="${oy}" x2="${x}" y2="${oy + ch}" stroke="${C.grid}" stroke-width="1"/>
<text x="${x}" y="${(oy + ch + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${C.sub}">${val}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><style>text { ${FONT} }</style></defs>
<rect width="${W}" height="${H}" fill="${C.bg}" rx="12"/>
<text x="${W / 2}" y="26" text-anchor="middle" font-size="15" font-weight="600" fill="${C.text}">${title}</text>
<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<line x1="${ox}" y1="${oy + ch}" x2="${ox + cw}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
${xTicks}
${barsEl}
<text x="${W / 2}" y="${oy + ch + 35}" text-anchor="middle" font-size="12" fill="${C.sub}">${xLabel}</text>
</svg>`;
}

// ─── Chart 5: API version distribution (dynamic height, HTML-only) ───────────

function sortApiVersionsForDistribution(apiVersions: ApiVersion[]): ApiVersion[] {
  // Strip any leading range prefix (^, ~) before parsing semver parts
  const stripPrefix = (v: string) => v.replace(/^[\^~]/, "");
  const parts = (v: string) => stripPrefix(v).split(".").map((p) => parseInt(p, 10) || 0);

  // Rank by prefix permissiveness: ^ (minor-compat) > ~ (patch-compat) > exact
  // Higher rank = higher position in chart (rendered first after reverse)
  const prefixRank = (v: string): number => {
    if (v.startsWith("^")) return 2;
    if (v.startsWith("~")) return 1;
    return 0;
  };

  return [...apiVersions].sort((a, b) => {
    const pa = parts(a.version);
    const pb = parts(b.version);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff; // ascending by base semver
    }
    // Same base version: sort by prefix rank ascending so higher rank ends up on top after reverse
    return prefixRank(a.version) - prefixRank(b.version);
  }).reverse(); // newest at index 0 → rendered at top of chart
}

function apiDistributionChart(apiVersions: ApiVersion[]): string {
  const sorted = sortApiVersionsForDistribution(apiVersions);
  const total = sorted.reduce((s, v) => s + v.packages.length, 0);

  const W = 800;
  const pt = 58, pb = 50, pl = 90, pr = 140;
  const rowH = 20;
  const barH = 13;
  const n = sorted.length;
  const H = pt + n * rowH + pb;
  const cw = W - pl - pr;
  const ch = n * rowH;
  const ox = pl, oy = pt;
  const maxVal = Math.max(...sorted.map((v) => v.packages.length));

  const barsEl = sorted.map((ver, i) => {
    const y = oy + i * rowH + (rowH - barH) / 2;
    const count = ver.packages.length;
    const bw = (count / maxVal) * cw;
    const pct = ((count / total) * 100).toFixed(2);
    return `<rect x="${ox}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH}" fill="${C.blue}" rx="2" opacity="0.85"/>
<text x="${ox - 6}" y="${(y + barH / 2 + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="${C.text}">${ver.version}</text>
<text x="${(ox + bw + 5).toFixed(1)}" y="${(y + barH / 2 + 4).toFixed(1)}" font-size="10" fill="${C.sub}">${count} (${pct}%)</text>`;
  }).join("\n");

  // X-axis ticks
  const xTickCount = 4;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => {
    const val = Math.round((i / xTickCount) * maxVal);
    const x = (ox + (val / maxVal) * cw).toFixed(1);
    return `<line x1="${x}" y1="${oy}" x2="${x}" y2="${oy + ch}" stroke="${C.grid}" stroke-width="1"/>
<text x="${x}" y="${(oy + ch + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${C.sub}">${val}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><style>text { ${FONT} }</style></defs>
<rect width="${W}" height="${H}" fill="${C.bg}" rx="12"/>
<text x="${W / 2}" y="26" text-anchor="middle" font-size="15" font-weight="600" fill="${C.text}">@raycast/api Version Distribution</text>
<text x="${W / 2}" y="44" text-anchor="middle" font-size="11" fill="${C.sub}">newest at top · ${total.toLocaleString()} total extensions</text>
<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<line x1="${ox}" y1="${oy + ch}" x2="${ox + cw}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
${xTicks}
${barsEl}
<text x="${W / 2}" y="${(oy + ch + 35).toFixed(1)}" text-anchor="middle" font-size="12" fill="${C.sub}">Number of extensions</text>
</svg>`;
}

// ─── Chart 6: Vertical bar chart (quarterly package updates) ─────────────────

function quarterlyUpdatesData(data: DataObject[]): Bar[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQ = Math.floor(now.getMonth() / 3) + 1;

  const counts = new Map<string, number>();
  for (const pkg of data) {
    if (!pkg.latestUpdate) continue;
    const d = new Date(pkg.latestUpdate.timestamp);
    const year = d.getFullYear();
    const q = Math.floor(d.getMonth() / 3) + 1;
    // Skip future quarters (e.g. bad CHANGELOG date like 2026-04-15)
    if (year > currentYear || (year === currentYear && q > currentQ)) {
      console.warn(
        `[graphs] Skipping extension "${pkg.name}" (${pkg.title}): CHANGELOG date ${pkg.latestUpdate.value} is in future quarter ${year}-Q${q}. Fix extensions/${pkg.name}/CHANGELOG.md`,
      );
      continue;
    }
    const key = `${year}-Q${q}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  if (counts.size === 0) return [];

  const parseKey = (key: string) => {
    const [y, qStr] = key.split("-Q");
    return { year: parseInt(y, 10), q: parseInt(qStr, 10) };
  };

  const allKeys = Array.from(counts.keys()).sort();
  const { year: minYear, q: minQ } = parseKey(allKeys[0]);
  const { year: maxYear, q: maxQ } = parseKey(allKeys[allKeys.length - 1]);
  // Cap displayed range at current quarter (don't show future quarters)
  const endYear = Math.min(maxYear, currentYear);
  const endQ = maxYear < currentYear ? maxQ : Math.min(maxQ, currentQ);

  const result: Bar[] = [];
  let year = minYear, q = minQ;
  while (year < endYear || (year === endYear && q <= endQ)) {
    const key = `${year}-Q${q}`;
    result.push({ label: key, value: counts.get(key) ?? 0 });
    q++;
    if (q > 4) {
      q = 1;
      year++;
    }
  }

  return result;
}

function verticalBarChart(
  title: string,
  bars: Bar[],
  yLabel: string,
  color: string,
): string {
  const W = 800, H = 400;
  const pt = 58, pr = 30, pb = 80, pl = 60;
  const cw = W - pl - pr;
  const ch = H - pt - pb;
  const ox = pl, oy = pt;
  const n = bars.length;
  const colW = n > 0 ? cw / n : cw;
  const barW = Math.max(10, Math.min(50, colW * 0.65));
  const total = bars.reduce((s, b) => s + b.value, 0);
  const maxVal = Math.max(...bars.map((b) => b.value), 1);

  const barsEl = bars.map((bar, i) => {
    const bh = (bar.value / maxVal) * ch;
    const barX = ox + i * colW + (colW - barW) / 2;
    const barY = oy + ch - bh;
    const centerX = ox + i * colW + colW / 2;
    const labelY = oy + ch + 10;
    const pct = total > 0 ? ((bar.value / total) * 100).toFixed(2) : "0.00";
    const countY = Math.max(oy + 14, barY - 16);
    const pctY = countY + 12;
    return [
      `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${
        Math.max(0, bh).toFixed(1)
      }" fill="${color}" rx="3" opacity="0.85"/>`,
      bar.value > 0
        ? `<text x="${(barX + barW / 2).toFixed(1)}" y="${countY.toFixed(1)}" text-anchor="middle" font-size="10" fill="${C.sub}">${bar.value}</text>
<text x="${(barX + barW / 2).toFixed(1)}" y="${pctY.toFixed(1)}" text-anchor="middle" font-size="10" fill="${C.sub}">(${pct}%)</text>`
        : "",
      `<g transform="translate(${centerX.toFixed(1)},${labelY.toFixed(1)}) rotate(-45)"><text text-anchor="end" font-size="10" fill="${C.text}">${bar.label}</text></g>`,
    ].filter(Boolean).join("\n");
  }).join("\n");

  // Y-axis ticks
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
    const val = Math.round((i / yTickCount) * maxVal);
    const y = (oy + ch - (val / maxVal) * ch).toFixed(1);
    return `<line x1="${ox}" y1="${y}" x2="${ox + cw}" y2="${y}" stroke="${C.grid}" stroke-width="1"/>
<text x="${ox - 6}" y="${(+y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${C.sub}">${val}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><style>text { ${FONT} }</style></defs>
<rect width="${W}" height="${H}" fill="${C.bg}" rx="12"/>
<text x="${W / 2}" y="26" text-anchor="middle" font-size="15" font-weight="600" fill="${C.text}">${title}</text>
<text x="${W / 2}" y="44" text-anchor="middle" font-size="11" fill="${C.sub}">last updated at · ${total.toLocaleString()} packages with a known last-update date</text>
<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<line x1="${ox}" y1="${oy + ch}" x2="${ox + cw}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<text x="${-(oy + ch / 2)}" y="18" text-anchor="middle" font-size="12" fill="${C.sub}" transform="rotate(-90)">${yLabel}</text>
${yTicks}
${barsEl}
</svg>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** For each calendar day keep only the latest entry, then sort ascending. */
function deduplicateHistoryByDay(history: HistoryItem[]): HistoryItem[] {
  const byDay = new Map<string, HistoryItem>();
  for (const item of history) {
    const d = new Date(item.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${
      String(d.getDate()).padStart(2, "0")
    }`;
    const existing = byDay.get(key);
    if (!existing || item.timestamp > existing.timestamp) {
      byDay.set(key, item);
    }
  }
  return Array.from(byDay.values()).sort((a, b) => a.timestamp - b.timestamp);
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function generateGraphs(seed: string, data: DataObject[]): Promise<void> {
  const historyFile = import.meta.resolve("../../data/history.json").replace("file://", "");
  const apiVersionsFile = import.meta.resolve("../../data/api-versions.json").replace("file://", "");

  const history: HistoryItem[] = JSON.parse(await Deno.readTextFile(historyFile));
  const apiVersions: ApiVersion[] = JSON.parse(await Deno.readTextFile(apiVersionsFile));

  // Use one data point per day (latest entry) for line charts so intra-day
  // local runs don't create noise spikes on the growth curves.
  const dailyHistory = deduplicateHistoryByDay(history);

  await emptyDir(graphsFolder);
  await Deno.writeTextFile(`${graphsFolder}/.gitkeep`, "");
  await Deno.writeTextFile(`${graphsFolder}/.seed`, seed);

  // 1. Packages growth
  await Deno.writeTextFile(
    `${graphsFolder}/graph-packages-growth-${seed}.svg`,
    lineChart(
      dailyHistory,
      "Packages Growth Over Time",
      [{ label: "Extensions", color: C.orange, gradId: "g1", data: dailyHistory.map((h) => h.packages) }],
      "Extensions",
    ),
  );

  // 2. Community growth (authors + contributors)
  await Deno.writeTextFile(
    `${graphsFolder}/graph-community-growth-${seed}.svg`,
    lineChart(
      dailyHistory,
      "Community Growth Over Time",
      [
        { label: "Authors", color: C.blue, gradId: "g2", data: dailyHistory.map((h) => h.authors) },
        { label: "Contributors", color: C.purple, gradId: "g3", data: dailyHistory.map((h) => h.contributors) },
      ],
      "People",
    ),
  );

  // 3. Platform distribution (latest snapshot)
  const latest = history[history.length - 1];
  await Deno.writeTextFile(
    `${graphsFolder}/graph-platform-distribution-${seed}.svg`,
    donutChart("Platform Distribution (Current)", [
      { label: "macOS + Windows", value: latest.withWindows - latest.windowsOnly, color: C.green },
      { label: "macOS only", value: latest.macOnly, color: C.blue },
      { label: "Windows only", value: latest.windowsOnly, color: C.orange },
      { label: "No platform set", value: latest.noPlatformSelected, color: C.border },
    ]),
  );

  // 4. Top API versions (by package count, top 12)
  const topVersions = [...apiVersions]
    .sort((a, b) => b.packages.length - a.packages.length)
    .slice(0, 12)
    .map((v) => ({ label: v.version, value: v.packages.length }));

  await Deno.writeTextFile(
    `${graphsFolder}/graph-api-versions-${seed}.svg`,
    barChart(
      "Top @raycast/api Versions",
      topVersions,
      "Number of extensions",
      C.orange,
    ),
  );

  // 5. Full API version distribution — HTML-only
  await Deno.writeTextFile(
    `${graphsFolder}/graph-api-distribution-${seed}.svg`,
    apiDistributionChart(apiVersions),
  );

  // 6. Package updates by quarter (vertical bar chart)
  await Deno.writeTextFile(
    `${graphsFolder}/graph-quarterly-updates-${seed}.svg`,
    verticalBarChart(
      "Packages by Last Updated Quarter",
      quarterlyUpdatesData(data),
      "Number of packages",
      C.green,
    ),
  );

  console.log(`[graphs] Generated 6 graphs with seed ${seed}`);
}

export function generateGraphsMarkdown(seed: string): string {
  return `<div align="center">
<img src="graphics/graph-packages-growth-${seed}.svg" alt="Packages Growth Over Time" width="98%" /><br />
<img src="graphics/graph-community-growth-${seed}.svg" alt="Community Growth Over Time" width="98%" /><br />
<img src="graphics/graph-api-versions-${seed}.svg" alt="Top @raycast/api Versions" width="98%" /><br />
<img src="graphics/graph-platform-distribution-${seed}.svg" alt="Platform Distribution" width="98%" /><br />
<img src="graphics/graph-quarterly-updates-${seed}.svg" alt="Package Updates by Quarter" width="98%" /><br />
</div>`;
}
