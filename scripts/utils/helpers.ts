/**
 * Converts a `file://` URL (as returned by `import.meta.resolve`) to
 * a local file-system path that works on both Unix and Windows.
 */
export function resolvePath(fileUrl: string): string {
  return fileUrl
    .replace(/^file:\/\/\/?/, "")
    .replace(/^\/([A-Z]:)/, "$1");
}
