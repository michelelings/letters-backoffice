/**
 * Normalize paths and GSC page URLs so manifest urlPath lines up with GA4 pagePath and GSC page keys.
 */
export function normalizeReportPath(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      const u = new URL(s);
      s = u.pathname + u.search;
    } catch {
      /* keep s */
    }
  }
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s || "/";
}
