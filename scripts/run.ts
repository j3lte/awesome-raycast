import { load } from "@std/dotenv";
import { walk } from "@svarta/walk-it";
import { customAlphabet } from "nanoid";
import { format } from "date-fns";

import generateIcons from "./utils/generate-icons.ts";
import updateText from "./utils/update-text.ts";
import { Data, DataObject, HistoryItem, PackageWithVersion } from "./types/index.ts";
import { saveHistory } from "./utils/save-history.ts";

const nanoid = customAlphabet("1234567890abcdef", 16);
const CONTRIBUTIONS_LENGTH = 7;

const FORCE = Deno.args.includes("--force");
const NOICONS = Deno.args.includes("--no-icons");

await load({ export: true });

const data: Data = [];

// Correct path to the extensions folder
const repoPath = Deno.env.get("REPO_PATH")
  ? `${Deno.env.get("REPO_PATH")}/extensions`
  : import.meta.resolve("../repo/extensions").replace(
    "file://",
    "",
  );

// We need to find all packages in the extensions folder (only package.json needed)
const packages: string[] = [];
const swiftPackages: Set<string> = new Set();
for await (const entry of walk(repoPath, { maxLevel: 1 })) {
  if (
    entry.folders && entry.folders.map((f) => f.name).includes("swift") ||
    entry.files && entry.files.find((f) => f.name === "Package.swift")
  ) {
    const swiftPkg = entry.dir.replace(repoPath, "");
    swiftPackages.add(swiftPkg.startsWith("/") ? swiftPkg.slice(1) : swiftPkg);
  }
  const pkg = entry.files.find((f) => f.name === "package.json");
  if (pkg) {
    packages.push(`${entry.dir}/${pkg.name}`);
  }
}

console.log(packages.length, "packages found");

const categories = new Set<string>();
const raycastVersions = new Set<string>();
const raycastUtilsVersions = new Set<string>();
const authors = new Map<string, number>();
const contributors = new Map<string, number>();

// We need to parse each package.json file to get the information we need
async function* parse() {
  for (const pkg of packages) {
    const file = await Deno.readFile(pkg);
    const pkgFile = JSON.parse(
      new TextDecoder().decode(file),
    ) as PackageWithVersion;
    if (!pkgFile.categories || pkgFile.categories.length === 0) {
      pkgFile.categories = [];
    } else {
      for (const category of pkgFile.categories) {
        categories.add(category);
      }
      // We're only allowing one category per package
      pkgFile.categories = [pkgFile.categories[0]];
    }
    pkgFile.path = pkg.replace(repoPath, "").replace("/package.json", "");
    pkgFile.raycast = pkgFile.dependencies["@raycast/api"] || null;
    pkgFile.utils = pkgFile.dependencies["@raycast/utils"] || null;

    if (pkgFile.raycast) {
      raycastVersions.add(pkgFile.raycast);
    }
    if (pkgFile.utils) {
      raycastUtilsVersions.add(pkgFile.utils);
    }

    if (!authors.has(pkgFile.author)) {
      authors.set(pkgFile.author, 0);
    }
    authors.set(pkgFile.author, authors.get(pkgFile.author)! + 1);
    if (pkgFile.contributors) {
      pkgFile.contributors.forEach((contributor) => {
        if (!contributors.has(contributor)) {
          contributors.set(contributor, 0);
        }
        contributors.set(contributor, contributors.get(contributor)! + 1);
      });
    }
    yield pkgFile;
  }
}

// We aggregate the packages by category
const categoriesMap = new Map<string, PackageWithVersion[]>();
for await (
  const pkg of parse()
) {
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

// We sort the categories and add the "Uncategorized" category
const sortedCategories = [...Array.from(categories).sort(), "Uncategorized"];

let output = "";
let toc = "- [Statistics](#statistics)\n- [Categories](#categories)";

let noPlatformSelected = 0;
let withWindows = 0;
let windowsOnly = 0;
let macOnly = 0;

// Generate markdown line per category and packages
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
        deps: pkg.dependencies,
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
        noPlatformSelected++;
        d.win = false;
        d.mac = true;
      } else {
        if (pkg.platforms.includes("Windows")) {
          withWindows++;
        }
        if (pkg.platforms.includes("Windows") && !pkg.platforms.includes("macOS")) {
          windowsOnly++;
        }
        if (pkg.platforms.includes("macOS") && !pkg.platforms.includes("Windows")) {
          macOnly++;
        }
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

const prefix = nanoid();

const README_FILE = import.meta.resolve("../README.md").replace("file://", "");
const readme = await Deno.readTextFile(README_FILE);

toc += `
- [License](#license)
`;

const authorsSize = Array.from(authors.keys()).length;
const contributorsSize = Array.from(contributors.keys()).length;

const authorsArr = Array.from(authors.entries()).sort((a, b) =>
  b[1] - a[1] || a[0].localeCompare(b[0])
);
const contributorsArr = Array.from(contributors.entries()).sort((a, b) =>
  b[1] - a[1] || a[0].localeCompare(b[0])
);

const topAuthors = authorsArr.slice(0, CONTRIBUTIONS_LENGTH);
const topContributors = contributorsArr.slice(
  0,
  CONTRIBUTIONS_LENGTH,
);

// only contributor
const onlyContributors = contributorsArr.filter(
  ([contributor]) => !authors.has(contributor),
).length;

const { updatedText: stage1 } = updateText(
  "UPDATETIME",
  readme,
  `![Last update](/icons/${prefix}_update-time.svg)`,
);
const { updatedText: stage2, hasChanges: stage2Changes } = updateText("SECTIONS", stage1, output);
const { updatedText: stage3, hasChanges: stage3Changes } = updateText(
  "TABLE_OF_CONTENTS",
  stage2,
  toc,
);
const { updatedText: stageFinal, hasChanges: stageFinalChanges } = updateText(
  "STATISTICS",
  stage3,
  `
- **${packages.length}** packages in **${categories.size}** categories, **${swiftPackages.size}** packages use Swift
- **${authorsSize}** authors, **${contributorsSize}** contributors (of which **${onlyContributors}** are only contributors, not authors)
- **${noPlatformSelected}** packages have no platform selected (${
    Math.round((noPlatformSelected / packages.length) * 10000) / 100
  }%, macOS only)
- **${macOnly}** packages have macOS only (${
    Math.round((macOnly / packages.length) * 10000) / 100
  }%)
- **${withWindows}** packages have Windows (${
    Math.round((withWindows / packages.length) * 10000) / 100
  }%), of which **${windowsOnly}** packages have Windows only (${
    Math.round((windowsOnly / packages.length) * 10000) / 100
  }%)
- Top **${CONTRIBUTIONS_LENGTH}** authors:
${
    topAuthors.map(([author, count]) => `  - [${author}](https://raycast.com/${author}) (${count})`)
      .join(
        "\n",
      )
  }
- Top **${CONTRIBUTIONS_LENGTH}** contributors:
${
    topContributors.map(([contributor, count]) =>
      `  - [${contributor}](https://raycast.com/${contributor}) (${count})`
    ).join("\n")
  }
`,
);

const DATA_FILE = import.meta.resolve("../data/data.json").replace("file://", "");
const HISTORY_FILE = import.meta.resolve("../data/history.json").replace("file://", "");

if (!stage2Changes && !stage3Changes && !stageFinalChanges && !FORCE) {
  console.log("No changes detected");
  Deno.exit(0);
}

const historyItem: HistoryItem = {
  timestamp: Date.now(),
  packages: packages.length,
  authors: authorsSize,
  contributors: contributorsSize,
  onlyContributors: onlyContributors,
  noPlatformSelected: noPlatformSelected,
  macOnly: macOnly,
  withWindows: withWindows,
  windowsOnly: windowsOnly,
};

await saveHistory(HISTORY_FILE, historyItem);
await Deno.writeTextFile(DATA_FILE, JSON.stringify(data));

if (!NOICONS) {
  await generateIcons([{
    fileName: `swift-packages.svg`,
    format: {
      label: "Swift",
      message: "Yes",
      color: "yellow",
    },
  }, {
    fileName: `${prefix}_update-time.svg`,
    format: {
      label: "Last update",
      message: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      color: "blue",
    },
  }, {
    fileName: `ai.svg`,
    format: {
      label: "AI",
      message: "Yes",
      color: "green",
    },
  }], true);
}

await Deno.writeTextFile(README_FILE, stageFinal);
