import type { PackageWithVersion } from "../types/internal.ts";

type PackageLockV3 = {
  lockfileVersion: number;
  packages?: Record<string, { version?: string }>;
  dependencies?: Record<string, { version?: string }>;
};

/**
 * Reads a package-lock.json and returns a map of package name to exact installed version.
 */
async function readLockfileVersions(
  lockPath: string,
): Promise<Map<string, string>> {
  const versions = new Map<string, string>();
  try {
    const file = await Deno.readFile(lockPath);
    const lockFile = JSON.parse(
      new TextDecoder().decode(file),
    ) as PackageLockV3;

    if (lockFile.packages) {
      // lockfileVersion 2 or 3: keys are "node_modules/<name>"
      for (const [key, value] of Object.entries(lockFile.packages)) {
        if (key === "" || !value.version) continue;
        const name = key.replace(/^node_modules\//, "");
        versions.set(name, value.version);
      }
    } else if (lockFile.dependencies) {
      // lockfileVersion 1: keys are package names directly
      for (const [name, value] of Object.entries(lockFile.dependencies)) {
        if (value.version) {
          versions.set(name, value.version);
        }
      }
    }
  } catch {
    // No lock file found, fall back to package.json versions
  }
  return versions;
}

/**
 * Resolves dependency versions using exact versions from the lock file where available.
 */
function resolveVersions(
  deps: Record<string, string>,
  lockVersions: Map<string, string>,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [name, version] of Object.entries(deps)) {
    resolved[name] = lockVersions.get(name) ?? version;
  }
  return resolved;
}

/**
 * Parses a package.json file and extracts relevant information.
 * Also reads the corresponding package-lock.json to resolve exact installed versions.
 */
export async function parsePackage(
  pkgPath: string,
  repoPath: string,
): Promise<PackageWithVersion> {
  const file = await Deno.readFile(pkgPath);
  const pkgFile = JSON.parse(
    new TextDecoder().decode(file),
  ) as PackageWithVersion;

  // Normalize categories
  if (!pkgFile.categories || pkgFile.categories.length === 0) {
    pkgFile.categories = [];
  } else {
    // We're only allowing one category per package
    pkgFile.categories = [pkgFile.categories[0]];
  }

  // Set path relative to repo
  pkgFile.path = pkgPath.replace(repoPath, "").replace("/package.json", "");

  // Resolve exact versions from package-lock.json
  const lockPath = pkgPath.replace("package.json", "package-lock.json");
  const lockVersions = await readLockfileVersions(lockPath);

  if (lockVersions.size > 0) {
    pkgFile.dependencies = resolveVersions(pkgFile.dependencies, lockVersions);
    if (pkgFile.devDependencies) {
      pkgFile.devDependencies = resolveVersions(pkgFile.devDependencies, lockVersions);
    }
  }

  // Extract Raycast-specific dependencies
  pkgFile.raycast = pkgFile.dependencies["@raycast/api"] || null;
  pkgFile.utils = pkgFile.dependencies["@raycast/utils"] || null;

  return pkgFile;
}

/**
 * Parses all packages and yields them one by one.
 * Also collects categories as they are parsed.
 */
export async function* parsePackages(
  packages: string[],
  repoPath: string,
  categories: Set<string>,
): AsyncGenerator<PackageWithVersion> {
  for (const pkg of packages) {
    const pkgFile = await parsePackage(pkg, repoPath);
    // Collect categories
    for (const category of pkgFile.categories) {
      categories.add(category);
    }
    yield pkgFile;
  }
}
