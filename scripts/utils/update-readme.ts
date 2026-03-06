import { format } from "date-fns";
import { customAlphabet } from "nanoid";

import type { Icon, UpdateResult } from "../types/internal.ts";

import updateText from "./update-text.ts";

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

  // Update update time
  const { updatedText: stage1 } = updateText(
    "UPDATETIME",
    readme,
    `![Last update](graphics/${prefix}_update-time.svg)`,
  );

  // Update table of contents
  const { updatedText: stage2, hasChanges: stage2Changes } = updateText(
    "TABLE_OF_CONTENTS",
    stage1,
    tableOfContents,
  );

  // Update statistics
  const { updatedText: stageFinal, hasChanges: stageFinalChanges } = updateText(
    "STATISTICS",
    stage2,
    statisticsContent,
  );

  return {
    updatedText: stageFinal,
    hasChanges: stage2Changes || stageFinalChanges,
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
