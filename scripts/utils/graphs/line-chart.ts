import type { HistoryItem } from "../../types/external.ts";
import { C, fmtShortDate, FONT, lerp, niceNum } from "./shared.ts";

export interface LineSeries {
  label: string;
  color: string;
  gradId: string;
  data: number[];
}

export function lineChart(
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
  const tickPrecision = Math.max(0, Math.ceil(-Math.log10(yTickStep) - 1e-9));
  const tickRoundFactor = Math.pow(10, tickPrecision);
  const yTicks: number[] = [];
  for (let v = yd[0]; v <= yd[1] + yTickStep * 0.001; v += yTickStep) {
    yTicks.push(Math.round(v * tickRoundFactor) / tickRoundFactor);
  }
  const kDecimals = yTickStep >= 1000
    ? 0
    : Math.max(1, Math.ceil(-Math.log10(yTickStep / 1000) - 1e-9));
  const grid = yTicks.map((val) => {
    const y = py(val).toFixed(1);
    let label: string;
    if (val >= 1000) {
      label = `${(val / 1000).toFixed(kDecimals)}k`;
    } else {
      label = tickPrecision > 0 ? val.toFixed(tickPrecision) : val.toString();
    }
    return `<line x1="${ox}" y1="${y}" x2="${
      ox + cw
    }" y2="${y}" stroke="${C.grid}" stroke-width="1"/>
<text x="${ox - 6}" y="${
      (+y + 4).toFixed(1)
    }" text-anchor="end" font-size="11" fill="${C.sub}">${label}</text>`;
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
    return `<line x1="${x}" y1="${oy}" x2="${x}" y2="${
      oy + ch
    }" stroke="${C.border}" stroke-width="1" stroke-dasharray="3,3" clip-path="url(#ca)"/>`;
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
      return `<text x="${midX}" y="${y}" text-anchor="middle" font-size="9" fill="${s.color}" opacity="0.85" clip-path="url(#ca)">${sign}${
        pct.toFixed(1)
      }% (${diffSign}${Math.round(diff)})</text>`;
    });
  }).join("\n");

  // X-axis labels (6 evenly spaced)
  const xLabelCount = 6;
  const xLabels = Array.from({ length: xLabelCount }, (_, i) => {
    const idx = Math.round((i / (xLabelCount - 1)) * (history.length - 1));
    const x = px(idx).toFixed(1);
    return `<text x="${x}" y="${
      (oy + ch + 18).toFixed(1)
    }" text-anchor="middle" font-size="11" fill="${C.sub}">${
      fmtShortDate(history[idx].timestamp)
    }</text>`;
  }).join("\n");

  // Clip path
  const clip =
    `<clipPath id="ca"><rect x="${ox}" y="${oy}" width="${cw}" height="${ch}"/></clipPath>`;

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
    const fillD = `M ${px(0).toFixed(1)},${oy + ch} L ${pts.join(" L ")} L ${
      px(history.length - 1).toFixed(1)
    },${oy + ch} Z`;
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

  // "data since ..." footnote
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
<text x="${
    W / 2
  }" y="26" text-anchor="middle" font-size="15" font-weight="600" fill="${C.text}">${title}</text>
${grid}
${monthLines}
${xLabels}
<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<line x1="${ox}" y1="${oy + ch}" x2="${ox + cw}" y2="${
    oy + ch
  }" stroke="${C.border}" stroke-width="1"/>
<text x="${-(oy +
    ch /
      2)}" y="18" text-anchor="middle" font-size="12" fill="${C.sub}" transform="rotate(-90)">${yLabel}</text>
${paths}
${monthGrowthLabels}
${legend}
<text x="${ox}" y="${H - 6}" font-size="8" fill="${C.border}">data since ${earliestDate}</text>
</svg>`;
}
