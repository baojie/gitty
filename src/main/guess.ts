import path from 'node:path'

/**
 * Guessing where a repository lives from a keyword, for the recent-repository
 * menu when its search matches nothing remembered. Pure: it decides *where* to
 * look and *how well* a name matches; `recent.ts` does the reading.
 *
 * The places come from the remembered list itself — the directories its
 * repositories sit in, and the ones above those — then the conventional
 * places under home. Someone whose repositories are in `~/work/<group>/<repo>`
 * gets `~/work` searched two levels down without having said so.
 */

/** A directory to search, and how far down. */
export interface Base {
  dir: string
  /** 1 — its children are candidates; 2 — its grandchildren as well. */
  depth: 1 | 2
  /** How many remembered repositories point here; orders the search. */
  weight: number
}

/** Where people keep checkouts, relative to home; home itself is the first. */
export const COMMON_DIRS = [
  '',
  'work',
  'code',
  'Code',
  'src',
  'dev',
  'projects',
  'Projects',
  'repos',
  'git',
  'github',
  'workspace',
  'Documents',
  'source/repos'
]

/** How many directories one guess searches at most. */
export const MAX_BASES = 16

/** Is `dir` strictly above `p`? */
function isAncestor(dir: string, p: string, pathApi: typeof path): boolean {
  const rel = pathApi.relative(dir, p)
  return rel !== '' && !rel.startsWith('..') && !pathApi.isAbsolute(rel)
}

/**
 * The directories to search, heaviest first. A parent of a remembered
 * repository is searched one level down and counts double; its own parent two
 * levels down — unless that would be the filesystem root or something above
 * home (`/home`, `/Users`), which holds other people rather than projects.
 */
export function guessBases(
  recent: readonly string[],
  home: string,
  pathApi: typeof path = path
): Base[] {
  const byDir = new Map<string, Base>()
  const add = (dir: string, depth: 1 | 2, weight: number): void => {
    const prev = byDir.get(dir)
    if (prev) {
      prev.weight += weight
      if (depth > prev.depth) prev.depth = depth
    } else {
      byDir.set(dir, { dir, depth, weight })
    }
  }
  const tooHigh = (dir: string): boolean =>
    pathApi.dirname(dir) === dir || isAncestor(dir, home, pathApi)

  for (const repo of recent) {
    const parent = pathApi.dirname(repo)
    if (tooHigh(parent)) continue
    add(parent, 1, 2)
    const grand = pathApi.dirname(parent)
    if (!tooHigh(grand)) add(grand, 2, 1)
  }
  for (const rel of COMMON_DIRS) add(rel ? pathApi.join(home, rel) : home, 1, 0.5)

  // Stable for equal weights: the remembered order, then the common list's.
  return [...byDir.values()].sort((a, b) => b.weight - a.weight).slice(0, MAX_BASES)
}

/** Lower-case, and without the separators people disagree about. */
function squash(s: string): string {
  return s.toLowerCase().replace(/[-_.\s]+/g, '')
}

/**
 * How well a directory name matches the keyword: 0 is no match. Every word
 * has to appear in the name; a whole-name match beats a prefix, which beats a
 * match anywhere. `my-app`, `my_app` and `MyApp` all answer to `myapp`.
 */
export function scoreName(name: string, query: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 0
  const lower = name.toLowerCase()
  const flat = squash(name)
  if (!terms.every((t) => lower.includes(t) || flat.includes(squash(t)))) return 0
  const whole = squash(query)
  if (flat === whole) return 3
  if (flat.startsWith(whole)) return 2
  return 1
}

/** A repository found on disk, with the weight of the base it was found under. */
export interface Found {
  path: string
  score: number
  weight: number
}

/** Best match first; a heavier base, then a shorter path, breaks ties. */
export function rankFound(found: readonly Found[], limit: number): string[] {
  const seen = new Set<string>()
  return [...found]
    .sort((a, b) => b.score - a.score || b.weight - a.weight || a.path.length - b.path.length)
    .filter((f) => (seen.has(f.path) ? false : (seen.add(f.path), true)))
    .slice(0, limit)
    .map((f) => f.path)
}
