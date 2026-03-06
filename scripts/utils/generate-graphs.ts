import { emptyDir } from "@std/fs";
import { nanoid } from "nanoid";

import type { ApiVersion, HistoryItem } from "../types/external.ts";

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
  const yPad = (yMax - yMin) * 0.1;
  const yd: [number, number] = [Math.max(0, yMin - yPad), yMax + yPad];
  const xd: [number, number] = [0, history.length - 1];

  const px = (i: number) => ox + lerp(i, xd, [0, cw]);
  const py = (v: number) => oy + ch - lerp(v, yd, [0, ch]);

  // Grid lines
  const yTickCount = 5;
  const grid = Array.from({ length: yTickCount + 1 }, (_, i) => {
    const val = yd[0] + (i / yTickCount) * (yd[1] - yd[0]);
    const y = py(val).toFixed(1);
    const label = val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val).toString();
    return `<line x1="${ox}" y1="${y}" x2="${ox + cw}" y2="${y}" stroke="${C.grid}" stroke-width="1"/>
<text x="${ox - 6}" y="${(+y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${C.sub}">${label}</text>`;
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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <style>text { ${FONT} }</style>
  ${defs}
  ${clip}
</defs>
<rect width="${W}" height="${H}" fill="${C.bg}" rx="12"/>
<text x="${W / 2}" y="26" text-anchor="middle" font-size="15" font-weight="600" fill="${C.text}">${title}</text>
${grid}
${xLabels}
<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<line x1="${ox}" y1="${oy + ch}" x2="${ox + cw}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<text x="${-(oy + ch / 2)}" y="18" text-anchor="middle" font-size="12" fill="${C.sub}" transform="rotate(-90)">${yLabel}</text>
${paths}
${legend}
</svg>`;
}

// ─── Chart 3: Donut chart ─────────────────────────────────────────────────────

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function donutChart(title: string, segments: DonutSegment[]): string {
  const W = 700, H = 380;
  const cx = 220, cy = 195;
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

  const legendX = 400;
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

// ─── Chart 4: Horizontal bar chart ───────────────────────────────────────────

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

// ─── Public entry point ───────────────────────────────────────────────────────

export async function generateGraphs(): Promise<string> {
  const seed = nanoid(8);

  const historyFile = import.meta.resolve("../../data/history.json").replace("file://", "");
  const apiVersionsFile = import.meta.resolve("../../data/api-versions.json").replace("file://", "");

  const history: HistoryItem[] = JSON.parse(await Deno.readTextFile(historyFile));
  const apiVersions: ApiVersion[] = JSON.parse(await Deno.readTextFile(apiVersionsFile));

  await emptyDir(graphsFolder);
  await Deno.writeTextFile(`${graphsFolder}/.gitkeep`, "");
  await Deno.writeTextFile(`${graphsFolder}/.seed`, seed);

  // 1. Packages growth
  await Deno.writeTextFile(
    `${graphsFolder}/packages-growth-${seed}.svg`,
    lineChart(
      history,
      "Packages Growth Over Time",
      [{ label: "Extensions", color: C.orange, gradId: "g1", data: history.map((h) => h.packages) }],
      "Extensions",
    ),
  );

  // 2. Community growth (authors + contributors)
  await Deno.writeTextFile(
    `${graphsFolder}/community-growth-${seed}.svg`,
    lineChart(
      history,
      "Community Growth Over Time",
      [
        { label: "Authors", color: C.blue, gradId: "g2", data: history.map((h) => h.authors) },
        {
          label: "Contributors",
          color: C.purple,
          gradId: "g3",
          data: history.map((h) => h.contributors),
        },
      ],
      "People",
    ),
  );

  // 3. Platform distribution (latest snapshot)
  const latest = history[history.length - 1];
  await Deno.writeTextFile(
    `${graphsFolder}/platform-distribution-${seed}.svg`,
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
    `${graphsFolder}/api-versions-${seed}.svg`,
    barChart(
      "Top @raycast/api Versions",
      topVersions,
      "Number of extensions",
      C.orange,
    ),
  );

  console.log(`Generated 4 graphs with seed ${seed}`);
  return seed;
}

export function generateGraphsMarkdown(seed: string): string {
  return `<div align="center">
<img src="graphics/packages-growth-${seed}.svg" alt="Packages Growth Over Time" width="49%" /><img src="graphics/community-growth-${seed}.svg" alt="Community Growth Over Time" width="49%" />
<img src="graphics/platform-distribution-${seed}.svg" alt="Platform Distribution" width="49%" />
<img src="graphics/api-versions-${seed}.svg" alt="Top @raycast/api Versions" width="98%" />
</div>`;
}
