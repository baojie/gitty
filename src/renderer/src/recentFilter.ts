/**
 * Narrowing the recent-repository menu by what is typed into its search box.
 * A leaf module, import-free, so the test suite can feed it plain arrays.
 */

/** How many entries the menu shows before More; the list itself holds more. */
export const RECENT_SHOWN = 12

/**
 * Every whitespace-separated term must appear, case-insensitively, in the
 * entry's label or its path — the path as `pathOf` shows it, which the menu
 * makes home-relative so the home directory's own name does not match every
 * entry. Entries whose label holds every term come first —
 * typing a name should find that repository before one that merely lives
 * under a directory of that name — and recency orders each half.
 */
export function filterRecent(
  list: readonly string[],
  labelOf: (path: string) => string,
  query: string,
  pathOf: (path: string) => string = (p) => p
): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return [...list]
  const byLabel: string[] = []
  const byPath: string[] = []
  for (const p of list) {
    const label = labelOf(p).toLowerCase()
    const hay = `${label}\n${pathOf(p).toLowerCase()}`
    if (!terms.every((t) => hay.includes(t))) continue
    if (terms.every((t) => label.includes(t))) byLabel.push(p)
    else byPath.push(p)
  }
  return [...byLabel, ...byPath]
}
