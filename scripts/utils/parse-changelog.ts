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

    // Match headers (# to ######) followed by text and ending with a date
    // Handles variations:
    //   ## [Something] - 2025-01-15   (standard, with separator dash)
    //   ## [Something] 2025-01-15     (no separator dash)
    //   ## [Something] - (2025-01-15) (date wrapped in parentheses)
    //   # [Something] - 2025-01-15    (level-1 heading)
    //   [leading space] ## ...        (indented header)
    const datePattern = /^\s*#{1,6}\s+.+?\s+(?:-\s+)?\(?(\d{4}-\d{2}-\d{2})\)?\s*$/gm;

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
      console.warn(`No valid date found in changelog at ${changelogPath}`);
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
