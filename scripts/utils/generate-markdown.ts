import { MarkdownOutput, PackageWithVersion } from "../types/internal.ts";
import { DataObject } from "../types/external.ts";

/**
 * Generates markdown content for packages organized by category.
 */
export function generateMarkdown(
  categoriesMap: Map<string, PackageWithVersion[]>,
  sortedCategories: string[],
  swiftPackages: Set<string>,
): MarkdownOutput {
  let output = "";
  let toc = "- [Statistics](#statistics)\n- [Categories](#categories)";
  const data: DataObject[] = [];

  sortedCategories.forEach((category, i) => {
    console.log(`Processing category: ${category}`);
    toc += `\n  - [${category}](#${category.toLowerCase().replaceAll(" ", "-")})`;
    const pkgs = categoriesMap.get(category);
    if (pkgs) {
      const sorted = pkgs.sort((a, b) => a.title.localeCompare(b.title));
      output += i !== 0
        ? `

--------------------

## ${category}\n\n`
        : `### ${category}\n\n`;
      output += "**[`^        back to top        ^`](#awesome-raycast)**\n\n";
      sorted.forEach((pkg) => {
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
        };
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

        const titleLink = `[${pkg.title}](https://raycast.com/${pkg.author}/${pkg.name})`;
        const authorLink = `[\`@${pkg.author}\`](https://raycast.com/${pkg.author})`;
        const issuesLink = `[\`issues\`](${
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
        ].filter((s) => s && s.length > 0).join(" ").trim();
        output += `${line}\n`;
      });
    }
  });

  return { content: output, tableOfContents: toc, data };
}
