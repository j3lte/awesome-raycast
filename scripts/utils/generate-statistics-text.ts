import type { Statistics } from "../types/internal.ts";

const CONTRIBUTIONS_LENGTH = 10;

/**
 * Generates the statistics text for the README.
 */
export function generateStatisticsText(
  stats: Statistics,
  packagesCount: number,
  swiftPackagesCount: number,
): string {
  const authorsSize = Array.from(stats.authors.keys()).length;
  const contributorsSize = Array.from(stats.contributors.keys()).length;

  const authorsArr = Array.from(stats.authors.entries()).sort((a, b) =>
    b[1] - a[1] || a[0].localeCompare(b[0])
  );
  const contributorsArr = Array.from(stats.contributors.entries()).sort((a, b) =>
    b[1] - a[1] || a[0].localeCompare(b[0])
  );

  const topAuthors = authorsArr.slice(0, CONTRIBUTIONS_LENGTH);
  const topContributors = contributorsArr.slice(0, CONTRIBUTIONS_LENGTH);

  // Only contributors (not authors)
  const onlyContributors = contributorsArr.filter(
    ([contributor]) => !stats.authors.has(contributor),
  ).length;

  const { noPlatformSelected, macOnly, withWindows, windowsOnly } = stats.platformStats;
  const { total: totalCommands, byMode } = stats.commandStats;

  return `
- **${packagesCount}** packages in **${stats.categories.size}** categories, **${swiftPackagesCount}** packages use Swift
- **${authorsSize}** authors, **${contributorsSize}** contributors (of which **${onlyContributors}** are only contributors, not authors)
- **${totalCommands}** total commands (${byMode.view} view, ${byMode["no-view"]} no-view, ${
    byMode["menu-bar"]
  } menu-bar)
- **${stats.aiToolCount}** AI tools
- **${noPlatformSelected}** packages have no platform selected (${
    Math.round((noPlatformSelected / packagesCount) * 10000) / 100
  }%, macOS only)
- **${macOnly}** packages have macOS only (${Math.round((macOnly / packagesCount) * 10000) / 100}%)
- **${withWindows}** packages have Windows (${
    Math.round((withWindows / packagesCount) * 10000) / 100
  }%), of which **${windowsOnly}** packages have Windows only (${
    Math.round((windowsOnly / packagesCount) * 10000) / 100
  }%)
- Top **${CONTRIBUTIONS_LENGTH}** authors:
${
    topAuthors.map(([author, count]) => `  - [${author}](https://raycast.com/${author}) (${count})`)
      .join("\n")
  }
- Top **${CONTRIBUTIONS_LENGTH}** contributors:
${
    topContributors.map(([contributor, count]) =>
      `  - [${contributor}](https://raycast.com/${contributor}) (${count})`
    ).join("\n")
  }
`;
}
