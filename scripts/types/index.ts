export type Package = {
  path: string;
  name: string;
  title: string;
  description: string;
  author: string;
  contributors?: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  categories: string[];
  ai: Record<string, unknown>;
  tools?: Array<{ name: string }>;
  platforms?: Array<"macOS" | "Windows">;
};

export type PackageWithVersion = Package & {
  raycast: string | null;
  utils: string | null;
};

export type DataObject = {
  name: string;
  title: string;
  description: string;
  author: string;
  contributors: string[];
  api: string | null;
  utils: string | null;
  swift?: boolean;
  hasAi: boolean;
  hasTools: boolean;
  win?: boolean;
  mac?: boolean;
  deps: Record<string, string>;
  dev_deps: Record<string, string>;
};

export type Data = DataObject[];

export type HistoryItem = {
  timestamp: number;
  packages: number;
  authors: number;
  contributors: number;
  onlyContributors: number;
  noPlatformSelected: number;
  macOnly: number;
  withWindows: number;
  windowsOnly: number;
};
