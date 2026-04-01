/**
 * Converts a `file://` URL (as returned by `import.meta.resolve`) to
 * a local file-system path that works on both Unix and Windows.
 *
 * - Linux:   `file:///home/runner/foo` → `/home/runner/foo`
 * - Windows: `file:///C:/Users/foo`    → `C:/Users/foo`
 */
export function resolvePath(fileUrl: string): string {
  const path = new URL(fileUrl).pathname;
  // On Windows, pathname is `/C:/...` — strip the leading slash before the drive letter
  return path.replace(/^\/([A-Za-z]:)/, "$1");
}
