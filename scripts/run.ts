import { load } from "@std/dotenv";

import type { HistoryItem } from "./types/external.ts";
import type { PackageWithVersion } from "./types/internal.ts";

import { collectApiVersions } from "./utils/collect-api-versions.ts";
import { collectStatistics } from "./utils/collect-statistics.ts";
import { discoverPackages } from "./utils/discover-packages.ts";
import { generateIcons } from "./utils/generate-icons.ts";
import { generateMarkdown } from "./utils/generate-markdown.ts";
import { generateStatisticsText } from "./utils/generate-statistics-text.ts";
import { getSortedCategories, organizeByCategory } from "./utils/organize-by-category.ts";
import { parsePackages } from "./utils/parse-packages.ts";
import { saveHistory } from "./utils/save-history.ts";
import { generateUpdateTimeIcon, updateReadme } from "./utils/update-readme.ts";

const FORCE = Deno.args.includes("--force");
const NOICONS = Deno.args.includes("--no-icons");

await load({ export: true });

// Get the correct path to the extensions folder
const repoPath = Deno.env.get("REPO_PATH")
  ? `${Deno.env.get("REPO_PATH")}/extensions`
  : import.meta.resolve("../repo/extensions").replace("file://", "");

// Discover all packages
const { packages, swiftPackages } = await discoverPackages(repoPath);
console.log(packages.length, "packages found");

// Parse all packages and collect categories
const categories = new Set<string>();
const parsedPackages: PackageWithVersion[] = [];
for await (const pkg of parsePackages(packages, repoPath, categories)) {
  parsedPackages.push(pkg);
}

// Organize packages by category
const categoriesMap = organizeByCategory(parsedPackages);
const sortedCategories = getSortedCategories(categories);

// Generate markdown content
const { content: sectionsContent, tableOfContents: toc, data } = generateMarkdown(
  categoriesMap,
  sortedCategories,
  swiftPackages,
);

// Collect statistics
const stats = collectStatistics(parsedPackages);

// Collect API version statistics
const apiVersions = collectApiVersions(parsedPackages);

// Generate statistics text
const statisticsContent = generateStatisticsText(
  stats,
  packages.length,
  swiftPackages.size,
);

// Update README
const README_FILE = import.meta.resolve("../README.md").replace("file://", "");
const readme = await Deno.readTextFile(README_FILE);

const tableOfContents = `${toc}\n- [License](#license)`;

const { updatedText, hasChanges, updateTimeIconPrefix } = updateReadme(
  readme,
  sectionsContent,
  tableOfContents,
  statisticsContent,
);

// Check if we should exit early
if (!hasChanges && !FORCE) {
  console.log("No changes detected");
  Deno.exit(0);
}

// Save history
const HISTORY_FILE = import.meta.resolve("../data/history.json").replace("file://", "");
const historyItem: HistoryItem = {
  timestamp: Date.now(),
  packages: packages.length,
  authors: Array.from(stats.authors.keys()).length,
  contributors: Array.from(stats.contributors.keys()).length,
  onlyContributors: Array.from(stats.contributors.entries())
    .filter(([contributor]) => !stats.authors.has(contributor))
    .length,
  noPlatformSelected: stats.platformStats.noPlatformSelected,
  macOnly: stats.platformStats.macOnly,
  withWindows: stats.platformStats.withWindows,
  windowsOnly: stats.platformStats.windowsOnly,
};

await saveHistory(HISTORY_FILE, historyItem);

// Save data
const DATA_FILE = import.meta.resolve("../data/data.json").replace("file://", "");
await Deno.writeTextFile(
  DATA_FILE,
  JSON.stringify(data.sort((a, b) => a.name.localeCompare(b.name))),
);

// Save API versions
const API_VERSIONS_FILE = import.meta.resolve("../data/api-versions.json").replace("file://", "");
await Deno.writeTextFile(
  API_VERSIONS_FILE,
  JSON.stringify(apiVersions),
);

// Generate icons
if (!NOICONS) {
  await generateIcons([
    generateUpdateTimeIcon(updateTimeIconPrefix),
  ], true);
}

// Write updated README
await Deno.writeTextFile(README_FILE, updatedText);
