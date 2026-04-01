import type { DataObject } from "../types/external.ts";
import type { MarkdownOutput, PackageWithVersion } from "../types/internal.ts";
import { parseChangelog } from "./parse-changelog.ts";

export function categoryToSlug(category: string): string {
  return category.toLowerCase().replaceAll(" ", "-");
}

/**
 * Generates markdown content for packages organized by category.
 * Returns per-category docs content and data for the README.
 */
export async function generateMarkdown(
  categoriesMap: Map<string, PackageWithVersion[]>,
  sortedCategories: string[],
  swiftPackages: Set<string>,
  repoPath: string,
  issuesLabels: Map<string, number>,
): Promise<MarkdownOutput> {
  let extensionIssueCount = 0;
  let toc = "- [Statistics](#statistics)\n- [Categories](#categories)";
  const data: DataObject[] = [];
  const categoryDocs = new Map<string, string>();
  const missingChangelogs: string[] = [];

  for (const category of sortedCategories) {
    console.log(`[markdown] Processing category: ${category}`);
    const slug = categoryToSlug(category);
    toc += `\n  - [${category}](docs/${slug}.md)`;

    const pkgs = categoriesMap.get(category);
    if (!pkgs) continue;

    let categoryContent = "";
    const sorted = pkgs.sort((a, b) => a.title.localeCompare(b.title));

    for (const pkg of sorted) {
      const changelogPath = `${repoPath}${pkg.path}/CHANGELOG.md`;
      let latestUpdate: { value: string; timestamp: number } | null = null;
      try {
        latestUpdate = await parseChangelog(changelogPath);
      } catch (error) {
        console.error(`[markdown] Error processing changelog for package ${pkg.name}:`, error);
      }

      if (!latestUpdate) {
        missingChangelogs.push(pkg.name);
      }

      const issues = issuesLabels.get(`extension: ${pkg.name}`) || 0;

      const d: DataObject = {
        name: pkg.name,
        title: pkg.title,
        description: pkg.description,
        author: pkg.author,
        contributors: pkg.contributors || [],
        api: pkg.raycast,
        utils: pkg.utils,
        hasAi: false,
        hasTools: false,
        deps: { ...pkg.dependencies },
        dev_deps: pkg.devDependencies,
        latestUpdate,
      };

      if (issues > 0) {
        d.issues = issues;
        extensionIssueCount += issues;
      }
      if (pkg.owner) {
        d.owner = pkg.owner;
      }

      delete d.deps["@raycast/api"];
      delete d.deps["@raycast/utils"];

      if (swiftPackages.has(pkg.name)) {
        d.swift = true;
      }
      if (pkg.ai && Object.keys(pkg.ai).length > 0) {
        d.hasAi = true;
      }
      if (pkg.tools && pkg.tools.length > 0) {
        d.hasTools = true;
      }
      if (typeof pkg.platforms === "undefined") {
        d.win = false;
        d.mac = true;
      } else {
        d.win = pkg.platforms.includes("Windows");
        d.mac = pkg.platforms.includes("macOS");
      }

      const linkHandle = pkg.owner ?? pkg.author;
      const titleLink = `[${pkg.title}](https://raycast.com/${linkHandle}/${pkg.name})`;
      const authorLink = `[\`@${linkHandle}\`](https://raycast.com/${linkHandle})`;
      const issuesLink = `[\`issues${issues > 0 ? " (" + issues + ")" : ``}\`](${
        encodeURI(
          `https://github.com/raycast/extensions/issues?q=sort:updated-desc+state:open+label:"extension:+${pkg.name}"`,
        )
      })`;
      const pullRequestsLink = `[\`PR\`](${
        encodeURI(
          `https://github.com/raycast/extensions/pulls?q=sort:updated-desc+is:pr+is:open+label:"extension:+${pkg.name}"`,
        )
      })`;
      const codeLink =
        `[\`code\`](https://github.com/raycast/extensions/tree/main/extensions${pkg.path})`;

      data.push(d);
      const line = [
        `- **${titleLink}**`,
        `- ${(pkg.description || "").replace(/\n/g, " ").trim()}`,
        authorLink,
        `${issuesLink}/${pullRequestsLink}`,
        codeLink,
        `\`api@${pkg.raycast}\``,
        pkg.utils ? `\`utils@${pkg.utils}\`` : "",
        swiftPackages.has(pkg.name) ? "`swift`" : "",
        d.hasAi ? "`ai`" : "",
        d.hasTools ? "`ai-tools`" : "",
        d.win && !d.mac ? "`Windows only`" : (d.win ? "`+Windows`" : ""),
        d.latestUpdate ? `\`Last updated: ${d.latestUpdate.value}\`` : "",
      ].filter((s) => s && s.length > 0).join(" ").trim();
      categoryContent += `${line}\n`;
    }

    categoryDocs.set(category, categoryContent);
  }

  if (missingChangelogs.length > 0) {
    console.warn(`[markdown] ${missingChangelogs.length} extensions without a changelog:`);
    for (const name of missingChangelogs) {
      console.warn(`[markdown]   - ${name}`);
    }
  }

  return { tableOfContents: toc, data, extensionIssueCount, categoryDocs };
}
