import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

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
