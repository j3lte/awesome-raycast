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
