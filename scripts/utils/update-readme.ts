import { format } from "date-fns";

import type { Icon } from "../types/internal.ts";
import { updateTexts } from "./update-text.ts";

/**
 * Updates the README with new content.
 * Returns the updated text.
 */
export function updateReadme(
  readme: string,
  seed: string,
  tableOfContents: string,
  statisticsContent: string,
): string {
  const { updatedText } = updateTexts(readme, [
    {
      blockID: "UPDATETIME",
      update:
        `![Last update](graphics/update-time-${seed}.svg)&nbsp;![Last Run](https://github.com/j3lte/awesome-raycast/actions/workflows/cron.yml/badge.svg)`,
    },
    {
      blockID: "TABLE_OF_CONTENTS",
      update: tableOfContents,
    },
    {
      blockID: "STATISTICS",
      update: statisticsContent,
    },
  ]);

  return updatedText;
}

/**
 * Generates the update time icon format.
 */
export function generateUpdateTimeIcon(suffix: string): Icon {
  return {
    fileName: `update-time-${suffix}.svg`,
    format: {
      label: "Last update",
      message: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      color: "blue",
    },
  };
}
