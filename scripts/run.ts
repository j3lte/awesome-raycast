import { load } from "@std/dotenv";
import { walk } from "@svarta/walk-it";
import { customAlphabet } from "nanoid";
import { format } from "date-fns";

import generateIcons from "./utils/generate-icons.ts";
import updateText from "./utils/update-text.ts";

const nanoid = customAlphabet("1234567890abcdef", 16);

await load({ export: true });

type Package = {
  path: string;
  name: string;
  title: string;
  description: string;
  author: string;
  contributors?: string[];
  dependencies: Record<string, string>;
  categories: string[];
};

type PackageWithVersion = Package & {
  raycast: string | null;
  utils: string | null;
};

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
    entry.folders && entry.folders.map((f) => f.entry.name).includes("swift") ||
    entry.files && entry.files.find((f) => f.entry.name === "Package.swift")
  ) {
    swiftPackages.add(entry.dir.replace(repoPath, ""));
  }
  const pkg = entry.files.find((f) => f.entry.name === "package.json");
  if (pkg) {
    packages.push(`${entry.dir}/${pkg.entry.name}`);
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
      const line = [
        `- **[${pkg.title}](https://raycast.com/${pkg.author}/${pkg.name})**`,
        `- ${(pkg.description || "").replace(/\n/g, " ").trim()}`,
        `[\`@${pkg.author}\`](https://raycast.com/${pkg.author})`,
        `[\`code\`](https://github.com/raycast/extensions/tree/main/extensions${pkg.path})`,
        `\`api@${pkg.raycast}\``,
        pkg.utils ? `\`utils@${pkg.utils}\`` : "",
      ].filter(Boolean).join(" ").trim();
      output += `${line}\n`;
    });
  }
});

const prefix = nanoid();

// Generate badges for raycast and raycast-utils versions
// DISABLED FOR NOW
// await generateIcons(
//   Array.from(raycastVersions).map((version) => ({
//     fileName: `raycast-${version.replaceAll(".", "_")}.svg`,
//     format: {
//       label: "@raycast/api",
//       message: version,
//       color: "blue",
//     },
//   })),
//   true,
// );
// await generateIcons(
//   Array.from(raycastUtilsVersions).map((version) => ({
//     fileName: `raycast-utils-${version.replaceAll(".", "_")}.svg`,
//     format: {
//       label: "@raycast/utils",
//       message: version,
//       color: "orange",
//     },
//   })),
// );
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
}], true);

const README_FILE = import.meta.resolve("../README.md").replace("file://", "");
const readme = await Deno.readTextFile(README_FILE);

toc += `
- [License](#license)
`;

const authorsSize = Array.from(authors.keys()).length;
const contributorsSize = Array.from(contributors.keys()).length;

const authorsArr = Array.from(authors.entries()).sort((a, b) => b[1] - a[1]);
const contributorsArr = Array.from(contributors.entries()).sort((a, b) => b[1] - a[1]);

const topFiveAuthors = authorsArr.slice(0, 5);
const topFiveContributors = contributorsArr.slice(
  0,
  5,
);

// only contributor
const onlyContributors = contributorsArr.filter(
  ([contributor]) => !authors.has(contributor),
).length;

let updatedReadMe = updateText(
  "UPDATETIME",
  readme,
  `![Last update](/icons/${prefix}_update-time.svg)`,
);
updatedReadMe = updateText("SECTIONS", updatedReadMe, output);
updatedReadMe = updateText("TABLE_OF_CONTENTS", updatedReadMe, toc);
updatedReadMe = updateText(
  "STATISTICS",
  updatedReadMe,
  `
- **${packages.length}** packages in **${categories.size}** categories
- **${swiftPackages.size}** packages use Swift
- **${authorsSize}** authors
- Top **5** authors:
${
    topFiveAuthors.map(([author, count]) =>
      `  - [${author}](https://raycast.com/${author}) (${count})`
    ).join(
      "\n",
    )
  }
- **${contributorsSize}** contributors
  - of which **${onlyContributors}** contributors are only contributors
- Top **5** contributors:
${
    topFiveContributors.map(([contributor, count]) =>
      `  - [${contributor}](https://raycast.com/${contributor}) (${count})`
    ).join("\n")
  }
`,
);

await Deno.writeTextFile(README_FILE, updatedReadMe);
