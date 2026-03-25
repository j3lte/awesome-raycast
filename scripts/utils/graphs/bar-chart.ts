import { C, FONT } from "./shared.ts";
import type { Bar } from "./shared.ts";

export function barChart(title: string, bars: Bar[], xLabel: string, color: string): string {
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
    return `<rect x="${ox}" y="${y.toFixed(1)}" width="${
      bw.toFixed(1)
    }" height="${barH}" fill="${color}" rx="3" opacity="0.85"/>
<text x="${ox - 6}" y="${
      (y + barH / 2 + 4).toFixed(1)
    }" text-anchor="end" font-size="11" fill="${C.text}">${bar.label}</text>
<text x="${(ox + bw + 5).toFixed(1)}" y="${
      (y + barH / 2 + 4).toFixed(1)
    }" font-size="11" fill="${C.sub}">${bar.value}</text>`;
  }).join("\n");

  // X-axis ticks
  const xTickCount = 4;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => {
    const val = Math.round((i / xTickCount) * maxVal);
    const x = (ox + (val / maxVal) * cw).toFixed(1);
    return `<line x1="${x}" y1="${oy}" x2="${x}" y2="${
      oy + ch
    }" stroke="${C.grid}" stroke-width="1"/>
<text x="${x}" y="${
      (oy + ch + 16).toFixed(1)
    }" text-anchor="middle" font-size="11" fill="${C.sub}">${val}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><style>text { ${FONT} }</style></defs>
<rect width="${W}" height="${H}" fill="${C.bg}" rx="12"/>
<text x="${
    W / 2
  }" y="26" text-anchor="middle" font-size="15" font-weight="600" fill="${C.text}">${title}</text>
<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<line x1="${ox}" y1="${oy + ch}" x2="${ox + cw}" y2="${
    oy + ch
  }" stroke="${C.border}" stroke-width="1"/>
${xTicks}
${barsEl}
<text x="${W / 2}" y="${
    oy + ch + 35
  }" text-anchor="middle" font-size="12" fill="${C.sub}">${xLabel}</text>
</svg>`;
}
