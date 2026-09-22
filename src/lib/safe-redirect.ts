/**
 * Turns the `redirect` search param into a path on this site, or "/".
 *
 * Following it blindly would be an open redirect: a link like
 * `/sign-in?redirect=https://evil.example` would send people who just signed in
 * to a copy of the site. Only paths on this site get through.
 */
export function safeRedirectPath(target: unknown): string {
  if (typeof target !== "string" || !target.startsWith("/")) {
    return "/";
  }

  // Let the URL parser decide, because browsers read "/\evil.example",
  // "/\t/evil.example" and "/.//evil.example" as "//evil.example": another site.
  const base = "http://localhost";
  let url: URL;
  try {
    url = new URL(target, base);
  } catch {
    return "/";
  }

  const path = url.pathname + url.search + url.hash;
  return url.origin === base && !path.startsWith("//") ? path : "/";
}
