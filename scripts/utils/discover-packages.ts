import { walk } from "@svarta/walk-it";

import type { DiscoveredPackages } from "../types/internal.ts";

/**
 * Discovers all packages in the extensions folder.
 * Returns both regular packages (with package.json) and Swift packages.
 */
export async function discoverPackages(
  repoPath: string,
): Promise<DiscoveredPackages> {
  const packages: string[] = [];
  const swiftPackages: Set<string> = new Set();

  for await (const entry of walk(repoPath, { maxLevel: 1 })) {
    // Check for Swift packages
    if (
      entry.folders && entry.folders.map((f) => f.name).includes("swift") ||
      entry.files && entry.files.find((f) => f.name === "Package.swift")
    ) {
      const swiftPkg = entry.dir.replace(repoPath, "");
      swiftPackages.add(swiftPkg.startsWith("/") ? swiftPkg.slice(1) : swiftPkg);
    }

    // Check for regular packages
    const pkg = entry.files.find((f) => f.name === "package.json");
    if (pkg) {
      packages.push(`${entry.dir}/${pkg.name}`);
    }
  }

  return { packages, swiftPackages };
}
