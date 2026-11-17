import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { app } from 'electron'
import { guessBases, rankFound, scoreName, type Found } from './guess'

/** How many repositories to remember. The menu shows the first few; More and
 *  the search box reach the rest. */
const LIMIT = 100

function storePath(): string {
  return path.join(app.getPath('userData'), 'recent-repos.json')
}

function read(): string[] {
  try {
    const raw = fs.readFileSync(storePath(), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return [] // no store yet, or it was corrupted — start over
  }
}

function write(list: string[]): void {
  try {
    fs.mkdirSync(path.dirname(storePath()), { recursive: true })
    fs.writeFileSync(storePath(), JSON.stringify(list, null, 2))
  } catch {
    /* remembering is best-effort; never block opening a repository */
  }
}

/** Most recent first, skipping any that have since been moved or deleted. */
export function listRecent(): string[] {
  const live = read().filter((p) => {
    try {
      return fs.statSync(path.join(p, '.git')).isDirectory() || fs.statSync(p).isDirectory()
    } catch {
      return false
    }
  })
  return live.slice(0, LIMIT)
}

/** Record a repository as the most recently opened one. */
export function addRecent(root: string): string[] {
  const list = [root, ...read().filter((p) => p !== root)].slice(0, LIMIT)
  write(list)
  return list
}

/** Drop one repository from the list. */
export function removeRecent(root: string): string[] {
  const list = read().filter((p) => p !== root)
  write(list)
  return list
}

export function clearRecent(): void {
  write([])
}

/** How many guesses the menu offers, and how many directories one may read. */
const GUESS_LIMIT = 8
const READ_BUDGET = 400

/** Directories never worth descending into while guessing. */
const SKIP = new Set(['node_modules', 'Library', 'AppData', 'snap'])

async function subdirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP.has(e.name))
      .map((e) => e.name)
  } catch {
    return [] // missing, or not ours to read
  }
}

function isRepo(dir: string): boolean {
  // A file as well as a directory: a linked worktree or a submodule has one.
  return fs.existsSync(path.join(dir, '.git'))
}

/**
 * Repositories on disk whose directory name matches `query`, for when the
 * remembered list has none. Where to look comes from the list's own layout
 * (`guess.ts`); a match is only offered, never opened — the menu asks first.
 */
export async function guessRepos(query: string): Promise<string[]> {
  if (!query.trim()) return []
  const remembered = read()
  const known = new Set(remembered)
  const found: Found[] = []
  let budget = READ_BUDGET
  const consider = (dir: string, name: string, weight: number): void => {
    const score = scoreName(name, query)
    if (score === 0) return
    const full = path.join(dir, name)
    if (!known.has(full) && isRepo(full)) found.push({ path: full, score, weight })
  }
  for (const base of guessBases(remembered, os.homedir())) {
    if (budget-- <= 0) break
    const children = await subdirs(base.dir)
    for (const name of children) consider(base.dir, name, base.weight)
    if (base.depth < 2) continue
    for (const name of children) {
      if (budget-- <= 0) break
      const dir = path.join(base.dir, name)
      // A repository's own subdirectories are its source tree, not projects.
      if (isRepo(dir)) continue
      for (const grand of await subdirs(dir)) consider(dir, grand, base.weight)
    }
  }
  return rankFound(found, GUESS_LIMIT)
}
