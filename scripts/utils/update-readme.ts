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
  sectionsContent: string,
  tableOfContents: string,
  statisticsContent: string,
): UpdateResult {
  const prefix = nanoid();

  // Update update time
  const { updatedText: stage1 } = updateText(
    "UPDATETIME",
    readme,
    `![Last update](/icons/${prefix}_update-time.svg)`,
  );

  // Update sections
  const { updatedText: stage2, hasChanges: stage2Changes } = updateText(
    "SECTIONS",
    stage1,
    sectionsContent,
  );

  // Update table of contents
  const { updatedText: stage3, hasChanges: stage3Changes } = updateText(
    "TABLE_OF_CONTENTS",
    stage2,
    tableOfContents,
  );

  // Update statistics
  const { updatedText: stageFinal, hasChanges: stageFinalChanges } = updateText(
    "STATISTICS",
    stage3,
    statisticsContent,
  );

  return {
    updatedText: stageFinal,
    hasChanges: stage2Changes || stage3Changes || stageFinalChanges,
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
