import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/** Paths whose churn should never trigger a UI refresh. */
const NOISE = /(^|[\\/])(node_modules|\.cache|dist|out|target|\.venv|__pycache__)([\\/]|$)/

/** Inside .git only these actually change what we display. */
const GIT_INTERESTING = /^\.git[\\/](HEAD|ORIG_HEAD|index|MERGE_HEAD|refs[\\/]|packed-refs)/

/**
 * Directories one Linux watcher will hold at most. Each costs an inotify
 * watch, a per-user kernel budget shared with every other program; past this
 * the rest of the tree goes unwatched and Refresh covers it.
 */
const MAX_WATCHED_DIRS = 8192

export interface RepoWatcher {
  close(): void
}

/** Whether a change at `rel` (relative to the work tree) is worth a refresh. */
export function isRelevantChange(rel: string): boolean {
  // `.git` and what is under it — not `.gitignore` or `.github`, which are
  // ordinary files of the work tree.
  if (/^\.git([\\/]|$)/.test(rel)) return GIT_INTERESTING.test(rel)
  return !NOISE.test(rel)
}

/**
 * Whether a directory at `rel` needs a watch of its own. `.git` itself does
 * (HEAD, index, packed-refs live directly in it) and so does everything under
 * `.git/refs`; the rest of `.git` — objects above all — never does, and
 * neither does a build-output directory whose changes are ignored anyway.
 */
export function isWatchedDir(rel: string): boolean {
  const p = rel.split(/[\\/]/)
  if (p[0] === '.git') return p.length === 1 || p[1] === 'refs'
  return !NOISE.test(rel)
}

/**
 * Watch a work tree and fire `onChange` (debounced) when something that affects
 * the status or the log changes. Watching is best-effort: a failure leaves the
 * manual refresh as the way to catch up.
 */
export function watchRepo(root: string, onChange: () => void, delay = 250): RepoWatcher {
  let timer: NodeJS.Timeout | null = null
  const fire = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(onChange, delay)
  }
  const inner = process.platform === 'linux' ? watchDirs(root, fire) : watchNative(root, fire)
  return {
    close(): void {
      if (timer) clearTimeout(timer)
      inner.close()
    }
  }
}

/**
 * macOS and Windows: the kernel watches a whole tree for one handle (FSEvents,
 * ReadDirectoryChangesW), so the recursive option is cheap there.
 */
function watchNative(root: string, fire: () => void): RepoWatcher {
  let watcher: fs.FSWatcher | null = null
  try {
    watcher = fs.watch(root, { recursive: true }, (_event, filename) => {
      if (!filename || isRelevantChange(path.normalize(String(filename)))) fire()
    })
    watcher.on('error', () => {
      /* watching is best-effort; the manual refresh still works */
    })
  } catch {
    watcher = null
  }
  return { close: () => watcher?.close() }
}

/** Directories git ignores, as absolute paths; empty when git cannot say. */
function ignoredDirs(root: string): Promise<Set<string>> {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory'],
      { cwd: root, maxBuffer: 16 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return resolve(new Set())
        const dirs = stdout
          .split('\0')
          .filter((p) => p.endsWith('/'))
          .map((p) => path.join(root, p.slice(0, -1)))
        resolve(new Set(dirs))
      }
    )
  })
}

/**
 * Linux: Node's own `recursive: true` is no use here. It walks the tree with
 * readdirSync and statSync and puts an inotify watch on every file — inside
 * `.git/objects` and `node_modules` too — all on the main process's thread,
 * which in a large work tree stalls the window for long enough that the
 * desktop offers to kill it. Instead each directory gets one watch (inotify
 * reports its children's changes), the walk is asynchronous, and directories
 * whose changes could never matter are not walked at all.
 */
function watchDirs(root: string, fire: () => void): RepoWatcher {
  const watched = new Map<string, fs.FSWatcher>()
  let closed = false
  let skip = new Set<string>()

  const unwatch = (dir: string): void => {
    for (const [d, w] of watched) {
      if (d === dir || d.startsWith(dir + path.sep)) {
        w.close()
        watched.delete(d)
      }
    }
  }

  const onEvent = (dir: string, event: string, name: string | null): void => {
    if (closed) return
    if (!name) return fire()
    const full = path.join(dir, name)
    const rel = path.relative(root, full)
    if (isRelevantChange(rel)) fire()
    // Only a rename — created, deleted, moved — can add or take away a
    // directory: one that arrived needs watching, one that left, letting go.
    if (event !== 'rename') return
    if (!watched.has(full) && isWatchedDir(rel) && !skip.has(full)) {
      fs.promises.stat(full).then(
        (st) => {
          if (st.isDirectory()) void walk(full)
        },
        () => unwatch(full)
      )
    } else if (watched.has(full)) {
      fs.promises.stat(full).catch(() => unwatch(full))
    }
  }

  const add = (dir: string): boolean => {
    if (closed || watched.has(dir) || watched.size >= MAX_WATCHED_DIRS) return false
    try {
      const w = fs.watch(dir, (event, name) =>
        onEvent(dir, event, name === null ? null : String(name))
      )
      w.on('error', () => unwatch(dir))
      watched.set(dir, w)
      return true
    } catch {
      return false // gone already, unreadable, or the inotify budget is spent
    }
  }

  // Breadth-first, one directory read at a time, so the main process is never
  // held for longer than one readdir's worth of names.
  const walk = async (start: string): Promise<void> => {
    const queue = [start]
    while (queue.length > 0 && !closed) {
      const dir = queue.shift()!
      if (!add(dir)) continue
      let entries: fs.Dirent[]
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true })
      } catch {
        continue
      }
      for (const e of entries) {
        if (!e.isDirectory()) continue
        const full = path.join(dir, e.name)
        if (!skip.has(full) && isWatchedDir(path.relative(root, full))) queue.push(full)
      }
    }
  }

  void ignoredDirs(root).then((dirs) => {
    skip = dirs
    if (!closed) void walk(root)
  })

  return {
    close(): void {
      closed = true
      for (const w of watched.values()) w.close()
      watched.clear()
    }
  }
}
