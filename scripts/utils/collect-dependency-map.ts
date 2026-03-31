import type { DataObject } from "../types/external.ts";

export type DependencyMaps = {
  deps: Record<string, string[]>;
  devDeps: Record<string, string[]>;
};

/**
 * Collects dependencies into a map of `package@version` to extension names.
 */
function buildMap(
  data: DataObject[],
  getDeps: (ext: DataObject) => Record<string, string>,
): Record<string, string[]> {
  const map = new Map<string, string[]>();

  for (const ext of data) {
    for (const [name, version] of Object.entries(getDeps(ext))) {
      const key = `${name}@${version}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(ext.name);
    }
  }

  const sorted = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b));

  const result: Record<string, string[]> = {};
  for (const [key, extensions] of sorted) {
    result[key] = extensions.sort((a, b) => a.localeCompare(b));
  }

  return result;
}

/**
 * Builds separate dependency maps for production and dev dependencies.
 * Production deps include @raycast/api and @raycast/utils.
 */
export function collectDependencyMaps(data: DataObject[]): DependencyMaps {
  const deps = buildMap(data, (ext) => {
    const d: Record<string, string> = { ...ext.deps };
    if (ext.api) d["@raycast/api"] = ext.api;
    if (ext.utils) d["@raycast/utils"] = ext.utils;
    return d;
  });

  const devDeps = buildMap(data, (ext) => ext.dev_deps);

  return { deps, devDeps };
}
