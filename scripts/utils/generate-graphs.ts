import { emptyDir } from "@std/fs";
import { resolvePath } from "./helpers.ts";

import type { ApiVersion, DataObject, HistoryItem } from "../types/external.ts";
import { C } from "./graphs/shared.ts";
import type { Bar } from "./graphs/shared.ts";
import { lineChart } from "./graphs/line-chart.ts";
import { donutChart } from "./graphs/donut-chart.ts";
import { barChart } from "./graphs/bar-chart.ts";
import { verticalBarChart } from "./graphs/vertical-bar-chart.ts";
import { apiDistributionChart } from "./graphs/api-distribution-chart.ts";

const graphsFolder = resolvePath(import.meta.resolve("../../graphics"));

// ─── Data helpers ─────────────────────────────────────────────────────────────

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

function topDependencies(data: DataObject[], topN: number): Bar[] {
  const counts = new Map<string, number>();
  for (const pkg of data) {
    for (const dep of Object.keys(pkg.deps)) {
      counts.set(dep, (counts.get(dep) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([label, value]) => ({ label, value }));
}

function contributorDistributionData(data: DataObject[]) {
  const colors = [C.blue, C.green, C.purple, C.yellow, C.orange];
  const buckets = new Map<string, number>();
  for (const pkg of data) {
    const count = pkg.contributors.length;
    const label = count >= 4 ? "4+" : count.toString();
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  const labels = ["0", "1", "2", "3", "4+"];
  const names: Record<string, string> = {
    "0": "Only author",
    "1": "1 contributor",
    "2": "2 contributors",
    "3": "3 contributors",
    "4+": "4+ contributors",
  };
  return labels
    .filter((k) => buckets.has(k))
    .map((label, i) => ({
      label: names[label],
      value: buckets.get(label)!,
      color: colors[i % colors.length],
    }));
}

function stalePackagesData(data: DataObject[]) {
  const now = Date.now();
  const MS_PER_DAY = 86_400_000;
  const buckets = {
    "&lt;3 months": 0,
    "3\u20136 months": 0,
    "6\u201312 months": 0,
    "&gt;1 year": 0,
    "Unknown": 0,
  };

  for (const pkg of data) {
    if (!pkg.latestUpdate) {
      buckets["Unknown"]++;
      continue;
    }
    const ageDays = (now - pkg.latestUpdate.timestamp) / MS_PER_DAY;
    if (ageDays < 90) buckets["&lt;3 months"]++;
    else if (ageDays < 180) buckets["3\u20136 months"]++;
    else if (ageDays < 365) buckets["6\u201312 months"]++;
    else buckets["&gt;1 year"]++;
  }

  return buckets;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function generateGraphs(seed: string, data: DataObject[]): Promise<void> {
  const historyFile = resolvePath(import.meta.resolve("../../data/history.json"));
  const apiVersionsFile = resolvePath(import.meta.resolve("../../data/api-versions.json"));

  const history: HistoryItem[] = JSON.parse(await Deno.readTextFile(historyFile));
  const apiVersions: ApiVersion[] = JSON.parse(await Deno.readTextFile(apiVersionsFile));

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
      [{
        label: "Extensions",
        color: C.orange,
        gradId: "g1",
        data: dailyHistory.map((h) => h.packages),
      }],
      "Extensions",
    ),
  );

  // 2. Community growth (authors + contributors + only-contributors)
  await Deno.writeTextFile(
    `${graphsFolder}/graph-community-growth-${seed}.svg`,
    lineChart(
      dailyHistory,
      "Community Growth Over Time",
      [
        { label: "Authors", color: C.blue, gradId: "g2", data: dailyHistory.map((h) => h.authors) },
        {
          label: "Contributors",
          color: C.purple,
          gradId: "g3",
          data: dailyHistory.map((h) => h.contributors),
        },
        {
          label: "Non-author contributors",
          color: C.green,
          gradId: "g4",
          data: dailyHistory.map((h) => h.onlyContributors),
        },
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
    barChart("Top @raycast/api Versions", topVersions, "Number of extensions", C.orange),
  );

  // 5. Full API version distribution
  await Deno.writeTextFile(
    `${graphsFolder}/graph-api-distribution-${seed}.svg`,
    apiDistributionChart(apiVersions),
  );

  // 6. Package updates by quarter
  await Deno.writeTextFile(
    `${graphsFolder}/graph-quarterly-updates-${seed}.svg`,
    verticalBarChart(
      "Packages by Last Updated Quarter",
      quarterlyUpdatesData(data),
      "Number of packages",
      C.green,
      `last updated at · ${
        data.filter((d) => d.latestUpdate).length.toLocaleString()
      } packages with a known last-update date`,
    ),
  );

  // 7. Top dependencies
  await Deno.writeTextFile(
    `${graphsFolder}/graph-top-dependencies-${seed}.svg`,
    barChart("Top Dependencies", topDependencies(data, 15), "Number of extensions", C.blue),
  );

  // 8. Contributor distribution
  await Deno.writeTextFile(
    `${graphsFolder}/graph-contributor-distribution-${seed}.svg`,
    donutChart("Contributor Distribution", contributorDistributionData(data)),
  );

  // 9. Package freshness
  const stale = stalePackagesData(data);
  await Deno.writeTextFile(
    `${graphsFolder}/graph-package-freshness-${seed}.svg`,
    donutChart("Package Freshness", [
      { label: "&lt;3 months", value: stale["&lt;3 months"], color: C.green },
      { label: "3\u20136 months", value: stale["3\u20136 months"], color: C.blue },
      { label: "6\u201312 months", value: stale["6\u201312 months"], color: C.yellow },
      { label: "&gt;1 year", value: stale["&gt;1 year"], color: C.orange },
      { label: "Unknown", value: stale["Unknown"], color: C.border },
    ]),
  );

  // 10. Windows support growth
  await Deno.writeTextFile(
    `${graphsFolder}/graph-platform-growth-${seed}.svg`,
    lineChart(
      dailyHistory,
      "Platform Support Over Time",
      [
        {
          label: "macOS + Windows",
          color: C.green,
          gradId: "g5",
          data: dailyHistory.map((h) => h.withWindows - h.windowsOnly),
        },
        {
          label: "macOS only",
          color: C.blue,
          gradId: "g6",
          data: dailyHistory.map((h) => h.macOnly),
        },
        {
          label: "Windows only",
          color: C.orange,
          gradId: "g7",
          data: dailyHistory.map((h) => h.windowsOnly),
        },
      ],
      "Extensions",
    ),
  );

  console.log(`[graphs] Generated 10 graphs with seed ${seed}`);
}

export function generateGraphsMarkdown(seed: string): string {
  return `## Graphs

<div align="center">
<img src="graphics/graph-packages-growth-${seed}.svg" alt="Packages Growth Over Time" width="98%" /><br />
<img src="graphics/graph-community-growth-${seed}.svg" alt="Community Growth Over Time" width="98%" /><br />
<img src="graphics/graph-platform-growth-${seed}.svg" alt="Platform Support Over Time" width="98%" /><br />
<img src="graphics/graph-package-freshness-${seed}.svg" alt="Package Freshness" width="98%" /><br />
<img src="graphics/graph-quarterly-updates-${seed}.svg" alt="Packages by Last Updated Quarter" width="98%" /><br />
<img src="graphics/graph-contributor-distribution-${seed}.svg" alt="Contributor Distribution" width="98%" /><br />
<img src="graphics/graph-top-dependencies-${seed}.svg" alt="Top Dependencies" width="98%" /><br />
<img src="graphics/graph-api-versions-${seed}.svg" alt="Top @raycast/api Versions" width="98%" /><br />
<img src="graphics/graph-platform-distribution-${seed}.svg" alt="Platform Distribution" width="98%" /><br />
</div>`;
}
