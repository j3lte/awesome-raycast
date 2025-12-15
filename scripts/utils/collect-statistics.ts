import type { PackageWithVersion, Statistics } from "../types/internal.ts";

/**
 * Collects statistics from packages.
 */
export function collectStatistics(
  packages: PackageWithVersion[],
): Statistics {
  const categories = new Set<string>();
  const raycastVersions = new Set<string>();
  const raycastUtilsVersions = new Set<string>();
  const authors = new Map<string, number>();
  const contributors = new Map<string, number>();

  const platformStats = {
    noPlatformSelected: 0,
    withWindows: 0,
    windowsOnly: 0,
    macOnly: 0,
  };

  for (const pkg of packages) {
    // Collect categories
    for (const category of pkg.categories) {
      categories.add(category);
    }

    // Collect versions
    if (pkg.raycast) {
      raycastVersions.add(pkg.raycast);
    }
    if (pkg.utils) {
      raycastUtilsVersions.add(pkg.utils);
    }

    // Collect authors
    if (!authors.has(pkg.author)) {
      authors.set(pkg.author, 0);
    }
    authors.set(pkg.author, authors.get(pkg.author)! + 1);

    // Collect contributors
    if (pkg.contributors) {
      pkg.contributors.forEach((contributor) => {
        if (!contributors.has(contributor)) {
          contributors.set(contributor, 0);
        }
        contributors.set(contributor, contributors.get(contributor)! + 1);
      });
    }

    // Collect platform statistics
    if (typeof pkg.platforms === "undefined") {
      platformStats.noPlatformSelected++;
    } else {
      if (pkg.platforms.includes("Windows")) {
        platformStats.withWindows++;
      }
      if (pkg.platforms.includes("Windows") && !pkg.platforms.includes("macOS")) {
        platformStats.windowsOnly++;
      }
      if (pkg.platforms.includes("macOS") && !pkg.platforms.includes("Windows")) {
        platformStats.macOnly++;
      }
    }
  }

  return {
    categories,
    raycastVersions,
    raycastUtilsVersions,
    authors,
    contributors,
    platformStats,
  };
}
