import { PackageWithVersion } from "../types/internal.ts";

/**
 * Parses a package.json file and extracts relevant information.
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
