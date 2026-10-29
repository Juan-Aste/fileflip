// Link to Fileflect's source code (task 11.5c). The code is AGPL-3.0-or-later,
// whose section 13 asks to offer the source to everyone using the site over the
// network. NEXT_PUBLIC_SOURCE_URL (e.g. the public GitHub repository) turns on
// the "Source code" link in the footer and the credits page; empty while the
// repository is private. Inlined at build time.

/** The repository URL, or "" when not configured or not an https URL. */
export function sourceUrl(raw = process.env.NEXT_PUBLIC_SOURCE_URL): string {
  const value = raw?.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.href;
  } catch {
    return "";
  }
}
