import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import type { FileChurn } from '../../../shared/types'
import type { MenuState } from './ContextMenu'
import { comparePaths, matchesFilter } from '../paths'
import { humanBytes } from '../bytes'
import { FileIcon } from './FileIcon'

export interface FileEntry {
  path: string
  absPath: string
  /** Status marks rendered before the file name. */
  marks: Array<{ char: string; cls: string }>
  deleted: boolean
  /** Changes view only: the change is in the index, whole or in part. */
  staged?: boolean
  /** Changes view only: git has never seen this file. */
  untracked?: boolean
  /** Working Tree only: `.gitignore` covers this file. Listed, but drawn dim. */
  ignored?: boolean
  /** Snapshot only: the file's mode says it is a program, so it can be run. */
  exec?: boolean
  /** On disk only: this path is a submodule, so it can be pulled on its own. */
  submodule?: boolean
  /** Working Tree only: the innermost checked-out submodule the file is in.
   *  The tree draws that folder as a submodule rather than a plain directory. */
  inSubmodule?: string
  /** Working Tree only: a submodule that is not checked out, listed as a row. */
  gitlink?: boolean
  /** Present for renames: the previous path. */
  origPath?: string
  /** Number of lines, when counted. */
  lines?: number | null
  /** Size on disk, shown in place of a count a binary file cannot have. */
  bytes?: number | null
  /** Lines this change added and removed; absent for binary files and snapshots. */
  churn?: FileChurn | null
  /** Snapshot only: who last committed this file. Null where git has never
   *  seen it, or where the walk did not reach back that far. */
  author?: string | null
}

interface TreeRow {
  kind: 'dir' | 'file'
  /** Full path for files, directory path for dirs. */
  key: string
  name: string
  depth: number
  entry?: FileEntry
  /** Directories: everything under it is ignored, so the folder reads as dim too. */
  ignored?: boolean
  /** Directories: a checked-out submodule, a repository of its own. */
  submodule?: boolean
}

/**
 * Which directories hold nothing but ignored files. A folder is only dim when
 * all of it is — `src` with one ignored build artefact in it is still source.
 */
function ignoredDirs(entries: FileEntry[]): Set<string> {
  const all = new Set<string>()
  const some = new Set<string>()
  for (const entry of entries) {
    const dirs = entry.path.split('/').slice(0, -1)
    for (let d = 0; d < dirs.length; d++) {
      const key = dirs.slice(0, d + 1).join('/')
      ;(entry.ignored ? all : some).add(key)
    }
  }
  for (const key of some) all.delete(key)
  return all
}

/** Flatten the entry list into visible tree rows, honouring collapsed folders. */
function buildRows(entries: FileEntry[], collapsed: (key: string) => boolean): TreeRow[] {
  const rows: TreeRow[] = []
  const dim = ignoredDirs(entries)
  const subs = new Set<string>()
  for (const entry of entries) if (entry.inSubmodule) subs.add(entry.inSubmodule)
  let prevParts: string[] = []

  for (const entry of entries) {
    const parts = entry.path.split('/')
    const dirs = parts.slice(0, -1)

    // Emit directory headers for the part of the path that changed.
    let common = 0
    while (common < dirs.length && common < prevParts.length && dirs[common] === prevParts[common]) {
      common++
    }
    for (let d = common; d < dirs.length; d++) {
      const key = dirs.slice(0, d + 1).join('/')
      rows.push({
        kind: 'dir',
        key,
        name: dirs[d],
        depth: d,
        ignored: dim.has(key),
        submodule: subs.has(key)
      })
    }
    prevParts = dirs

    const hidden = dirs.some((_, d) => collapsed(dirs.slice(0, d + 1).join('/')))
    if (!hidden) {
      rows.push({
        kind: 'file',
        key: entry.path,
        name: parts[parts.length - 1],
        depth: dirs.length,
        entry
      })
    }
  }

  // Drop directory headers whose ancestors are collapsed.
  return rows.filter((r) => {
    if (r.kind !== 'dir') return true
    const segs = r.key.split('/')
    return !segs.slice(0, -1).some((_, i) => collapsed(segs.slice(0, i + 1).join('/')))
  })
}

export function FilesPane({
  entries,
  naturalSort,
  startCollapsed,
  filter,
  treeKey,
  selected,
  onSelect,
  onOpen,
  onMenu,
  onDirMenu,
  onToggleStage,
  emptyText,
  reveal,
  onRevealConsumed
}: {
  entries: FileEntry[]
  /** Sort names the way a reader does rather than by code unit. */
  naturalSort: boolean
  /** Start with every directory shut: a whole repository is a list to open
   *  into, where a list of changes is one to read. */
  startCollapsed: boolean
  /** Show only the paths holding this text; '' shows the whole tree. */
  filter: string
  /** Which tree is on screen. A different one starts from the default again;
   *  the same one re-read (a file changed on disk) keeps what is open. */
  treeKey: string
  selected: string | null
  onSelect: (entry: FileEntry) => void
  onOpen: (entry: FileEntry) => void
  onMenu: (entry: FileEntry, state: MenuState) => void
  /** Right-click on a directory row rather than on a file. */
  onDirMenu: (dir: string, state: MenuState) => void
  /** Changes view only: clicking the status marks moves the file in or out of
   *  the index. Absent in every other mode, where there is no index to move
   *  it to and the marks are just a status. */
  onToggleStage?: (entry: FileEntry) => void
  emptyText: string
  /** A directory a rendered document linked to: open the way to it and bring
   *  it into view. The key lets the same folder be asked for again. */
  reveal?: { dir: string; key: number } | null
  /** The revealed folder was found and scrolled to; the asker can drop it. */
  onRevealConsumed?: () => void
}): JSX.Element {
  const { msg } = useMsg()
  // What the user has changed from the default, rather than what is shut: the
  // set of every directory is not known until the entries are in, and they
  // arrive in two passes (paths first, line counts after).
  const [toggled, setToggled] = useState<Set<string>>(new Set())
  useEffect(() => setToggled(new Set()), [treeKey])

  // While filtering, nothing is shut: a match three directories down is the
  // whole point of having typed, and reopening the way to it by hand is not.
  const collapsed = useCallback(
    (key: string): boolean => filter === '' && toggled.has(key) !== startCollapsed,
    [toggled, startCollapsed, filter]
  )

  // Sorted here rather than by each producer: git orders by byte, which puts
  // W10 before W9 and every capital before every lowercase letter, and the
  // entries arrive from five different commands.
  const rows = useMemo(
    () =>
      buildRows(
        entries
          .filter((e) => filter === '' || matchesFilter(e.path, filter))
          .sort((x, y) => comparePaths(x.path, y.path, naturalSort)),
        collapsed
      ),
    [entries, collapsed, naturalSort, filter]
  )

  const toggle = (key: string): void =>
    setToggled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // A link in a rendered document named this directory: open the way to it and
  // bring it into view. Consumed once — `key` lets the same folder be asked for
  // again — and only when the row actually exists, because the entries arrive
  // in two passes and a reveal that lands before the tree is there retries.
  const rootRef = useRef<HTMLDivElement>(null)
  const consumedReveal = useRef(-1)
  useEffect(() => {
    if (!reveal || consumedReveal.current === reveal.key) return
    const parts = reveal.dir.split('/')
    const ancestors: string[] = []
    for (let i = 1; i <= parts.length; i++) ancestors.push(parts.slice(0, i).join('/'))
    setToggled((prev) => {
      const next = new Set(prev)
      for (const a of ancestors) {
        // Closed is `toggled.has(key) !== startCollapsed`, so opening an
        // ancestor means having it in the set when collapsed and out when not.
        if (startCollapsed) next.add(a)
        else next.delete(a)
      }
      return next
    })
    // The rows rebuild from the new `toggled`, so the scroll waits two frames.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = rootRef.current?.querySelector<HTMLElement>(
          `[data-dir="${CSS.escape(reveal.dir)}"]`
        )
        if (!el) return
        el.scrollIntoView({ block: 'center' })
        consumedReveal.current = reveal.key
        onRevealConsumed?.()
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [reveal, startCollapsed, entries, onRevealConsumed])

  if (entries.length === 0) return <div className="empty">{emptyText}</div>
  if (rows.length === 0) return <div className="empty">{msg.files.filterNone}</div>

  return (
    <div ref={rootRef}>
      {rows.map((row) =>
        row.kind === 'dir' ? (
          <div
            key={`d:${row.key}`}
            data-dir={row.key}
            className="row"
            onClick={() => toggle(row.key)}
            onContextMenu={(e) => {
              // As with a file row: the tree's own menu listens above this
              // one, and a folder has its own answer.
              e.preventDefault()
              e.stopPropagation()
              onDirMenu(row.key, { x: e.clientX, y: e.clientY, items: [] })
            }}
            title={row.submodule ? `${row.key}\n${msg.files.submoduleDir}` : row.key}
          >
            <span className="tree-indent" style={{ width: row.depth * 12 }} />
            <span className="twisty">{collapsed(row.key) ? '▶' : '▼'}</span>
            <span
              className={`dir-name${row.ignored ? ' ignored' : ''}${row.submodule ? ' submodule' : ''}`}
            >
              {row.name}/
            </span>
          </div>
        ) : (
          <div
            key={`f:${row.key}`}
            className={`row${selected === row.key ? ' selected' : ''}`}
            title={row.entry!.origPath ? `${row.entry!.origPath} → ${row.key}` : row.key}
            onClick={() => onSelect(row.entry!)}
            onDoubleClick={() => onOpen(row.entry!)}
            onContextMenu={(e) => {
              e.preventDefault()
              // The tree's own menu listens above this row; a row has its own
              // answer, so the event stops here.
              e.stopPropagation()
              onSelect(row.entry!)
              onMenu(row.entry!, { x: e.clientX, y: e.clientY, items: [] })
            }}
          >
            <span className="tree-indent" style={{ width: row.depth * 12 + 10 }} />
            {row.entry!.marks.map((m, i) => (
              <span
                key={i}
                className={`status-code ${m.cls}${onToggleStage ? ' stageable' : ''}`}
                title={onToggleStage ? msg.files.toggleStage(!!row.entry!.staged) : undefined}
                onClick={
                  onToggleStage
                    ? (e) => {
                        // The row's own click selects the file; the marks are
                        // a control of their own.
                        e.stopPropagation()
                        onToggleStage(row.entry!)
                      }
                    : undefined
                }
              >
                {m.char}
              </span>
            ))}
            {/* The type icon sits against the name rather than out at the
                indent: it is part of reading the file, where the status codes
                before it are about the change. */}
            <FileIcon path={row.key} />
            <span
              className={`file-name${row.entry!.deleted ? ' deleted' : ''}${
                row.entry!.staged ? ' staged' : ''
              }${row.entry!.ignored ? ' ignored' : ''}${
                row.entry!.gitlink ? ' submodule' : ''
              }`}
              title={
                row.entry!.ignored
                  ? msg.files.ignoredFile
                  : row.entry!.gitlink
                    ? msg.files.submoduleNotCheckedOut
                    : undefined
              }
            >
              {row.name}
            </span>
            {/* A binary file has no lines to count, and its size is the
                measurement it does have. */}
            {row.entry!.lines != null ? (
              <span className="file-lines">{msg.files.lineCount(row.entry!.lines)}</span>
            ) : row.entry!.bytes != null ? (
              <span className="file-lines">{humanBytes(row.entry!.bytes)}</span>
            ) : null}
            {/* The snapshot's own column, where the churn of a change would
                be: a tree is not a change, so the row has room for it. */}
            {row.entry!.author && (
              <span className="file-author" title={msg.files.lastAuthor(row.entry!.author!)}>
                {row.entry!.author}
              </span>
            )}
            {row.entry!.churn && (
              <span className="file-churn">
                {row.entry!.churn!.added > 0 && (
                  <span className="churn-add">+{row.entry!.churn!.added}</span>
                )}
                {row.entry!.churn!.deleted > 0 && (
                  <span className="churn-del">−{row.entry!.churn!.deleted}</span>
                )}
              </span>
            )}
          </div>
        )
      )}
    </div>
  )
}
