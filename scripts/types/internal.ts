import type { DataObject } from "./external.ts";
import type { Format } from "badge-maker";

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
  commands?: Array<{ name: string; mode: "view" | "no-view" | "menu-bar" }>;
  tools?: Array<{ name: string; functionalities?: string[] }>;
  platforms?: Array<"macOS" | "Windows">;
};

export type PackageWithVersion = Package & {
  raycast: string | null;
  utils: string | null;
};

export type DiscoveredPackages = {
  packages: string[];
  swiftPackages: Set<string>;
};

export type Statistics = {
  categories: Set<string>;
  raycastVersions: Set<string>;
  raycastUtilsVersions: Set<string>;
  authors: Map<string, number>;
  contributors: Map<string, number>;
  platformStats: {
    noPlatformSelected: number;
    withWindows: number;
    windowsOnly: number;
    macOnly: number;
  };
  commandStats: {
    total: number;
    byMode: {
      view: number;
      "no-view": number;
      "menu-bar": number;
    };
  };
  aiToolCount: number;
};

export type MarkdownOutput = {
  content: string;
  tableOfContents: string;
  data: DataObject[];
};

export type UpdateResult = {
  updatedText: string;
  hasChanges: boolean;
  updateTimeIconPrefix: string;
};

export type Icon = {
  fileName: string;
  format: Format;
};
