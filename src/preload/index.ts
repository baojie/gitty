import os from 'node:os'
import { contextBridge, ipcRenderer } from 'electron'
import type {
  AboutInfo,
  ApplyDirection,
  BlameLine,
  Branch,
  ChurnSpec,
  Commit,
  CommitDetail,
  CommitFile,
  CommitMeta,
  DiffOptions,
  DiffRequest,
  DiffResult,
  FileChurn,
  FileHistoryEntry,
  FileMeasure,
  GitOpResult,
  GrepResult,
  HunkPick,
  ImageFileContent,
  LogFilterMode,
  PathKind,
  PdfFileContent,
  PtyExit,
  RemoteBases,
  RepoChanged,
  RepoStatus,
  SnapshotEntry,
  SnapshotExport,
  SnapshotFileContent,
  TerminalOptions,
  WebUrl,
  WorktreeFile
} from '../shared/types'

const api = {
  /** Used to shorten paths for display. */
  homeDir: os.homedir(),
  /** Which platform the app runs on; the renderer keys a hint off it. */
  platform: process.platform,
  /** The app icon as a data URL, for the title bar; null when unavailable. */
  appIcon: (): Promise<string | null> => ipcRenderer.invoke('app:icon'),
  /** Facts for the About dialog: version, author, home page, build time. */
  about: (): Promise<AboutInfo> => ipcRenderer.invoke('app:about'),
  /**
   * One Gitty process per user, or one per launch. The main process keeps this
   * one — it has to know before a window exists — while every other preference
   * lives in the renderer's storage. A change applies at the next launch.
   */
  singleInstance: {
    get: (): Promise<boolean> => ipcRenderer.invoke('prefs:single-instance'),
    set: (on: boolean): Promise<void> => ipcRenderer.invoke('prefs:set-single-instance', on)
  },
  repo: {
    initial: (): Promise<string> => ipcRenderer.invoke('repo:initial'),
    resolve: (cwd: string): Promise<string | null> => ipcRenderer.invoke('repo:resolve', cwd),
    pick: (): Promise<string | null> => ipcRenderer.invoke('repo:pick'),
    watch: (root: string): Promise<boolean> => ipcRenderer.invoke('repo:watch', root),
    close: (root: string): Promise<boolean> => ipcRenderer.invoke('repo:close', root),
    /** Repositories opened before, most recent first. */
    recent: (): Promise<string[]> => ipcRenderer.invoke('recent:list'),
    remember: (root: string): Promise<string[]> => ipcRenderer.invoke('recent:add', root),
    forget: (root: string): Promise<string[]> => ipcRenderer.invoke('recent:remove', root),
    forgetAll: (): Promise<void> => ipcRenderer.invoke('recent:clear'),
    /** The tabs now open, so closing the window can ask before taking several
     *  repositories with it — the main process cannot read them at that point. */
    reportOpen: (roots: string[]): void => ipcRenderer.send('repo:open-set', roots),
    onChanged: (cb: (changed: RepoChanged) => void): (() => void) => {
      const h = (_e: unknown, changed: RepoChanged): void => cb(changed)
      ipcRenderer.on('repo:changed', h)
      return () => ipcRenderer.removeListener('repo:changed', h)
    },
    /**
     * Fired when a second `gitty <repo>` hands its directory to this instance
     * instead of starting one of its own.
     */
    onOpenExternal: (cb: (repo: string) => void): (() => void) => {
      const h = (_e: unknown, repo: string): void => cb(repo)
      ipcRenderer.on('repo:open-external', h)
      return () => ipcRenderer.removeListener('repo:open-external', h)
    },
    /** Fired by the File ▸ Open Repository menu item. */
    onMenuOpen: (cb: () => void): (() => void) => {
      const h = (): void => cb()
      ipcRenderer.on('menu:open-repo', h)
      return () => ipcRenderer.removeListener('menu:open-repo', h)
    },
    /** Fired by the File ▸ Settings item and the Cmd/Ctrl+, accelerator. */
    onMenuSettings: (cb: () => void): (() => void) => {
      const h = (): void => cb()
      ipcRenderer.on('menu:open-settings', h)
      return () => ipcRenderer.removeListener('menu:open-settings', h)
    },
    /** Fired by the File ▸ Close Repository item and the Cmd/Ctrl+W accelerator. */
    onMenuCloseRepo: (cb: () => void): (() => void) => {
      const h = (): void => cb()
      ipcRenderer.on('menu:close-repo', h)
      return () => ipcRenderer.removeListener('menu:close-repo', h)
    },
    /** Fired by the View ▸ Refresh menu item. */
    onMenuRefresh: (cb: () => void): (() => void) => {
      const h = (): void => cb()
      ipcRenderer.on('menu:refresh', h)
      return () => ipcRenderer.removeListener('menu:refresh', h)
    },
    /** Fired by the Help ▸ About Gitty menu item. */
    onMenuAbout: (cb: () => void): (() => void) => {
      const h = (): void => cb()
      ipcRenderer.on('menu:about', h)
      return () => ipcRenderer.removeListener('menu:about', h)
    },
    /** Fired by the Help ▸ Keyboard Shortcuts item; F1 is the renderer's. */
    onMenuShortcuts: (cb: () => void): (() => void) => {
      const h = (): void => cb()
      ipcRenderer.on('menu:shortcuts', h)
      return () => ipcRenderer.removeListener('menu:shortcuts', h)
    }
  },
  git: {
    status: (root: string): Promise<RepoStatus> => ipcRenderer.invoke('git:status', root),
    /** `ref` points the log at another branch; null or omitted means HEAD.
     *  `filter` narrows it when non-empty — by message and author, or through
     *  the pickaxe over the diffs themselves, depending on `mode`. */
    log: (
      root: string,
      limit: number,
      skip = 0,
      ref: string | null = null,
      filter = '',
      mode: LogFilterMode = 'text',
      all = false
    ): Promise<Commit[]> =>
      ipcRenderer.invoke('git:log', root, limit, skip, ref, filter, mode, all),
    branches: (root: string): Promise<Branch[]> => ipcRenderer.invoke('git:branches', root),
    /**
     * Prefixes the remote's own commit and file pages are built from, or null
     * when no such pages can be inferred from the remote URL.
     */
    remoteBases: (root: string): Promise<RemoteBases | null> =>
      ipcRenderer.invoke('git:remoteBases', root),
    /** Push the checked-out branch; `branch` is named only to set an upstream. */
    push: (root: string, branch: string | null = null): Promise<GitOpResult> =>
      ipcRenderer.invoke('git:push', root, branch),
    pull: (root: string): Promise<GitOpResult> => ipcRenderer.invoke('git:pull', root),
    /** Repo-relative paths of the work tree's submodules, from `.gitmodules`. */
    submodules: (root: string): Promise<string[]> => ipcRenderer.invoke('git:submodules', root),
    /** Fetch one submodule's remote and move it to the tip it tracks. */
    submodulePull: (root: string, subPath: string): Promise<GitOpResult> =>
      ipcRenderer.invoke('git:submodulePull', root, subPath),
    commitDetail: (root: string, hash: string): Promise<CommitDetail> =>
      ipcRenderer.invoke('git:commitDetail', root, hash),
    commitMeta: (root: string, hash: string): Promise<CommitMeta> =>
      ipcRenderer.invoke('git:commitMeta', root, hash),
    /** Which commit last touched each line. `rev` null blames the work tree. */
    blame: (root: string, rev: string | null, filePath: string): Promise<BlameLine[]> =>
      ipcRenderer.invoke('git:blame', root, rev, filePath),
    /**
     * Every commit that touched this file, newest first, following renames,
     * each with the file's line count at that commit.
     */
    fileHistory: (root: string, rev: string | null, filePath: string): Promise<FileHistoryEntry[]> =>
      ipcRenderer.invoke('git:fileHistory', root, rev, filePath),
    /** How a range of lines got this way: `git log -L`, raw, headers and all. */
    lineHistory: (
      root: string,
      rev: string | null,
      filePath: string,
      start: number,
      end: number
    ): Promise<string> =>
      ipcRenderer.invoke('git:lineHistory', root, rev, filePath, start, end),
    /** Search the work tree, or a revision when one is named. */
    grep: (root: string, pattern: string, rev: string | null): Promise<GrepResult> =>
      ipcRenderer.invoke('git:grep', root, pattern, rev),
    rangeFiles: (root: string, from: string, to: string): Promise<CommitFile[]> =>
      ipcRenderer.invoke('git:rangeFiles', root, from, to),
    diff: (root: string, req: DiffRequest, opts: DiffOptions): Promise<DiffResult> =>
      ipcRenderer.invoke('git:diff', root, req, opts),
    /** Put a whole file into the index. */
    stageFile: (root: string, filePath: string): Promise<GitOpResult> =>
      ipcRenderer.invoke('git:stageFile', root, filePath),
    /** Take a whole file back out of the index; the work tree is untouched. */
    unstageFile: (root: string, filePath: string): Promise<GitOpResult> =>
      ipcRenderer.invoke('git:unstageFile', root, filePath),
    /** Throw away a tracked file's uncommitted changes, after a native
     *  confirmation. Null when the confirmation was declined. No undo. */
    discardFile: (root: string, filePath: string): Promise<GitOpResult | null> =>
      ipcRenderer.invoke('git:discardFile', root, filePath),
    /** The whole index as a patch, for handing to something outside Gitty. */
    stagedDiff: (root: string): Promise<string> => ipcRenderer.invoke('git:stagedDiff', root),
    /** Stage or unstage picked hunks and lines of one file. `opts` must be the
     *  options the pane drew the diff with, or the hunks would not line up. */
    applyHunks: (
      root: string,
      filePath: string,
      picks: HunkPick[],
      direction: ApplyDirection,
      opts: DiffOptions,
      origPath?: string
    ): Promise<GitOpResult> =>
      ipcRenderer.invoke('git:applyHunks', root, filePath, picks, direction, opts, origPath),
    /** The hashes no remote has yet, so a link to the hosting site's page for
     *  one can be left out rather than pointing at a 404. */
    unpushedCommits: (root: string): Promise<string[]> =>
      ipcRenderer.invoke('git:unpushedCommits', root),
    snapshotFiles: (root: string, hash: string): Promise<SnapshotEntry[]> =>
      ipcRenderer.invoke('git:snapshotFiles', root, hash),
    /** Check a commit out into a temp work tree and answer with its path, or
     *  with no path and the reason there is none. */
    snapshotExport: (root: string, hash: string): Promise<SnapshotExport> =>
      ipcRenderer.invoke('git:snapshotExport', root, hash),
    /** Every file on disk now — tracked, untracked and ignored — for browsing
     *  the work tree; each says whether `.gitignore` covers it. */
    worktreeFiles: (root: string): Promise<WorktreeFile[]> =>
      ipcRenderer.invoke('git:worktreeFiles', root),
    snapshotFile: (root: string, hash: string, filePath: string): Promise<SnapshotFileContent> =>
      ipcRenderer.invoke('git:snapshotFile', root, hash, filePath),
    snapshotOpen: (root: string, hash: string, filePath: string): Promise<string | null> =>
      ipcRenderer.invoke('git:snapshotOpen', root, hash, filePath),
    readWorking: (root: string, filePath: string): Promise<SnapshotFileContent> =>
      ipcRenderer.invoke('git:readWorking', root, filePath),
    /** Whether a path is a file or a directory, at the revision it was asked
     *  about — the work tree when `rev` is null. A markdown link can name
     *  either, and which it is decides what Gitty does with the click. */
    pathKind: (root: string, rev: string | null, filePath: string): Promise<PathKind> =>
      ipcRenderer.invoke('git:pathKind', root, rev, filePath),
    readImage: (root: string, rev: string | null, filePath: string): Promise<ImageFileContent> =>
      ipcRenderer.invoke('git:readImage', root, rev, filePath),
    /** Measure a batch of files — lines and bytes — in the order asked. */
    fileLines: (
      root: string,
      pairs: Array<{ rev: string | null; filePath: string }>
    ): Promise<FileMeasure[]> => ipcRenderer.invoke('git:fileLines', root, pairs),
    /** One PDF's bytes, from the work tree or a revision; the viewer is
     *  Chromium's own, so the renderer only has to hand it the file. */
    readPdf: (root: string, rev: string | null, filePath: string): Promise<PdfFileContent> =>
      ipcRenderer.invoke('git:readPdf', root, rev, filePath),
    /** Who last touched each path, as of `rev` — the work tree's HEAD when it
     *  is null. A path git has never seen is absent from the answer. */
    fileAuthors: (
      root: string,
      rev: string | null,
      paths: string[]
    ): Promise<Record<string, string>> => ipcRenderer.invoke('git:fileAuthors', root, rev, paths),
    /** Lines added and removed per path, for one commit, range or the work tree. */
    fileChurn: (
      root: string,
      spec: ChurnSpec,
      opts: DiffOptions
    ): Promise<Record<string, FileChurn>> => ipcRenderer.invoke('git:fileChurn', root, spec, opts)
  },
  /** Every plugin's methods, over one channel — see `ref/spec/plugins.md`.
   *  This is the only entry the bridge grows however many plugins there are:
   *  the main process looks the pair up among the plugins it registered and
   *  refuses anything else. What a method takes and answers with is the
   *  plugin's own business, agreed in its `shared.ts`. */
  plugins: {
    invoke: (id: string, method: string, args: unknown[]): Promise<unknown> =>
      ipcRenderer.invoke('plugin:invoke', id, method, args)
  },
  file: {
    open: (abs: string): Promise<string | null> => ipcRenderer.invoke('file:open', abs),
    reveal: (abs: string): Promise<void> => ipcRenderer.invoke('file:reveal', abs),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('file:openExternal', url),
    /** Send a work-tree file to the trash, after a native confirmation.
     *  Resolves true only when it is gone; the watcher refreshes the panes. */
    trash: (root: string, filePath: string): Promise<boolean> =>
      ipcRenderer.invoke('file:trash', root, filePath),
    /** Whether the system clipboard holds files that could be pasted. */
    canPaste: (): Promise<boolean> => ipcRenderer.invoke('file:canPaste'),
    /** Paste them into a directory of the work tree, relative to its root.
     *  Resolves with how many arrived; the watcher refreshes the panes. */
    paste: (root: string, destDir: string): Promise<number> =>
      ipcRenderer.invoke('file:paste', root, destDir)
  },
  /** gource, when it is installed: an animation of the repository's history.
   *  It draws its own window; `play` resolves once it is up, or with what it
   *  said if it died on the spot. */
  gource: {
    available: (): Promise<boolean> => ipcRenderer.invoke('gource:available'),
    play: (root: string): Promise<GitOpResult> => ipcRenderer.invoke('gource:play', root)
  },
  /** The local web server that renders commits for the browser. */
  web: {
    repoUrl: (root: string): Promise<WebUrl> => ipcRenderer.invoke('web:repoUrl', root),
    commitUrl: (root: string, hash: string): Promise<WebUrl> =>
      ipcRenderer.invoke('web:commitUrl', root, hash)
  },
  /** The shells this machine offers, for the settings list. */
  shells: (): Promise<string[]> => ipcRenderer.invoke('settings:shells'),
  clipboard: {
    write: (text: string): Promise<void> => ipcRenderer.invoke('clipboard:write', text)
  },
  /** Settings that live in the main process. */
  settings: {
    /** Switch the application menu and all UI text to `locale`. */
    setLocale: (locale: string): void => ipcRenderer.send('settings:setLocale', locale),
    /** Ask, natively, whether a remembered agent command is to be forgotten.
     *  The dialog is modal to the window, which a menu the renderer draws is
     *  not — and forgetting is the one thing in that menu with no undo. */
    confirmForget: (command: string): Promise<boolean> =>
      ipcRenderer.invoke('settings:confirmForget', command)
  },
  // Several shells can be alive at once — the pane splits — so every call and
  // every event names the session it belongs to.
  terminal: {
    start: (
      id: string,
      root: string,
      cols: number,
      rows: number,
      opts: TerminalOptions
    ): Promise<boolean> => ipcRenderer.invoke('terminal:start', id, root, cols, rows, opts),
    input: (id: string, data: string): void => ipcRenderer.send('terminal:input', id, data),
    resize: (id: string, cols: number, rows: number): void =>
      ipcRenderer.send('terminal:resize', id, cols, rows),
    close: (id: string): void => ipcRenderer.send('terminal:close', id),
    onData: (cb: (id: string, data: string) => void): (() => void) => {
      const h = (_e: unknown, id: string, data: string): void => cb(id, data)
      ipcRenderer.on('terminal:data', h)
      return () => ipcRenderer.removeListener('terminal:data', h)
    },
    onExit: (cb: (id: string, info: PtyExit) => void): (() => void) => {
      const h = (_e: unknown, id: string, info: PtyExit): void => cb(id, info)
      ipcRenderer.on('terminal:exit', h)
      return () => ipcRenderer.removeListener('terminal:exit', h)
    }
  }
}

export type GittyApi = typeof api

contextBridge.exposeInMainWorld('gitty', api)
