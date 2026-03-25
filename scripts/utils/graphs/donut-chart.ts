import { C, FONT } from "./shared.ts";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function donutChart(
  title: string,
  segments: DonutSegment[],
  centerLabel = "extensions",
): string {
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
      `A ${outerR} ${outerR} 0 ${large} 1 ${(cx + outerR * cos1).toFixed(2)} ${
        (cy + outerR * sin1).toFixed(2)
      }`,
      `L ${(cx + innerR * cos1).toFixed(2)} ${(cy + innerR * sin1).toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${(cx + innerR * cos0).toFixed(2)} ${
        (cy + innerR * sin0).toFixed(2)
      }`,
      "Z",
    ].join(" ");
    angle = end;
    return `<path d="${d}" fill="${seg.color}"/>`;
  }).join("\n");

  const centerText = `<text x="${cx}" y="${
    cy - 10
  }" text-anchor="middle" font-size="28" font-weight="700" fill="${C.text}">${total.toLocaleString()}</text>
<text x="${cx}" y="${
    cy + 14
  }" text-anchor="middle" font-size="12" fill="${C.sub}">${centerLabel}</text>`;

  const legendX = 430;
  const rowH = 52;
  const startY = cy - ((segments.length * rowH) / 2) + 10;
  const legend = segments.map((seg, i) => {
    const y = startY + i * rowH;
    const pct = ((seg.value / total) * 100).toFixed(1);
    return `<rect x="${legendX}" y="${y}" width="14" height="14" fill="${seg.color}" rx="3"/>
<text x="${legendX + 20}" y="${
      y + 11
    }" font-size="13" font-weight="500" fill="${C.text}">${seg.label}</text>
<text x="${legendX + 20}" y="${
      y + 27
    }" font-size="11" fill="${C.sub}">${seg.value.toLocaleString()} (${pct}%)</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><style>text { ${FONT} }</style></defs>
<rect width="${W}" height="${H}" fill="${C.bg}" rx="12"/>
<text x="${
    W / 2
  }" y="26" text-anchor="middle" font-size="15" font-weight="600" fill="${C.text}">${title}</text>
${arcs}
${centerText}
${legend}
</svg>`;
}
