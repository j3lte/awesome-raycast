/**
 * Data Object Type, used to store the data of the extension repo. Formatting for `data/data.json`.
 *
 * This is used to store the data of the extension repo in a structured format.
 */
export type DataObject = {
  /** Name of the extension, corresponds with the path `extensions/<name>/package.json` */
  name: string;
  /** Title of the extension */
  title: string;
  /** Description of the extension */
  description: string;
  /** Author of the extension */
  author: string;
  /** Contributors of the extension */
  contributors: string[];
  /** API version of the extension */
  api: string | null;
  /** Utils version of the extension */
  utils: string | null;
  /** Whether the extension uses Swift (Mac) */
  swift?: boolean;
  /** Whether the extension has AI features */
  hasAi: boolean;
  /** Whether the extension has AI tools */
  hasTools: boolean;
  /** Whether the extension has Windows support */
  win?: boolean;
  /** Whether the extension has macOS support */
  mac?: boolean;
  /** Dependencies of the extension. This excludes `@raycast/api` and `@raycast/utils`, as they are tracked in `api` and `utils` respectively. */
  deps: Record<string, string>;
  /** Development dependencies of the extension */
  dev_deps: Record<string, string>;
};

/**
 * History Item Type, used to save the history of the extension repo. Formatting for `data/history.json`.
 *
 * This is used to track the number of packages, authors, contributors, etc over time.
 */
export type HistoryItem = {
  /** Unix timestamp of the history item */
  timestamp: number;
  /** Number of packages in the extension repo */
  packages: number;
  /** Number of authors in the extension repo */
  authors: number;
  /** Number of contributors in the extension repo */
  contributors: number;
  /** Number of only contributors in the extension repo */
  onlyContributors: number;
  /** Number of packages with no platform selected in the extension repo */
  noPlatformSelected: number;
  /** Number of packages with macOS only in the extension repo */
  macOnly: number;
  /** Number of packages with Windows in the extension repo */
  withWindows: number;
  /** Number of packages with Windows only in the extension repo */
  windowsOnly: number;
};

/**
 * API Version Type, used to store API version statistics. Formatting for `data/api-versions.json`.
 *
 * This is used to track which packages use which version of `@raycast/api`.
 */
export type ApiVersion = {
  /** The version of `@raycast/api` (may include `^` prefix) */
  version: string;
  /** List of package names using this API version */
  packages: string[];
};
