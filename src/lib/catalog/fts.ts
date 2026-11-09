/** The words a shopper typed: lowercase letters and digits only, accents removed, at most 8. */
export function searchTokens(input: string): string[] {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
    .slice(0, 8);
}

/**
 * Turn what a shopper typed into a safe SQLite FTS5 query. Every word becomes
 * a quoted prefix term, so "pit lan" matches "Pit Lane" and punctuation can't
 * break the query syntax.
 */
export function toFtsQuery(input: string): string | null {
  const tokens = searchTokens(input);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t}"*`).join(' ');
}
