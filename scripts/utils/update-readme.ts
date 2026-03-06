import { format } from "date-fns";
import { customAlphabet } from "nanoid";

import type { Icon, UpdateResult } from "../types/internal.ts";

import { updateTexts } from "./update-text.ts";

const nanoid = customAlphabet("1234567890abcdef", 16);

/**
 * Updates the README with new content.
 * Returns the updated text, whether changes were detected, and the icon prefix for the update time badge.
 */
export function updateReadme(
  readme: string,
  tableOfContents: string,
  statisticsContent: string,
): UpdateResult {
  const prefix = nanoid();

  const { updatedText } = updateTexts(readme, [
    {
      blockID: "UPDATETIME",
      update: `![Last update](graphics/${prefix}_update-time.svg)`,
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

  return {
    updatedText,
    updateTimeIconPrefix: prefix,
  };
}

/**
 * Generates the update time icon format.
 */
export function generateUpdateTimeIcon(prefix: string): Icon {
  return {
    fileName: `${prefix}_update-time.svg`,
    format: {
      label: "Last update",
      message: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      color: "blue",
    },
  };
}
