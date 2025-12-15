import type { ApiVersion } from "../types/external.ts";
import type { PackageWithVersion } from "../types/internal.ts";

/**
 * Normalizes a version string by removing the `^` prefix for comparison purposes.
 */
function normalizeVersion(version: string): string {
  return version.replace(/^[\^~]/, "");
}

/**
 * Parses a semver version string into numeric parts and optional pre-release/build metadata.
 */
function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
} {
  const normalized = normalizeVersion(version);
  // Remove build metadata (everything after +)
  const withoutBuild = normalized.split("+")[0];
  // Split version and pre-release
  const [versionPart, preRelease] = withoutBuild.split("-");
  const parts = versionPart.split(".").map(Number);

  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    preRelease,
  };
}

/**
 * Compares two semver version strings.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
function compareVersions(a: string, b: string): number {
  const aParsed = parseVersion(a);
  const bParsed = parseVersion(b);

  // Compare major.minor.patch
  if (aParsed.major !== bParsed.major) {
    return aParsed.major - bParsed.major;
  }
  if (aParsed.minor !== bParsed.minor) {
    return aParsed.minor - bParsed.minor;
  }
  if (aParsed.patch !== bParsed.patch) {
    return aParsed.patch - bParsed.patch;
  }

  // If versions are equal, pre-release versions come before stable versions
  if (aParsed.preRelease && !bParsed.preRelease) return -1;
  if (!aParsed.preRelease && bParsed.preRelease) return 1;
  if (aParsed.preRelease && bParsed.preRelease) {
    return aParsed.preRelease.localeCompare(bParsed.preRelease);
  }

  return 0;
}

/**
 * Collects API version statistics from packages.
 * Groups packages by their @raycast/api version and returns a sorted list.
 */
export function collectApiVersions(
  packages: PackageWithVersion[],
): ApiVersion[] {
  const versionMap = new Map<string, string[]>();

  // Group packages by their API version
  for (const pkg of packages) {
    if (pkg.raycast) {
      const version = pkg.raycast;
      if (!versionMap.has(version)) {
        versionMap.set(version, []);
      }
      versionMap.get(version)!.push(pkg.name);
    }
  }

  // Convert to array and sort by version (descending - newest first)
  const apiVersions: ApiVersion[] = Array.from(versionMap.entries())
    .map(([version, packageNames]) => ({
      version,
      packages: packageNames.sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => compareVersions(b.version, a.version)); // Descending order

  return apiVersions;
}
