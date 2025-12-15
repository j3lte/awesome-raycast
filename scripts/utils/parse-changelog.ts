/**
 * Parses a CHANGELOG.md file and extracts the latest update date.
 *
 * Looks for changelog entries in the format:
 * - Headers from ## to lower levels (##, ###, ####, etc.)
 * - Title containing something like [Update], [Enhancements], etc.
 * - Ending with ` - yyyy-mm-dd`
 *
 * Returns the latest date found, or null if no valid date is found.
 */
export async function parseChangelog(
  changelogPath: string,
): Promise<{ value: string; timestamp: number } | null> {
  try {
    const changelogContent = await Deno.readTextFile(changelogPath);

    // Match headers (## to ######) followed by text and ending with ` - yyyy-mm-dd`
    // Pattern matches: ## [Something] - 2025-01-15 or ### [Update] - 2024-12-25
    // The pattern looks for headers that end with ` - yyyy-mm-dd`
    const datePattern = /^#{2,6}\s+.+?\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/gm;

    const dates: string[] = [];
    let match;

    while ((match = datePattern.exec(changelogContent)) !== null) {
      const dateStr = match[1];
      // Validate date format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        dates.push(dateStr);
      }
    }

    if (dates.length === 0) {
      return null;
    }

    // Sort dates and get the latest one
    dates.sort((a, b) => b.localeCompare(a)); // Descending order
    const latestDate = dates[0];

    // Parse date and create timestamp
    const [year, month, day] = latestDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const timestamp = date.getTime();

    return {
      value: latestDate,
      timestamp,
    };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // Silently return null for not found errors
      return null;
    }
    // Log other errors but don't throw
    console.error(`Error parsing changelog at ${changelogPath}:`, error);
    return null;
  }
}
