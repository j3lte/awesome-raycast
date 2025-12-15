import { PackageWithVersion } from "../types/internal.ts";

/**
 * Organizes packages by category.
 * Packages without categories are placed in "Uncategorized".
 */
export function organizeByCategory(
  packages: PackageWithVersion[],
): Map<string, PackageWithVersion[]> {
  const categoriesMap = new Map<string, PackageWithVersion[]>();

  for (const pkg of packages) {
    if (pkg.categories.length === 0) {
      if (!categoriesMap.has("Uncategorized")) {
        categoriesMap.set("Uncategorized", []);
      }
      categoriesMap.get("Uncategorized")?.push(pkg);
    } else {
      for (const category of pkg.categories) {
        if (!categoriesMap.has(category)) {
          categoriesMap.set(category, []);
        }
        categoriesMap.get(category)?.push(pkg);
      }
    }
  }

  return categoriesMap;
}

/**
 * Gets sorted category list, with "Uncategorized" at the end.
 */
export function getSortedCategories(categories: Set<string>): string[] {
  return [...Array.from(categories).sort(), "Uncategorized"];
}
