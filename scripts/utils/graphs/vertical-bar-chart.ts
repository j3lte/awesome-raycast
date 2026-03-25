import { C, FONT } from "./shared.ts";
import type { Bar } from "./shared.ts";

export function verticalBarChart(
  title: string,
  bars: Bar[],
  yLabel: string,
  color: string,
  subtitle?: string,
): string {
  const W = 800, H = 400;
  const pt = subtitle ? 58 : 45, pr = 30, pb = 80, pl = 60;
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
        ? `<text x="${(barX + barW / 2).toFixed(1)}" y="${
          countY.toFixed(1)
        }" text-anchor="middle" font-size="10" fill="${C.sub}">${bar.value}</text>
<text x="${(barX + barW / 2).toFixed(1)}" y="${
          pctY.toFixed(1)
        }" text-anchor="middle" font-size="10" fill="${C.sub}">(${pct}%)</text>`
        : "",
      `<g transform="translate(${centerX.toFixed(1)},${
        labelY.toFixed(1)
      }) rotate(-45)"><text text-anchor="end" font-size="10" fill="${C.text}">${bar.label}</text></g>`,
    ].filter(Boolean).join("\n");
  }).join("\n");

  // Y-axis ticks
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
    const val = Math.round((i / yTickCount) * maxVal);
    const y = (oy + ch - (val / maxVal) * ch).toFixed(1);
    return `<line x1="${ox}" y1="${y}" x2="${
      ox + cw
    }" y2="${y}" stroke="${C.grid}" stroke-width="1"/>
<text x="${ox - 6}" y="${
      (+y + 4).toFixed(1)
    }" text-anchor="end" font-size="11" fill="${C.sub}">${val}</text>`;
  }).join("\n");

  const subtitleEl = subtitle
    ? `\n<text x="${
      W / 2
    }" y="44" text-anchor="middle" font-size="11" fill="${C.sub}">${subtitle}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><style>text { ${FONT} }</style></defs>
<rect width="${W}" height="${H}" fill="${C.bg}" rx="12"/>
<text x="${
    W / 2
  }" y="26" text-anchor="middle" font-size="15" font-weight="600" fill="${C.text}">${title}</text>${subtitleEl}
<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<line x1="${ox}" y1="${oy + ch}" x2="${ox + cw}" y2="${
    oy + ch
  }" stroke="${C.border}" stroke-width="1"/>
<text x="${-(oy +
    ch /
      2)}" y="18" text-anchor="middle" font-size="12" fill="${C.sub}" transform="rotate(-90)">${yLabel}</text>
${yTicks}
${barsEl}
</svg>`;
}
