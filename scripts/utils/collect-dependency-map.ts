import type { DataObject } from "../types/external.ts";

/**
 * Builds a map of `package@version` to the list of extensions using that exact version.
 * Includes both dependencies and devDependencies, plus @raycast/api and @raycast/utils.
 */
export function collectDependencyMap(
  data: DataObject[],
): Record<string, string[]> {
  const map = new Map<string, string[]>();

  for (const ext of data) {
    const allDeps: Record<string, string> = { ...ext.deps, ...ext.dev_deps };
    if (ext.api) allDeps["@raycast/api"] = ext.api;
    if (ext.utils) allDeps["@raycast/utils"] = ext.utils;

    for (const [name, version] of Object.entries(allDeps)) {
      const key = `${name}@${version}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(ext.name);
    }
  }

  // Sort extension lists and convert to a plain object sorted by key
  const sorted = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b));

  const result: Record<string, string[]> = {};
  for (const [key, extensions] of sorted) {
    result[key] = extensions.sort((a, b) => a.localeCompare(b));
  }

  return result;
}
