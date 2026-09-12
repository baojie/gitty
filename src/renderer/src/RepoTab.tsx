import {
  forwardRef,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type JSX,
  type SetStateAction
} from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { ContextMenu, type MenuItem, type MenuState } from './components/ContextMenu'
import { PromptDialog } from './components/PromptDialog'
import { QuickOpen } from './components/QuickOpen'
import {
  DiffPane,
  type CollapseState,
  type DiffPaneHandle,
  type DiffView
} from './components/DiffPane'
import type { FileEntry } from './components/FilesPane'
import { FilesView } from './components/FilesView'
import { DiffHeader } from './components/DiffHeader'
import { useMsg } from './locale'
import { LogPane, WORKTREE_ROW } from './components/LogPane'
import { destroyTerminals, runInTerminal } from './terminals'
import { formatJson } from './json'
import { isJsonPath, isMarkdownPath, shellQuote } from './paths'
// A leaf module with no imports of its own; see the note on its extension
// table. Asking it here does not drag the viewers into the main bundle.
import { hasOutline, outlineLanguage } from './symbols'
import { addedNewLines } from './diffLines'
import { FullButton, HideButton } from './components/PaneChrome'
import type { Theme } from './components/SettingsPane'
import { Tooltip } from './components/Tooltip'
import { createContextMenus, type View } from './contextMenus'
import {
  newNavHistory,
  prunePlaces,
  pushPlace,
  type NavHistory,
  type NavPlace
} from './nav'
import { useDocs } from './useDocs'
import { useStaging } from './useStaging'
import { useRemoteOps } from './useRemoteOps'
import {
  PANE_ORDER,
  paneAccel,
  paneControls,
  paneFullAccel,
  isPaneCycleChord,
  isBrowseChord,
  isChangesChord,
  isQuickOpenChord,
  fromTerminal,
  ALL_PANES,
  BROWSE_PANES,
  nextPane,
  visibleCount,
  type PaneId,
  type PaneVisibility
} from './panes'
import type {
  ChurnSpec,
  Commit,
  CommitFile,
  CommitMeta,
  DiffOptions,
  DiffRequest,
  DiffResult,
  DiffSide,
  FileChurn,
  LogFilterMode,
  RemoteBases,
  RepoStatus,
  TerminalOptions,
  WorkingFile
} from '../../shared/types'
// A value, not a type: the limit is shown to the user when a snapshot is over it.
import { MAX_SNAPSHOT_EXPORT_BYTES } from '../../shared/types'

// The two panes that pull in whole libraries are loaded on demand: opening a
// file costs highlight.js + markdown-it (plus the code and markdown viewers),
// and showing the terminal costs xterm. Neither should gate the first paint of
// the tab. The session/layout registries those chunks need live in terminals.ts,
// which stays in the main bundle.
const FileDoc = lazy(() => import('./components/FileDoc').then((m) => ({ default: m.FileDoc })))
const TerminalsPane = lazy(() =>
  import('./components/TerminalsPane').then((m) => ({ default: m.TerminalsPane }))
)

const PAGE = 300

function statusMarks(f: WorkingFile): FileEntry['marks'] {
  if (f.untracked) {
    return [
      { char: '?', cls: 'st-untracked' },
      { char: '?', cls: 'st-untracked' }
    ]
  }
  return [
    { char: f.index === ' ' ? ' ' : f.index, cls: f.index === ' ' ? '' : 'st-staged' },
    { char: f.worktree === ' ' ? ' ' : f.worktree, cls: `st-${f.worktree.trim() || 'none'}` }
  ]
}

function commitMarks(f: CommitFile): FileEntry['marks'] {
  return [{ char: f.status, cls: `st-${f.status}` }]
}

export interface RepoTabHandle {
  refresh(): void
  /** Go to a place in this tab's browsing history, by index into `places`. */
  goTo(index: number): void
  back(): void
  forward(): void
}

export interface RepoTabProps {
  root: string
  /** Whether this is the tab the user is looking at. Inactive tabs stay
   *  mounted (their view state and shells survive) but skip global key
   *  handling. */
  active: boolean
  theme: Theme
  fontSize: number
  wrap: boolean
  setWrap: Dispatch<SetStateAction<boolean>>
  diffView: DiffView
  setDiffView: Dispatch<SetStateAction<DiffView>>
  wordDiff: boolean
  setWordDiff: Dispatch<SetStateAction<boolean>>
  mdOutline: boolean
  setMdOutline: Dispatch<SetStateAction<boolean>>
  /** Number markdown blocks with their source lines. */
  mdLineNumbers: boolean
  /** Sort file names the way a reader does, rather than by code unit. */
  naturalSort: boolean
  /** The monospace font setting, passed through to the terminal. */
  fontFamily: string
  /** How git is asked to compute every diff this tab shows. */
  diffOptions: DiffOptions
  /** Which shell a terminal in this tab starts, and how. */
  terminalOptions: TerminalOptions
  /** The command "Send to agent" types into this tab's focused shell. */
  agentCommand: string
  /** The commands its dropdown offers, most recently used first. */
  agentCommands: string[]
  /** Make one of them the current command and remember it. */
  onAgentCommand: (command: string) => void
  /** Drop one from the remembered list. */
  onForgetAgentCommand: (command: string) => void
  /** Draw the lane graph beside the commit hashes. */
  graph: boolean
  setGraph: Dispatch<SetStateAction<boolean>>
  /** Which panes are on screen; hidden ones are not rendered at all. */
  panes: PaneVisibility
  /** Hide a pane from its own header button. */
  onHidePane: (id: PaneId) => void
  /** Ask for a whole layout — pane visibility is App's, the view is this tab's. */
  onLayout: (panes: PaneVisibility) => void
  /** Branch whose history the log shows; null is HEAD, the checked-out one.
   *  Browsing another branch never touches the work tree — the top-left pane
   *  and its diffs still come from disk. */
  browsing: string | null
  /** An app-wide dialog is open — settings, About, the shortcut sheet.
   *  Escape belongs to it first, not to this tab. */
  dialogOpen: boolean
  /** Report the latest status so the tab bar and title bar can reflect it. */
  onStatus: (status: RepoStatus) => void
  /** Report the browsing history, which the title bar's buttons act on. */
  onNav: (root: string, history: NavHistory) => void
}

/**
 * react-resizable-panels keeps layout state per Group id, and several tabs are
 * mounted at once — so the ids must not collide across repositories.
 */
function groupId(root: string, id: string): string {
  return `${id}-${root.replace(/[^A-Za-z0-9_-]/g, '_')}`
}

/**
 * One open repository: its own four-pane layout, selection state and terminal
 * group. Tab switching only changes which of these is visible, so browsing a
 * repo never disturbs the state or shells of the others.
 */
export const RepoTab = forwardRef<RepoTabHandle, RepoTabProps>(function RepoTab(
  {
    root,
    active,
    theme,
    fontSize,
    wrap,
    setWrap,
    diffView,
    setDiffView,
    wordDiff,
    setWordDiff,
    mdOutline,
    setMdOutline,
    mdLineNumbers,
    naturalSort,
    fontFamily,
    diffOptions,
    terminalOptions,
    agentCommand,
    agentCommands,
    onAgentCommand,
    onForgetAgentCommand,
    graph,
    setGraph,
    panes,
    onHidePane,
    onLayout,
    browsing,
    dialogOpen,
    onStatus,
    onNav
  },
  ref
): JSX.Element {
  const { msg } = useMsg()
  const [status, setStatus] = useState<RepoStatus | null>(null)
  const [commits, setCommits] = useState<Commit[]>([])
  const [view, setView] = useState<View>({ mode: 'worktree' })
  const [viewFiles, setViewFiles] = useState<FileEntry[]>([])
  // Where a rename's previous path comes from, which the diff needs to ask git
  // for both halves of the change. A ref rather than a dependency of the diff
  // effect: the list is rebuilt on every refresh, and following it would
  // re-fetch an identical patch each time.
  const viewFilesRef = useRef<FileEntry[]>([])
  viewFilesRef.current = viewFiles
  const origOf = useCallback(
    (p: string | null): string | undefined =>
      p ? viewFilesRef.current.find((f) => f.path === p)?.origPath : undefined,
    []
  )
  // The commit being read, shown above its file list; null outside commit and
  // snapshot mode.
  const [commitMeta, setCommitMeta] = useState<CommitMeta | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [diff, setDiff] = useState<DiffResult | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<string | null>(WORKTREE_ROW)
  const [compareCommit, setCompareCommit] = useState<string | null>(null)
  // A directory a rendered document linked to; the file pane opens the way to
  // it and reports back, whereupon this is dropped.
  const [revealDir, setRevealDir] = useState<{ dir: string; key: number } | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  // The "New command…" prompt from the agent dropdown.
  const [agentPrompt, setAgentPrompt] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  // The pane filling the window, if any. One at a time, and per tab: another
  // repository's layout is none of its business.
  const [full, setFull] = useState<PaneId | null>(null)
  const [docSource, setDocSource] = useState<string | null>(null)
  // Where this repository has been looked at, and where in that list we are.
  // Per tab, like the view it records: another repository's history is none of
  // its business.
  const [nav, setNav] = useState<NavHistory>(newNavHistory)
  const diffRef = useRef<DiffPaneHandle>(null)
  const [collapseState, setCollapseState] = useState<CollapseState>({
    files: 0,
    allCollapsed: false
  })
  const [tick, setTick] = useState(0)
  // Which work-tree paths are submodules, so the file tree's menu can offer to
  // pull one. Read once per repository: `.gitmodules` changes when a submodule
  // is added or removed, which is not something a refresh is chasing.
  const [submodulePaths, setSubmodulePaths] = useState<Set<string>>(() => new Set())
  // Which side of the index a work-tree file's diff is read from, when the
  // reader has said. Null follows the file's own state, which is what it did
  // before there was anything to stage.
  const [sideOverride, setSideOverride] = useState<DiffSide | null>(null)
  // The repository search box, above the file list. Open is a state of its own
  // rather than a document, so the pattern can be edited before anything runs.
  // Every branch at once, rather than the one the log is pointed at. A log
  // view like the filter, not a preference: it belongs to this repository's
  // session and starts off again next time.
  const [allBranches, setAllBranches] = useState(false)
  // Where this repository is hosted, as the prefixes a commit page and a file
  // page are built from. A property of the remote, not of the view, so it is
  // read once per root.
  const [remoteBases, setRemoteBases] = useState<RemoteBases | null>(null)
  // The commits no remote has yet. The hosting site has no page for one, so
  // the links to it are left out rather than opening a 404 — re-read on every
  // refresh, because a push is exactly what empties this.
  const [unpushed, setUnpushed] = useState<Set<string>>(() => new Set())
  const loadingMore = useRef(false)
  const exhausted = useRef(false)
  // How many rows a refresh re-reads: everything paged in so far, so the whole
  // loaded window is replaced rather than patched. A ref, not state, or reading
  // it would rebuild `refresh` out of its own result and loop.
  const loaded = useRef(PAGE)
  // The rows as they were last rendered, so a refresh can be compared with what
  // it replaces, and whether they were the whole history rather than a filtered
  // slice of it.
  const rows = useRef<Commit[]>([])
  const comparable = useRef(false)
  // The log filter. `filter` is what the box shows, so typing stays fluid; the
  // debounced copy is what git sees, so a keystroke per character does not each
  // fire a git log.
  const [filter, setFilter] = useState('')
  const [debouncedFilter, setDebouncedFilter] = useState('')
  // The strip is out of the way until the header button asks for it, and
  // closing it drops the filter: a narrowed log with no box above it would look
  // like a short history.
  const [filterOpen, setFilterOpen] = useState(false)
  const closeFilter = useCallback(() => {
    setFilterOpen(false)
    setFilter('')
  }, [])
  // What the filter searches. A pickaxe mode reads every diff in the history,
  // so the log reports that it is working rather than looking briefly empty.
  const [filterMode, setFilterMode] = useState<LogFilterMode>('text')
  const [searching, setSearching] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilter(filter), 250)
    return () => clearTimeout(t)
  }, [filter])

  // The watcher can fire again — and a manual refresh can land — while `git
  // status` is still running, so replies come back out of order. Without this
  // guard a slow earlier call overwrites a newer one and the file list keeps
  // showing changes that are already committed, while the diff pane (which
  // re-runs git every time) shows the truth.
  const refreshSeq = useRef(0)
  // The filter of the last run; a change means old results belong to a
  // different query and must be swapped for the new ones, never merged.
  const lastFilter = useRef('')
  // Another query — another branch, another filter, another mode — has a window
  // of its own and starts at one page. Declared above the effect that runs
  // `refresh`, so the reset lands before the read it applies to: a pickaxe
  // sized by the previous query's window would read far more history than the
  // one page it is being asked for.
  useEffect(() => {
    loaded.current = PAGE
  }, [browsing, debouncedFilter, filterMode, allBranches])

  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current
    const pickaxe = debouncedFilter !== '' && filterMode !== 'text'
    if (pickaxe) setSearching(true)
    const [st, log] = await Promise.all([
      window.gitty.git.status(root),
      window.gitty.git.log(
        root,
        loaded.current,
        0,
        browsing,
        debouncedFilter,
        filterMode,
        allBranches
      )
    ])
    if (seq !== refreshSeq.current) return
    setSearching(false)
    setStatus(st)
    onStatus(st)
    // The mode is half of the query, so changing it invalidates the loaded
    // rows exactly as changing the text does.
    const query = `${filterMode}\u0000${allBranches}\u0000${debouncedFilter}`
    const filterChanged = lastFilter.current !== query
    lastFilter.current = query
    if (filterChanged || log.length >= loaded.current) exhausted.current = false
    // A refresh re-reads the log from the top, as far down as it has been paged
    // in, and the answer replaces what was there. Merging would be wrong: a
    // rebase rewrites hashes, so every replayed commit looks new and would be
    // appended below the stale rows it replaced — which is where the newest
    // commits went missing.
    // Whether these rows can be read as the whole history: a filtered log is
    // missing commits that are perfectly alive, and the first log of a new
    // query has nothing before it to compare against.
    comparable.current = !filterChanged && debouncedFilter === ''
    setCommits(log)
    setTick((t) => t + 1)
  }, [root, browsing, onStatus, debouncedFilter, filterMode, allBranches])

  /**
   * The rows changed, and two things follow. How far the next refresh re-reads
   * — everything paged in so far. And whether the selection still names a
   * commit this history has: a rebase replays every commit under a new hash,
   * and the old ones stay readable in the object database, so a stale
   * selection does not fail. The log simply highlights nothing while the diff
   * pane goes on showing a commit that has left the branch. Going back to
   * Changes is the honest answer, and the browsing history is pruned with it,
   * since stepping back into a rewritten commit is the same lie.
   *
   * The tail is what makes that safe to decide from the rows alone. Both lists
   * start at HEAD, so if the last row of the old window is still in the new
   * one, the new window reaches at least as far back as the old did and
   * anything missing from it is really gone. When the tail is missing too, the
   * window has merely slid under newly arrived commits and nothing can be
   * concluded — so nothing is.
   *
   * The view and the selection are read without being listed as dependencies:
   * React keeps the newest closure, so what runs sees the current values, and
   * listing them would run this on every click instead of when the log moves.
   */
  useEffect(() => {
    const before = rows.current
    rows.current = commits
    loaded.current = Math.max(PAGE, commits.length)
    if (!comparable.current || before.length === 0 || commits.length === 0) return
    const here = new Set(commits.map((c) => c.hash))
    if (!here.has(before[before.length - 1].hash)) return
    // Gone means it was in the window and no longer is. Merely being absent
    // proves nothing: a commit reached from a file's history, from blame or
    // from a search can sit far deeper than the log has ever paged in, and it
    // is as alive as any other.
    const was = new Set(before.map((c) => c.hash))
    const gone = (h: string): boolean => h !== WORKTREE_ROW && was.has(h) && !here.has(h)
    setNav((h) => prunePlaces(h, gone))
    if (compareCommit && gone(compareCommit)) setCompareCommit(null)
    // A document read at a rewritten commit is stale the same way, and closing
    // it is also what keeps the strip and the pruned history describing the
    // same place.
    const stale = docs.filter((d) => d.rev !== null && gone(d.rev))
    if (stale.length > 0) {
      const kept = docs.filter((d) => !stale.includes(d))
      setDocs(kept)
      if (activeDoc !== null && stale.some((d) => d.id === activeDoc)) {
        setActiveDoc(kept.length > 0 ? kept[kept.length - 1].id : null)
      }
    }
    const dead =
      view.mode === 'commit'
        ? gone(view.hash)
        : view.mode === 'snapshot'
          ? view.hash !== null && gone(view.hash)
          : view.mode === 'range' && (gone(view.from) || gone(view.to))
    if (!dead) return
    setView({ mode: 'worktree' })
    setSelectedCommit(WORKTREE_ROW)
    setSelectedFile(null)
    setDocs([])
    setActiveDoc(null)
  }, [commits])

  // Another branch means another history: drop what is loaded rather than
  // merging two logs, and let go of a selection that may not be in it. The
  // work tree is unaffected, so the Changes row stays where it is.
  const firstBrowse = useRef(true)
  useEffect(() => {
    if (firstBrowse.current) {
      firstBrowse.current = false
      return
    }
    setCommits([])
    exhausted.current = false
    setView({ mode: 'worktree' })
    setSelectedCommit(WORKTREE_ROW)
    setCompareCommit(null)
    setSelectedFile(null)
    setDocs([])
    setActiveDoc(null)
  }, [browsing])

  // Hiding the terminal pane only unmounts it; its shells keep running and are
  // re-parented when it comes back. They end with the repository tab itself.
  useEffect(() => () => destroyTerminals(root), [root])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // The watcher fires for every open repository; only react to our own.
  useEffect(
    () =>
      window.gitty.repo.onChanged(({ root: r }) => {
        if (r === root) void refresh()
      }),
    [refresh, root]
  )

  /* ---------- file list per view ---------- */

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      let entries: FileEntry[] = []
      // The revision each file lives at; null means the work tree on disk.
      let rev: string | null = null
      // Clear the previous view's message before loading this one's.
      setCommitMeta(null)

      if (view.mode === 'worktree') {
        rev = null
        entries = (status?.files ?? []).map<FileEntry>((f) => ({
          path: f.path,
          absPath: f.absPath,
          marks: statusMarks(f),
          deleted: f.worktree === 'D' || f.index === 'D',
          // Anything the index carries, whether or not the work tree has more
          // on top of it. Only the work tree has an index to speak of.
          staged: !f.untracked && f.index !== ' ',
          untracked: f.untracked,
          origPath: f.origPath,
          submodule: submodulePaths.has(f.path)
        }))
      } else if (view.mode === 'snapshot') {
        if (view.hash === null) {
          // Browse working tree: every file on disk — tracked, untracked and
          // ignored — read-only like a snapshot but with real paths. Opening a
          // file works ("Open in system app" and "Reveal" too), and its
          // contents come from the disk as it is now rather than from a
          // revision. An ignored file is still a file in the directory, so it
          // is listed and drawn dimmed rather than left out.
          rev = null
          const files = await window.gitty.git.worktreeFiles(root)
          if (cancelled) return
          entries = files.map<FileEntry>((f) => ({
            path: f.path,
            absPath: `${root}/${f.path}`,
            marks: [],
            deleted: false,
            ignored: f.ignored,
            exec: f.exec,
            submodule: submodulePaths.has(f.path)
          }))
        } else {
          // Snapshot mode: the whole tree at that commit, read-only.
          rev = view.hash
          const [listed, meta] = await Promise.all([
            window.gitty.git.snapshotFiles(root, view.hash),
            window.gitty.git.commitMeta(root, view.hash)
          ])
          if (cancelled) return
          setCommitMeta(meta)
          entries = listed.map<FileEntry>((f) => ({
            path: f.path,
            // Virtual path — no file on disk; fileMenu/onOpen branch on this prefix.
            absPath: `gitty:snapshot:${view.hash}:${f.path}`,
            marks: [],
            deleted: false,
            exec: f.exec
          }))
        }
      } else {
        if (view.mode === 'commit') {
          rev = view.hash
          const detail = await window.gitty.git.commitDetail(root, view.hash)
          if (cancelled) return
          setCommitMeta({
            author: detail.commit.author,
            email: detail.commit.email,
            date: detail.commit.date,
            subject: detail.commit.subject,
            body: detail.body
          })
          entries = detail.files.map<FileEntry>((f) => ({
            path: f.path,
            absPath: f.absPath,
            marks: commitMarks(f),
            deleted: f.status === 'D',
            origPath: f.origPath
          }))
        } else {
          rev = view.to
          const files = await window.gitty.git.rangeFiles(root, view.from, view.to)
          if (cancelled) return
          entries = files.map<FileEntry>((f) => ({
            path: f.path,
            absPath: f.absPath,
            marks: commitMarks(f),
            deleted: f.status === 'D',
            origPath: f.origPath
          }))
        }
      }

      // Fetch line counts in one batch so the tree shows them right away, and
      // the churn of the same change beside them. A snapshot is a tree, not a
      // change, so it has none.
      if (!cancelled && entries.length > 0) {
        // Ignored files are counted out of the batch, not out of the list:
        // counting means reading every byte of them, and a work tree's ignored
        // half is the build output and node_modules — hundreds of megabytes to
        // read for a number beside a row nobody opened.
        const counted = entries.map((e, i) => ({ e, i })).filter(({ e }) => !e.ignored)
        const pairs = counted.map(({ e }) => ({ rev, filePath: e.path }))
        const spec: ChurnSpec | null =
          view.mode === 'worktree'
            ? { kind: 'worktree' }
            : view.mode === 'commit'
              ? { kind: 'commit', hash: view.hash }
              : view.mode === 'range'
                ? { kind: 'range', from: view.from, to: view.to }
                : null
        // Who last touched each file, in the one view that is a tree rather
        // than a change: a snapshot's rows have no churn, and the question
        // there is who the file belongs to rather than what just happened to
        // it. Every other view answers that already — a commit's files are the
        // commit's author's, and what is uncommitted is the reader's own.
        const authored = view.mode === 'snapshot'
        const [measures, churn, authors] = await Promise.all([
          window.gitty.git.fileLines(root, pairs),
          spec
            ? window.gitty.git.fileChurn(root, spec, diffOptions)
            : Promise.resolve<Record<string, FileChurn>>({}),
          authored
            ? window.gitty.git.fileAuthors(
                root,
                rev,
                counted.map(({ e }) => e.path)
              )
            : Promise.resolve<Record<string, string>>({})
        ])
        if (!cancelled) {
          for (let k = 0; k < counted.length; k++) {
            const { i } = counted[k]
            entries[i] = {
              ...entries[i],
              lines: measures[k].lines,
              bytes: measures[k].bytes,
              churn: churn[entries[i].path] ?? null,
              author: authors[entries[i].path] ?? null
            }
          }
        }
      }

      if (!cancelled) setViewFiles(entries)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [root, view, status, diffOptions, submodulePaths])

  /* ---------- documents (diff + opened files) ---------- */

  /** Revision a file opened from this view should be read at. */
  const revForView = useCallback((): string | null => {
    if (view.mode === 'commit' || view.mode === 'snapshot') return view.hash
    if (view.mode === 'range') return view.to
    return null
  }, [view])

  // Which tree the file pane is listing. Both the collapsed set and the filter
  // belong to one tree: another commit's files are not the ones that was typed
  // against.
  const treeKey =
    view.mode === 'snapshot'
      ? `snapshot:${view.hash ?? 'worktree'}`
      : view.mode === 'commit'
        ? `commit:${view.hash}`
        : view.mode === 'range'
          ? `range:${view.from}..${view.to}`
          : 'worktree'

  // The documents beside the diff: the strip's state and its operations live in
  // useDocs; RepoTab keeps the coordination (resetting the list on navigation)
  // through the setters, and the display derivations read off `doc` below.
  const {
    docs,
    setDocs,
    activeDoc,
    setActiveDoc,
    doc,
    viewingFile,
    previewing,
    closeDoc,
    openFileDoc,
    openLineHistory,
    openSearch,
    openHit,
    openLinkedPath,
    openBlame,
    openHistory
  } = useDocs(revForView)
  // Source shown as itself, in a language whose declarations we can read: the
  // outline button offers a symbol tree there the way it offers headings in a
  // rendered document.
  const outlineable =
    doc !== null && doc.kind === 'file' && !previewing && hasOutline(outlineLanguage(doc.path))

  // Whether the JSON on screen can be re-indented, which is what decides
  // whether the button exists: a file named .json that does not parse — a
  // template with placeholders in it, a truncated download — has nothing to
  // offer. Parsed here rather than in the header because the header has the
  // document but not its text.
  const jsonFormattable = useMemo(
    () =>
      doc !== null &&
      doc.kind === 'file' &&
      isJsonPath(doc.path) &&
      docSource !== null &&
      formatJson(docSource) !== null,
    [doc, docSource]
  )

  /**
   * The one preview button in the diff header flips whichever face the current
   * document shows: a rendered markdown/HTML document opens its source, and a
   * source file shown as itself offers the preview. DiffHeader draws exactly
   * one of the two, so this is the single flip behind both.
   */
  const togglePreview = useCallback(() => {
    if (!doc) return
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, preview: !d.preview } : d)))
  }, [doc, setDocs])

  // Which source lines of a previewed markdown the diff on screen marks as
  // added, for the gutter to colour green. Only when the document is read at
  // the side the diff writes to — its own revision is the diff's new side — so
  // a document opened at another revision carries its own diff, not this one.
  const mdChangedLines = useMemo(() => {
    if (!doc || doc.kind !== 'file' || !doc.preview || !isMarkdownPath(doc.path)) return null
    if (doc.rev !== revForView()) return null
    return addedNewLines(diff?.patch ?? '', doc.path)
  }, [doc, diff, revForView])

  // Which side to read is a choice about the file in front of you; another
  // file starts from its own state again.
  useEffect(() => setSideOverride(null), [selectedFile, view])

  // Snapshots have no diff, so a file selected there opens as a document.
  useEffect(() => {
    if (view.mode === 'snapshot' && selectedFile) openFileDoc(selectedFile)
  }, [view, selectedFile, openFileDoc])

  /* ---------- browsing history ---------- */

  // What the two top panes are showing, as one value the history can hold and
  // hand back later. Every way of moving around the repository — the log, the
  // file list, the context menus, Escape — ends up changing one of these three,
  // so recording them is enough and no navigation path can forget to.
  const place = useMemo<NavPlace>(() => ({ view, selectedFile, doc }), [view, selectedFile, doc])

  useEffect(() => {
    setNav((h) => pushPlace(h, place))
  }, [place])

  useEffect(() => onNav(root, nav), [onNav, root, nav])

  /**
   * Put a recorded place back on screen. No guard against this being recorded
   * again is needed: the index moves first, so by the time the effect above
   * runs, the place it would push is the one already at `nav.index` and
   * `pushPlace` recognises it as where we are.
   *
   * The document list is replaced rather than merged, so going back reproduces
   * that stop exactly instead of accumulating every file ever opened.
   */
  const goTo = useCallback(
    (index: number) => {
      const p = nav.places[index]
      if (!p || index === nav.index) return
      setNav({ ...nav, index })
      setView(p.view)
      setSelectedFile(p.selectedFile)
      setDocs(p.doc ? [p.doc] : [])
      setActiveDoc(p.doc?.id ?? null)
      // Keep the log's highlight in step: a range lit both of its ends, and a
      // work-tree browse is the work tree itself.
      setSelectedCommit(
        p.view.mode === 'worktree'
          ? WORKTREE_ROW
          : p.view.mode === 'range'
            ? p.view.to
            : p.view.mode === 'snapshot' && p.view.hash === null
              ? WORKTREE_ROW
              : p.view.hash
      )
      setCompareCommit(p.view.mode === 'range' ? p.view.from : null)
    },
    [nav]
  )

  const back = useCallback(() => goTo(nav.index - 1), [goTo, nav.index])
  const forward = useCallback(() => goTo(nav.index + 1), [goTo, nav.index])

  useImperativeHandle(ref, () => ({ refresh, goTo, back, forward }), [
    refresh,
    goTo,
    back,
    forward
  ])

  /* ---------- diff loading ---------- */

  // Same ordering hazard as `refresh`: clicking through files faster than git
  // answers would otherwise leave the previous file's patch on screen.
  const diffSeq = useRef(0)

  const loadDiff = useCallback(
    async (req: DiffRequest) => {
      const seq = ++diffSeq.current
      try {
        const d = await window.gitty.git.diff(root, req, diffOptions)
        if (seq === diffSeq.current) setDiff(d)
      } catch (e) {
        if (seq === diffSeq.current) setDiff({ patch: '', title: msg.diff.errorTitle, notice: String(e) })
      }
    },
    [root, msg, diffOptions]
  )

  /** Bumps the sequence too, so a load already in flight cannot undo it. */
  const clearDiff = useCallback(() => {
    diffSeq.current++
    setDiff(null)
  }, [])

  // Whenever the view, the selected file or the repo state changes, reload the diff.
  useEffect(() => {
    if (view.mode === 'worktree') {
      // No file picked: show every uncommitted change at once.
      if (!selectedFile) {
        void loadDiff({ kind: 'working', side: 'worktree', untracked: false })
        return
      }
      const f = status?.files.find((x) => x.path === selectedFile)
      if (!f) {
        clearDiff()
        return
      }
      void loadDiff({
        kind: 'working',
        path: f.path,
        origPath: f.origPath,
        side: sideOverride ?? (f.worktree === ' ' && f.index !== ' ' ? 'index' : 'worktree'),
        untracked: f.untracked
      })
    } else if (view.mode === 'commit') {
      void loadDiff({
        kind: 'commit',
        hash: view.hash,
        path: selectedFile ?? undefined,
        origPath: origOf(selectedFile)
      })
    } else if (view.mode === 'range') {
      void loadDiff({
        kind: 'range',
        from: view.from,
        to: view.to,
        path: selectedFile ?? undefined,
        origPath: origOf(selectedFile)
      })
    } else {
      // Snapshot has no diff; the file view renders its contents instead.
      clearDiff()
    }
  }, [view, selectedFile, status, tick, sideOverride, loadDiff, clearDiff, origOf])

  /* ---------- commit interactions ---------- */

  const showCommit = useCallback((c: Commit) => {
    setCompareCommit(null)
    setSelectedCommit(c.hash)
    setSelectedFile(null)
    setDocs([])
    setActiveDoc(null)
    setView({ mode: 'commit', hash: c.hash, short: c.short, subject: c.subject })
  }, [])

  /**
   * Two revisions picked in a file's history: that one file's diff between
   * them, oldest first. The range view is the same one the log's second pick
   * opens, with the file already selected so the diff on screen is the file's
   * rather than the whole range's.
   */
  const showFileRange = useCallback(
    (path: string, from: string, to: string) => {
      setSelectedCommit(to)
      setCompareCommit(from)
      setDocs([])
      setActiveDoc(null)
      setSelectedFile(path)
      setView({ mode: 'range', from, to })
    },
    [setDocs, setActiveDoc]
  )

  /** Browse the whole repository as it was at this commit, read-only. */
  const showSnapshot = useCallback((c: Commit) => {
    setCompareCommit(null)
    setSelectedCommit(c.hash)
    setSelectedFile(null)
    setDocs([])
    setActiveDoc(null)
    setView({ mode: 'snapshot', hash: c.hash, short: c.short, subject: c.subject })
  }, [])

  /** Browse the whole repository as it is on disk right now — tracked and
   *  untracked files alike, read-only. The Changes row's context menu offers
   *  this, as does Ctrl+B. A null hash is what makes it the work tree rather
   *  than a revision; the log and the terminal step aside, since reading a
   *  tree is what the window is now for. */
  const browseWorktree = useCallback(() => {
    setCompareCommit(null)
    setSelectedCommit(WORKTREE_ROW)
    setSelectedFile(null)
    setDocs([])
    setActiveDoc(null)
    setView({ mode: 'snapshot', hash: null, short: '', subject: '' })
    onLayout(BROWSE_PANES)
  }, [onLayout])

  /**
   * A link inside a rendered document named a directory rather than a file:
   * browse to that folder in the file pane, at the document's own revision —
   * the work tree when the document is read from it, that commit's snapshot
   * otherwise. A folder has no document of its own to open beside the diff.
   */
  const openLinkedDir = useCallback(
    (dir: string, rev: string | null) => {
      setCompareCommit(null)
      setSelectedFile(null)
      setDocs([])
      setActiveDoc(null)
      if (rev === null) {
        setSelectedCommit(WORKTREE_ROW)
        setView({ mode: 'snapshot', hash: null, short: '', subject: '' })
      } else {
        const c = commits.find((x) => x.hash === rev)
        setSelectedCommit(rev)
        setView({
          mode: 'snapshot',
          hash: rev,
          short: c?.short ?? rev.slice(0, 8),
          subject: c?.subject ?? ''
        })
      }
      // The reading layout has a place for the tree; a full-screen diff would
      // sit on top of it. The folder is asked for after, so the tree is on
      // screen when the request lands.
      onLayout(BROWSE_PANES)
      setFull(null)
      setRevealDir((prev) => ({ dir, key: (prev?.key ?? 0) + 1 }))
    },
    [commits, onLayout]
  )

  /** The file pane found the linked folder; nothing left to reveal. */
  const clearReveal = useCallback(() => setRevealDir(null), [])

  /**
   * Paste whatever files the system clipboard holds into a directory of the
   * work tree. The sources are read in the main process from the clipboard
   * itself — nothing here names a path outside the repository — and the count
   * that comes back is only used to decide whether a refresh is worth doing;
   * the watcher would get there on its own, a moment later.
   */
  const pasteFiles = useCallback(
    (destDir: string) => {
      void window.gitty.file.paste(root, destDir).then((n) => {
        if (n > 0) void refresh()
      })
    },
    [root, refresh]
  )

  const backToWorkTree = useCallback(() => {
    setView({ mode: 'worktree' })
    setSelectedCommit(WORKTREE_ROW)
    setCompareCommit(null)
    setSelectedFile(null)
    setDocs([])
    setActiveDoc(null)
  }, [])

  const onSelectCommit = useCallback(
    (hash: string, additive: boolean) => {
      if (hash === WORKTREE_ROW) {
        backToWorkTree()
        return
      }
      const c = commits.find((x) => x.hash === hash)
      if (!c) return

      const anchor = commits.find((x) => x.hash === selectedCommit)
      if (!additive || !anchor) {
        showCommit(c)
        return
      }
      // Unmark either endpoint and restore the remaining commit's own diff.
      if (hash === selectedCommit || hash === compareCommit) {
        const remaining = hash === selectedCommit
          ? commits.find((x) => x.hash === compareCommit) ?? anchor
          : anchor
        showCommit(remaining)
        return
      }
      // Keep the first pick when replacing the second. List order defines
      // direction even across branches: lower row -> upper row.
      const iSel = commits.findIndex((x) => x.hash === selectedCommit)
      const iCmp = commits.findIndex((x) => x.hash === hash)
      const [from, to] = iSel > iCmp ? [anchor.hash, hash] : [hash, anchor.hash]
      setCompareCommit(hash)
      setSelectedFile(null)
      setDocs([])
      setActiveDoc(null)
      setView({ mode: 'range', from, to })
    },
    [commits, selectedCommit, compareCommit, showCommit, backToWorkTree]
  )

  // Only the active tab handles the shared Escape / refresh keys; the others
  // stay mounted and must not react to keys while hidden.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent): void => {
      // Escape unwinds one level at a time: a dialog, full screen, then view.
      if (e.key === 'Escape') {
        if (dialogOpen || agentPrompt || quickOpen) return
        if (full) setFull(null)
        else backToWorkTree()
      } else if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
        e.preventDefault()
        void refresh()
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && /^Digit[1-4]$/.test(e.code)) {
        // Ctrl+Shift+1..4 fill the window with that pane. Read from the code:
        // with Shift down the key itself is a punctuation mark.
        e.preventDefault()
        const id = PANE_ORDER[Number(e.code.slice(-1)) - 1]
        if (panes[id]) setFull((f) => (f === id ? null : id))
      } else if (isQuickOpenChord(e)) {
        // Ctrl+E opens a file by name, from the terminal as much as from
        // anywhere else — TerminalPane keeps xterm from passing it to the
        // shell, the way it does for the copy and pane chords. Unlike Ctrl+D,
        // whose shell meaning is how a shell is left, readline's end-of-line
        // is also the End key, so taking this key costs nothing.
        e.preventDefault()
        setQuickOpen(true)
      } else if (isBrowseChord(e)) {
        // Ctrl+B for browse: the work tree as a tree of files, read-only.
        e.preventDefault()
        browseWorktree()
      } else if (isChangesChord(e) && !fromTerminal(e.target)) {
        // Ctrl+D back to the changes, and to the whole window with them: the
        // way out of the reading layout Ctrl+B puts it into. In a terminal the
        // key stays end-of-input, which is how a shell is left.
        e.preventDefault()
        backToWorkTree()
        onLayout(ALL_PANES)
      } else if (isPaneCycleChord(e) && full) {
        // Ctrl+Tab moves full screen on to the next pane, Shift back. Only
        // while a pane fills the window: with the layout on screen every pane
        // is a click away, and Tab is the focus key it has always been.
        e.preventDefault()
        setFull((f) => (f ? nextPane(f, panes, e.shiftKey) : f))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    active,
    dialogOpen,
    agentPrompt,
    quickOpen,
    full,
    panes,
    backToWorkTree,
    browseWorktree,
    onLayout,
    refresh
  ])

  const loadMore = useCallback(async () => {
    if (loadingMore.current || exhausted.current) return
    loadingMore.current = true
    try {
      const more = await window.gitty.git.log(
        root,
        PAGE,
        commits.length,
        browsing,
        debouncedFilter,
        filterMode,
        allBranches
      )
      if (more.length === 0) exhausted.current = true
      else setCommits((prev) => mergeLog(prev, more))
    } finally {
      loadingMore.current = false
    }
  }, [root, browsing, commits.length, debouncedFilter, filterMode, allBranches])

  /* ---------- push, pull, gource, and the strip they report on ---------- */

  const {
    message: remoteMsg,
    setMessage: setRemoteMsg,
    report: said,
    op: remoteOp,
    runRemote,
    pullSubmodule,
    hasGource,
    gourceStarting,
    playGource
  } = useRemoteOps({ root, status, refresh, msg })

  /* ---------- staging ---------- */

  const {
    workingFile,
    stageDirection,
    staging,
    applyPicks,
    toggleStage,
    discardChanges,
    copyStagedDiff
  } = useStaging({
    root,
    view,
    selectedFile,
    status,
    viewingFile,
    diffOptions,
    sideOverride,
    refresh,
    report: said
  })

  /* ---------- running a snapshot's programs ---------- */

  /**
   * Run a program the way it was at the revision on screen.
   *
   * The whole tree of the snapshot is written to a temp directory first, so
   * the script finds the neighbours it had then rather than today's; browsing
   * the working tree needs no such copy, because that directory *is* the work
   * tree. What is typed is `cd <tree> && ./<file>` — and it is only typed. The
   * Enter is the user's, which is what keeps a right-click from being the act
   * of running an old program.
   *
   * The terminal pane may be hidden or never opened in this tab; showing it
   * starts a shell, which takes a moment to exist, so the line is offered
   * repeatedly until one answers.
   */
  const runSnapshotFile = useCallback(
    async (rel: string) => {
      if (view.mode !== 'snapshot') return
      let dir = root
      if (view.hash !== null) {
        const checkout = await window.gitty.git.snapshotExport(root, view.hash)
        if (!checkout.dir) {
          setRemoteMsg({
            ok: false,
            text: checkout.tooLarge
              ? msg.terminal.runTooLarge(Math.round(MAX_SNAPSHOT_EXPORT_BYTES / (1024 * 1024)))
              : msg.terminal.runExportFailed
          })
          return
        }
        dir = checkout.dir
      }
      const command = `cd ${shellQuote(dir)} && ${shellQuote(`./${rel}`)}`
      if (!panes.terminal) onLayout({ ...panes, terminal: true })
      for (let attempt = 0; attempt < 20; attempt++) {
        if (runInTerminal(root, command, false)) {
          setRemoteMsg(null)
          return
        }
        await new Promise((r) => setTimeout(r, 100))
      }
      setRemoteMsg({ ok: false, text: msg.terminal.agentNoTerminal })
    },
    [root, view, panes, onLayout, msg]
  )

  /* ---------- handing the index to an agent ---------- */

  /**
   * Hand the curated index over. Gitty writes one line into the shell that is
   * already in the window and stops there: no model is called from inside the
   * app, so nothing about the repository leaves the machine that the user did
   * not send themselves.
   */
  const sendToAgent = useCallback(
    (pick?: string) => {
      // Nothing to run is a state the button is disabled in, so this is a
      // guard rather than a case to report: there is no message for it.
      const command = (pick ?? agentCommand).trim()
      if (!command) return
      if (!runInTerminal(root, command)) {
        setRemoteMsg({ ok: false, text: msg.terminal.agentNoTerminal })
        return
      }
      // Remembered because it ran, not because it was typed: the list is a
      // record of what this machine actually has.
      onAgentCommand(command)
      setRemoteMsg(null)
    },
    [agentCommand, root, msg, onAgentCommand]
  )

  /**
   * The dropdown beside the button: every remembered command, the current one
   * ticked, and a way to type one that is not there yet. This is the only
   * place the command is chosen — a setting would be a second answer to a
   * question asked once per commit rather than once per install.
   */
  const agentItems = useCallback(
    (list: string[]): MenuItem[] => [
      ...list.map((c) => ({
        label: c,
        accel: c === agentCommand ? '✓' : undefined,
        title: `${c}${msg.terminal.agentCommandTooltip}`,
        action: () => sendToAgent(c),
        remove: {
          title: msg.terminal.agentForget,
          // Confirmed in the main process, so the dialog is modal to the
          // window. The menu is rebuilt rather than closed, so several can be
          // forgotten in a row.
          action: () => {
            void window.gitty.settings.confirmForget(c).then((yes) => {
              if (!yes) return
              onForgetAgentCommand(c)
              setMenu((m) => (m ? { ...m, items: agentItems(list.filter((x) => x !== c)) } : m))
            })
          }
        }
      })),
      {
        label: msg.terminal.agentNewCommand,
        separatorBefore: list.length > 0,
        action: () => setAgentPrompt(true)
      }
    ],
    [agentCommand, msg, sendToAgent, onForgetAgentCommand]
  )

  /* ---------- facts about this repository, read once ---------- */

  useEffect(() => {
    let live = true
    void window.gitty.git.remoteBases(root).then((bases) => {
      if (live) setRemoteBases(bases)
    })
    return () => {
      live = false
    }
  }, [root])

  useEffect(() => {
    let live = true
    void window.gitty.git.submodules(root).then((paths) => {
      if (live) setSubmodulePaths(new Set(paths))
    })
    return () => {
      live = false
    }
  }, [root])

  useEffect(() => {
    let live = true
    void window.gitty.git.unpushedCommits(root).then((hashes) => {
      if (live) setUnpushed(new Set(hashes))
    })
    return () => {
      live = false
    }
  }, [root, tick])

  /* ---------- context menus ---------- */

  const { diffMenu, diffFileMenu, fileMenu, docMenu, dirMenu, treeMenu, commitMenu, worktreeMenu } =
    createContextMenus({
      msg,
      root,
      view,
      pullSubmodule,
      viewingFile,
      previewing,
      docSource,
      wrap,
      setWrap,
      mdOutline,
      setMdOutline,
      wordDiff,
      setWordDiff,
      diffView,
      setDiffView,
      diff,
      selectedFile,
      selectedCommit,
      openFileDoc,
      openBlame,
      openHistory,
      showCommit,
      showSnapshot,
      onSelectCommit,
      revForView,
      setSelectedFile,
      setActiveDoc,
      setMenu,
      browseWorktree,
      canPaste: () => window.gitty.file.canPaste(),
      pasteFiles,
      runSnapshotFile: (path) => void runSnapshotFile(path),
      toggleStage: (path, staged) => void toggleStage(path, staged),
      discardChanges: (path) => void discardChanges(path),
      copyStagedDiff,
      remoteBases,
      // A detached HEAD has no name the remote would know, so the file menu's
      // remote link is simply absent there rather than guessing a branch.
      branchRev: status && status.branch !== '(detached)' ? status.branch : null,
      unpushed,
      viewFiles
    })

  /* ---------- log header overflow ---------- */

  // Push and Pull stay on the bar; everything else about the log is one more
  // click behind "⋯" — the view toggles first, then the one-shot actions.
  const openLogMenu = (x: number, y: number): void => {
    const items: MenuItem[] = [
      {
        label: `${graph ? '●' : ' '} ${msg.log.graph}`,
        title: msg.log.graphTitle,
        action: () => setGraph((g) => !g)
      },
      {
        label: `${allBranches ? '●' : ' '} ${msg.log.allBranches}`,
        title: msg.log.allBranchesTitle,
        action: () => setAllBranches((a) => !a)
      }
    ]
    // Only where gource is installed; starting it is brief enough that the
    // entry simply does nothing while it runs.
    if (hasGource)
      items.push({
        label: gourceStarting ? msg.log.gourceStarting : msg.log.gource,
        title: msg.log.gourceTitle,
        separatorBefore: true,
        action: () => {
          if (!gourceStarting) void playGource()
        }
      })
    items.push({
      label: msg.log.openInBrowser,
      title: msg.log.openRepoCommitsTitle,
      // Without gource the separator has to move here, or the one-shot group
      // loses the line that tells it apart from the toggles.
      separatorBefore: !hasGource,
      action: () => {
        void window.gitty.web.repoUrl(root).then((url) => {
          if (url) void window.gitty.file.openExternal(url)
        })
      }
    })
    setMenu({ x, y, items })
  }

  /* ---------- headers ---------- */

  const filesTitle = useMemo(() => {
    if (view.mode === 'worktree') return msg.files.changesTitle
    if (view.mode === 'commit') return msg.files.commitTitle(view.short, view.subject)
    // A null-hash snapshot is the work tree being browsed, not a revision.
    if (view.mode === 'snapshot' && view.hash === null) return msg.files.workingTreeTitle
    if (view.mode === 'snapshot') return msg.files.snapshotTitle(view.short, view.subject)
    return msg.files.rangeTitle(view.from, view.to)
  }, [view, msg])

  /* ---------- which panes are on screen ---------- */

  // A pane hidden while full screen must not come back still filling the window.
  useEffect(() => {
    setFull((f) => (f && !panes[f] ? null : f))
  }, [panes])

  const topRow = panes.files || panes.diff
  const bottomRow = panes.log || panes.terminal
  // Panels keep their sizes by position, so a changed set of children needs a
  // group id of its own — otherwise two visible panes would take up the sizes
  // stored for three.
  const rowsKey = `${topRow ? 't' : ''}${bottomRow ? 'b' : ''}`
  const topKey = `${panes.files ? 'f' : ''}${panes.diff ? 'd' : ''}`
  const bottomKey = `${panes.log ? 'l' : ''}${panes.terminal ? 't' : ''}`
  // The last pane standing keeps its close button hidden: there would be no
  // pane left to hold the layout.
  const canHide = visibleCount(panes) > 1
  const hideButton = (id: PaneId): JSX.Element | null =>
    canHide ? <HideButton accel={paneAccel(id)} onHide={() => onHidePane(id)} /> : null

  const toggleFull = useCallback((id: PaneId): void => setFull((f) => (f === id ? null : id)), [])

  const fullButton = (id: PaneId): JSX.Element => (
    <FullButton full={full === id} accel={paneFullAccel(id)} onToggle={() => toggleFull(id)} />
  )

  /** Double-clicking a header is the other way in and out of full screen. */
  const headerDoubleClick =
    (id: PaneId) =>
    (e: { target: EventTarget | null }): void => {
      // Buttons in the header have their own meaning.
      if ((e.target as HTMLElement).closest('button')) return
      toggleFull(id)
    }

  const paneClass = (id: PaneId): string => `pane${full === id ? ' maximized' : ''}`

  /* ---------- push / pull state, from the checked-out branch ---------- */

  const ahead = status?.ahead ?? 0
  const behind = status?.behind ?? 0
  const upstream = status?.upstream ?? null
  // With an upstream git has counted what is unpushed; without one, the branch
  // has never been published, so there is always something to send.
  const canPush = status !== null && (upstream === null ? true : ahead > 0)
  const canPull = upstream !== null
  const pushTitle = !status
    ? msg.pushPull.push
    : upstream === null
      ? msg.pushPull.publishTitle(status.branch)
      : ahead > 0
        ? msg.pushPull.pushAhead(ahead, status.branch, upstream)
        : msg.pushPull.nothingToPush(status.branch, upstream)
  const pullTitle = !status
    ? msg.pushPull.pull
    : upstream === null
      ? msg.pushPull.pullNoUpstream(status.branch)
      : behind > 0
        ? msg.pushPull.pullBehind(status.branch, upstream, behind)
        : msg.pushPull.pullFastForward(status.branch, upstream)

  const diffTitle = doc
    ? `${doc.path}${previewing ? ' (preview)' : ''}` +
      (doc.rev ? ` @ ${doc.rev.slice(0, 8)}` : '')
    : (diff?.title ?? msg.diff.titleFallback)

  return (
    <div className="repo-tab" onContextMenu={(e) => e.preventDefault()}>
      {/* Hidden tabs stay mounted, so their groups must opt out of hit
          testing: react-resizable-panels checks every registered group against
          the pointer, and a display:none group reports a zero-sized rect. */}
      <Group
        orientation="vertical"
        className="grid"
        id={groupId(root, `rows-${rowsKey}`)}
        disabled={!active}
      >
        {topRow && (
        // Collapsible: dragging the row separator past its minSize folds the
        // row away entirely, so the other row can be read at full height.
        <Panel defaultSize={bottomRow ? '55%' : undefined} minSize="20%" collapsible>
          <Group orientation="horizontal" id={groupId(root, `top-${topKey}`)} disabled={!active}>
            {panes.files && (
            // The vertical separator folds a side away the way the row one does.
            <Panel defaultSize={panes.diff ? '38%' : undefined} minSize="15%" collapsible>
              <FilesView
                view={view}
                title={filesTitle}
                viewFiles={viewFiles}
                naturalSort={naturalSort}
                selectedFile={selectedFile}
                treeKey={treeKey}
                commitMeta={commitMeta}
                paneClass={paneClass('files')}
                header={{ full: fullButton('files'), hide: hideButton('files') }}
                onDoubleClick={headerDoubleClick('files')}
                onSelect={(path) => {
                  // A single click browses the diff; opened files stay open.
                  setSelectedFile(path)
                  if (view.mode !== 'snapshot') setActiveDoc(null)
                }}
                onOpen={(path) => {
                  // Double-click opens the file as its own document beside the
                  // diff; the system application is a menu choice.
                  setSelectedFile(path)
                  openFileDoc(path)
                }}
                onMenu={fileMenu}
                onDirMenu={dirMenu}
                onTreeMenu={treeMenu}
                onPasteFiles={pasteFiles}
                onToggleStage={(f) => void toggleStage(f.path, !!f.staged)}
                onSearch={openSearch}
                onBackToWorkTree={backToWorkTree}
                onBrowseWorkTree={browseWorktree}
                setMenu={setMenu}
                revForView={revForView}
                reveal={revealDir}
                onRevealConsumed={clearReveal}
              />
            </Panel>
            )}
            {panes.files && panes.diff && <Separator className="sep-v" />}
            {panes.diff && (
            // Its pair: dragging the separator the other way folds the diff.
            <Panel minSize="20%" collapsible>
              <div className={paneClass('diff')}>
                <DiffHeader
                  view={view}
                  diffTitle={diffTitle}
                  selectedFile={selectedFile}
                  workingFile={workingFile}
                  viewingFile={viewingFile}
                  previewing={previewing}
                  jsonFormattable={jsonFormattable}
                  outlineable={outlineable}
                  doc={doc}
                  docs={docs}
                  activeDoc={activeDoc}
                  wrap={wrap}
                  diffView={diffView}
                  mdOutline={mdOutline}
                  collapseState={collapseState}
                  diffRef={diffRef}
                  sideOverride={sideOverride}
                  setWrap={setWrap}
                  setDiffView={setDiffView}
                  setMdOutline={setMdOutline}
                  setSelectedFile={setSelectedFile}
                  setActiveDoc={setActiveDoc}
                  setSideOverride={setSideOverride}
                  onTogglePreview={togglePreview}
                  openFileDoc={openFileDoc}
                  closeDoc={closeDoc}
                  onDocMenu={docMenu}
                  header={{ full: fullButton('diff'), hide: hideButton('diff') }}
                  onDoubleClick={headerDoubleClick('diff')}
                />
                {doc ? (
                  <Suspense
                    fallback={
                      <div className="pane-body">
                        <div className="empty">{msg.common.loading}</div>
                      </div>
                    }
                  >
                    <FileDoc
                      key={doc.id}
                      root={root}
                      path={doc.path}
                      rev={doc.rev}
                      kind={doc.kind}
                      preview={doc.preview}
                      wrap={wrap}
                      outline={mdOutline}
                      lineNumbers={mdLineNumbers}
                      changedLines={mdChangedLines}
                      active={active}
                      reloadKey={tick}
                      onSource={setDocSource}
                      onMenu={diffMenu}
                      setMenu={setMenu}
                      onOpenCommit={showCommit}
                      onCompareRevs={(from, to) => showFileRange(doc.path, from, to)}
                      range={doc.range}
                      gotoLine={doc.line}
                      onOpenHit={openHit}
                      onOpenPath={openLinkedPath}
                      onOpenDir={openLinkedDir}
                      anchor={doc.anchor}
                      onLineHistory={(start, end) => openLineHistory(doc.path, start, end)}
                    />
                  </Suspense>
                ) : (
                  <DiffPane
                    ref={diffRef}
                    active={active}
                    onOpenFile={openFileDoc}
                    onFileMenu={diffFileMenu}
                    onCollapseState={setCollapseState}
                    stage={
                      stageDirection
                        ? { direction: stageDirection, busy: staging, onApply: applyPicks }
                        : undefined
                    }
                    patch={diff?.patch ?? ''}
                    notice={diff?.notice}
                    wrap={wrap}
                    view={diffView}
                    wordDiff={wordDiff}
                    onMenu={diffMenu}
                    placeholder={
                      view.mode === 'worktree'
                        ? msg.diff.emptyWorktree
                        : view.mode === 'snapshot' && view.hash === null
                          ? msg.diff.emptyBrowseWorktree
                          : view.mode === 'snapshot'
                            ? msg.diff.emptySnapshot
                            : msg.diff.emptyDiff
                    }
                  />
                )}
              </div>
            </Panel>
            )}
          </Group>
        </Panel>
        )}

        {topRow && bottomRow && <Separator className="sep-h" />}

        {bottomRow && (
        // Its pair: dragging the separator down folds this row the same way.
        <Panel minSize="20%" collapsible>
          <Group
            orientation="horizontal"
            id={groupId(root, `bottom-${bottomKey}`)}
            disabled={!active}
          >
            {panes.log && (
            // The same fold in the bottom row: the log or the terminal gives
            // the other one the whole width.
            <Panel defaultSize={panes.terminal ? '58%' : undefined} minSize="20%" collapsible>
              <div className={paneClass('log')}>
                <div className="pane-header" onDoubleClick={headerDoubleClick('log')}>
                  {fullButton('log')}
                  <Tooltip
                    className="title"
                    lines={[
                      { key: '↑↓', desc: msg.log.keyMove },
                      { key: 'Enter', desc: msg.log.keyShow },
                      { key: 'Ctrl+Click', desc: msg.log.keyCompare },
                      { key: 'Esc', desc: msg.log.keyWorktree },
                      ...paneControls('log', msg)
                    ]}
                  >
                    {msg.log.commits}
                  </Tooltip>
                  {/* Only worth saying when it is not the checked-out branch;
                      otherwise the title bar already says it. */}
                  {browsing && (
                    <span className="badge branch-badge" title={msg.log.browsingAnother}>
                      ⎇ {browsing}
                    </span>
                  )}
                  {/* Both act on the checked-out branch, whichever branch the
                      log is pointed at — nothing here checks anything out. */}
                  <button
                    className="toggle"
                    disabled={!canPush || remoteOp !== null}
                    title={pushTitle}
                    onClick={() => void runRemote('push')}
                  >
                    {remoteOp === 'push' ? msg.pushPull.pushing : ahead > 0 ? msg.pushPull.pushCount(ahead) : msg.pushPull.push}
                  </button>
                  <button
                    className="toggle"
                    disabled={!canPull || remoteOp !== null}
                    title={pullTitle}
                    onClick={() => void runRemote('pull')}
                  >
                    {remoteOp === 'pull' ? msg.pushPull.pulling : behind > 0 ? msg.pushPull.pullCount(behind) : msg.pushPull.pull}
                  </button>
                  {/* Push and Pull are the frequent ones; the rest is a click
                      behind "⋯". */}
                  <button
                    className="toggle"
                    title={msg.log.moreTitle}
                    onClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect()
                      openLogMenu(r.left, r.bottom + 2)
                    }}
                  >
                    ⋯
                  </button>
                  <span className="spacer" />
                  {compareCommit && <span className="badge">{msg.log.comparing2}</span>}
                  {/* Narrowing the log is occasional, so the box is behind a
                      button rather than standing above the list all the time. */}
                  <button
                    className={`toggle${filterOpen ? ' on' : ''}`}
                    title={msg.log.filterTitle}
                    onClick={() => (filterOpen ? closeFilter() : setFilterOpen(true))}
                  >
                    {msg.log.filter}
                  </button>
                  {hideButton('log')}
                </div>
                {/* What git said. Failures stay until dismissed: a push that
                    needs a password or a pull that cannot fast-forward is
                    finished by hand in the terminal pane. */}
                {remoteMsg && (
                  <div
                    className={`remote-msg${remoteMsg.ok ? '' : ' error'}`}
                    title={msg.log.clickToDismiss}
                    onClick={() => setRemoteMsg(null)}
                  >
                    {remoteMsg.text}
                  </div>
                )}
                <LogPane
                  commits={commits}
                  graph={graph}
                  selected={selectedCommit}
                  compare={compareCommit}
                  changedCount={status?.files.length ?? 0}
                  filterOpen={filterOpen}
                  onCloseFilter={closeFilter}
                  filter={filter}
                  onFilter={setFilter}
                  filterMode={filterMode}
                  onFilterMode={setFilterMode}
                  searching={searching}
                  onSelect={onSelectCommit}
                  onWorktreeMenu={worktreeMenu}
                  onEnter={(hash) => {
                    if (hash === WORKTREE_ROW) {
                      backToWorkTree()
                      return
                    }
                    const c = commits.find((x) => x.hash === hash)
                    if (c) showCommit(c)
                  }}
                  onMenu={commitMenu}
                  onScrollEnd={() => void loadMore()}
                />
              </div>
            </Panel>
            )}
            {panes.log && panes.terminal && <Separator className="sep-v" />}
            {panes.terminal && (
            // Its pair: the terminal folds away the same way.
            <Panel minSize="15%" collapsible>
              {/* A repo tab owns its terminal group; the shells are keyed by
                  session id in the main process, so they survive tab switches
                  and hiding this pane, and are disposed when the tab closes.
                  The pane itself is a lazy chunk (xterm); the placeholder keeps
                  the split from collapsing while it loads. */}
              <Suspense
                fallback={
                  <div className="pane">
                    <div className="pane-header">
                      <span className="title">{msg.terminal.title}</span>
                    </div>
                    <div className="term-body">
                      <div className="empty">{msg.terminal.starting}</div>
                    </div>
                  </div>
                }
              >
                <TerminalsPane
                  root={root}
                  theme={theme}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  options={terminalOptions}
                  disabled={!active}
                  full={full === 'terminal'}
                  onToggleFull={() => toggleFull('terminal')}
                  onHide={canHide ? () => onHidePane('terminal') : undefined}
                  sendToAgent={sendToAgent}
                  agentItems={agentItems}
                  agentCommands={agentCommands}
                  agentCommand={agentCommand}
                  setMenu={setMenu}
                />
              </Suspense>
            </Panel>
            )}
          </Group>
        </Panel>
        )}
      </Group>

      <ContextMenu state={menu} onClose={() => setMenu(null)} />
      <QuickOpen
        open={quickOpen}
        root={root}
        // Always the file on disk, never the revision being browsed: the box
        // lists the working tree, so a pick from it opens what it listed.
        onOpen={(path) => openLinkedPath(path, null)}
        onClose={() => setQuickOpen(false)}
      />
      <PromptDialog
        open={agentPrompt}
        title={msg.terminal.agentPromptTitle}
        placeholder={msg.terminal.agentCommandPlaceholder}
        initial={agentCommand}
        submitLabel={msg.terminal.agentPromptRun}
        cancelLabel={msg.terminal.agentPromptCancel}
        onCancel={() => setAgentPrompt(false)}
        onSubmit={(c) => {
          setAgentPrompt(false)
          sendToAgent(c)
        }}
      />
    </div>
  )
})

/**
 * Append the next page of older commits, skipping any we already hold. Paging
 * only: a refresh replaces the loaded rows instead, because these are appended
 * and a rebase's rewritten commits would be appended too.
 */
function mergeLog(prev: Commit[], next: Commit[]): Commit[] {
  const seen = new Set(prev.map((c) => c.hash))
  return [...prev, ...next.filter((c) => !seen.has(c.hash))]
}
