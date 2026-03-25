import type { ApiVersion } from "../../types/external.ts";
import { C, FONT } from "./shared.ts";

export function sortApiVersionsForDistribution(apiVersions: ApiVersion[]): ApiVersion[] {
  const stripPrefix = (v: string) => v.replace(/^[\^~]/, "");
  const parts = (v: string) => stripPrefix(v).split(".").map((p) => parseInt(p, 10) || 0);

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
      if (diff !== 0) return diff;
    }
    return prefixRank(a.version) - prefixRank(b.version);
  }).reverse();
}

export function apiDistributionChart(apiVersions: ApiVersion[]): string {
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
    return `<rect x="${ox}" y="${y.toFixed(1)}" width="${
      bw.toFixed(1)
    }" height="${barH}" fill="${C.blue}" rx="2" opacity="0.85"/>
<text x="${ox - 6}" y="${
      (y + barH / 2 + 4).toFixed(1)
    }" text-anchor="end" font-size="10" fill="${C.text}">${ver.version}</text>
<text x="${(ox + bw + 5).toFixed(1)}" y="${
      (y + barH / 2 + 4).toFixed(1)
    }" font-size="10" fill="${C.sub}">${count} (${pct}%)</text>`;
  }).join("\n");

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
  }" y="26" text-anchor="middle" font-size="15" font-weight="600" fill="${C.text}">@raycast/api Version Distribution</text>
<text x="${
    W / 2
  }" y="44" text-anchor="middle" font-size="11" fill="${C.sub}">newest at top · ${total.toLocaleString()} total extensions</text>
<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + ch}" stroke="${C.border}" stroke-width="1"/>
<line x1="${ox}" y1="${oy + ch}" x2="${ox + cw}" y2="${
    oy + ch
  }" stroke="${C.border}" stroke-width="1"/>
${xTicks}
${barsEl}
<text x="${W / 2}" y="${
    (oy + ch + 35).toFixed(1)
  }" text-anchor="middle" font-size="12" fill="${C.sub}">Number of extensions</text>
</svg>`;
}
