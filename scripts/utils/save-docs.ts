import { emptyDir, ensureDir } from "@std/fs";

import { categoryToSlug } from "./generate-markdown.ts";

const docsFolder = import.meta.resolve("../../docs").replace("file://", "");

const REPO_URL = "https://github.com/j3lte/awesome-raycast";

/**
 * Writes one markdown file per category into docs/.
 * Each file contains: title, update-time badge, back link, and the extension list.
 */
export async function saveDocs(
  categoryDocs: Map<string, string>,
  sortedCategories: string[],
  seed: string,
): Promise<void> {
  await ensureDir(docsFolder);
  await emptyDir(docsFolder);
  await Deno.writeTextFile(`${docsFolder}/.gitkeep`, "");

  for (const category of sortedCategories) {
    const content = categoryDocs.get(category);
    if (!content) continue;

    const slug = categoryToSlug(category);
    const header = [
      `# ${category}`,
      ``,
      `![Last update](../graphics/update-time-${seed}.svg) — [← awesome-raycast](${REPO_URL})`,
      ``,
      ``,
    ].join("\n");

    await Deno.writeTextFile(`${docsFolder}/${slug}.md`, header + content);
  }

  console.log(`[save-docs] Saved ${categoryDocs.size} category docs`);
}
