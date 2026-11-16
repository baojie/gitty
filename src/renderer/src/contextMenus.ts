import type { Dispatch, SetStateAction } from 'react'
import type { Commit, DiffResult, RemoteBases } from '../../shared/types'
import type { MenuItem, MenuState } from './components/ContextMenu'
import type { DiffView } from './components/DiffPane'
import { isHtmlPath, isMarkdownPath } from './paths'
import { BROWSE_ACCEL, PASTE_ACCEL } from './panes'
import type { FileEntry } from './components/FilesPane'
import type { FileDocState } from './nav'
import type { RendererMessages } from '../../shared/messages'

/**
 * What a repository session can show: the uncommitted changes, one commit, a
 * range, or the whole tree at a commit. A snapshot with a null hash is "browse
 * working tree": the whole tree, but read from the disk as it is right now
 * rather than from a revision. The menus below only read the view, but most of
 * the tab does too, so it lives with its owner and is imported back by RepoTab.
 */
// `worktree` is the uncommitted-changes view: the UI reads it as "Changes".
// The name is the directory it lives in, kept to avoid renaming the mode. A
// snapshot with a null hash is the other use of the word — browsing that same
// directory's whole contents ("Working Tree").
export type View =
  | { mode: 'worktree' }
  | { mode: 'commit'; hash: string; short: string; subject: string }
  | { mode: 'range'; from: string; to: string }
  | { mode: 'snapshot'; hash: string | null; short: string; subject: string }

/**
 * Everything the four context-menu builders read from the repository session
 * that owns them. Passed as one object so the builders stay plain functions of
 * their inputs rather than closures over the whole tab.
 */
export interface ContextMenuDeps {
  msg: RendererMessages
  root: string
  view: View
  /** Whether a file document is open beside the diff. */
  viewingFile: boolean
  /** That document is a markdown preview, not source. */
  previewing: boolean
  docSource: string | null
  wrap: boolean
  setWrap: Dispatch<SetStateAction<boolean>>
  mdOutline: boolean
  setMdOutline: Dispatch<SetStateAction<boolean>>
  wordDiff: boolean
  setWordDiff: Dispatch<SetStateAction<boolean>>
  diffView: DiffView
  setDiffView: Dispatch<SetStateAction<DiffView>>
  diff: DiffResult | null
  selectedFile: string | null
  selectedCommit: string | null
  openFileDoc: (path: string) => void
  /** Open whole-file blame for a path as a diff-pane document. */
  openBlame: (path: string) => void
  /** Open the file's commit history as a diff-pane document. */
  openHistory: (path: string) => void
  showCommit: (c: Commit) => void
  showSnapshot: (c: Commit) => void
  onSelectCommit: (hash: string, additive: boolean) => void
  revForView: () => string | null
  setSelectedFile: Dispatch<SetStateAction<string | null>>
  setActiveDoc: Dispatch<SetStateAction<string | null>>
  setMenu: (state: MenuState) => void
  /** Browse the whole repository as it is on disk right now, read-only. */
  browseWorktree: () => void
  /** Whether the system clipboard holds files, asked as the menu opens. */
  canPaste: () => Promise<boolean>
  /** Paste them into a directory of the work tree, relative to the root. */
  pasteFiles: (destDir: string) => void
  /**
   * Snapshot only: type the line that runs this file as it was at that
   * revision into the terminal pane. Never pressed Enter for the user.
   */
  runSnapshotFile: (path: string) => void
  /**
   * On-disk views only: fetch a submodule's own remote and move it to the tip
   * it tracks. The superproject keeps pointing at the old commit.
   */
  pullSubmodule: (path: string) => void
  /** Changes view only: move a whole file in or out of the index. */
  toggleStage: (path: string, staged: boolean) => void
  /** Changes view only: throw a tracked file's changes away, after confirming. */
  discardChanges: (path: string) => void
  /** The whole index as a patch, for a conversation happening elsewhere. */
  copyStagedDiff: () => void
  /**
   * Prefixes the hosting site's own commit and file pages are built from, or
   * null when the repository has no remote whose page layout can be inferred.
   */
  remoteBases: RemoteBases | null
  /**
   * The revision a file's remote page is named by in the views that are the
   * directory on disk: the checked-out branch, or null on a detached HEAD.
   */
  branchRev: string | null
  /**
   * The commits no remote has yet. The hosting site has no page for one, so
   * neither a commit's remote link nor a file's is offered at such a revision.
   */
  unpushed: Set<string>
  /** The file pane's rows, which a document tab looks its file up in. */
  viewFiles: FileEntry[]
}

/** The four context-menu builders, in one factory so RepoTab calls it once. */
export function createContextMenus(deps: ContextMenuDeps): {
  diffMenu: (at: MenuState) => void
  diffFileMenu: (path: string, at: MenuState) => void
  fileMenu: (entry: FileEntry, at: MenuState) => void
  /** A document tab beside the diff: its file's menu, as the tree offers it. */
  docMenu: (doc: FileDocState, at: MenuState) => void
  /** A directory row in the file tree, which is a path rather than a file. */
  dirMenu: (dir: string, at: MenuState) => void
  /** The file tree's own menu, off the empty space below the rows. */
  treeMenu: (at: MenuState) => void
  commitMenu: (c: Commit, at: MenuState) => void
  worktreeMenu: (at: MenuState) => void
} {
  const {
    msg,
    root,
    view,
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
    canPaste,
    pasteFiles,
    runSnapshotFile,
    pullSubmodule,
    toggleStage,
    discardChanges,
    copyStagedDiff,
    remoteBases,
    branchRev,
    unpushed,
    viewFiles
  } = deps

  const diffMenu = (at: MenuState): void => {
    const selection = window.getSelection()?.toString() ?? ''
    const items: MenuItem[] = []
    if (selection) {
      items.push({
        label: msg.contextMenu.copySelection,
        accel: msg.contextMenu.copySelectionAccel,
        action: () => void window.gitty.clipboard.write(selection)
      })
    }
    if (viewingFile) {
      items.push({
        label: previewing ? msg.contextMenu.copyMarkdownSource : msg.contextMenu.copyFileContents,
        separatorBefore: items.length > 0,
        action: () => void window.gitty.clipboard.write(docSource ?? '')
      })
      items.push({
        label: wrap ? msg.contextMenu.disableWordWrap : msg.contextMenu.enableWordWrap,
        separatorBefore: true,
        action: () => setWrap((w) => !w)
      })
      if (previewing) {
        items.push({
          label: mdOutline ? msg.contextMenu.hideOutline : msg.contextMenu.showOutline,
          action: () => setMdOutline((o) => !o)
        })
      }
      // A snapshot has no diff to go back to.
      if (view.mode !== 'snapshot') {
        items.push({
          label: msg.contextMenu.showDiffInstead,
          action: () => setActiveDoc(null)
        })
      }
    } else {
      items.push({
        label: msg.contextMenu.copyWholeDiff,
        separatorBefore: items.length > 0,
        action: () => void window.gitty.clipboard.write(diff?.patch ?? '')
      })
      if (selectedFile) {
        items.push({
          label:
            isMarkdownPath(selectedFile) || isHtmlPath(selectedFile)
              ? msg.contextMenu.previewMarkdown
              : msg.contextMenu.viewFile,
          separatorBefore: true,
          action: () => openFileDoc(selectedFile)
        })
      }
      items.push({
        label: wrap ? msg.contextMenu.disableWordWrap : msg.contextMenu.enableWordWrap,
        separatorBefore: !selectedFile,
        action: () => setWrap((w) => !w)
      })
      items.push({
        label: wordDiff ? msg.contextMenu.disableWordHighlight : msg.contextMenu.enableWordHighlight,
        action: () => setWordDiff((w) => !w)
      })
      items.push({
        label: diffView === 'inline' ? msg.contextMenu.sideBySideView : msg.contextMenu.inlineView,
        action: () => setDiffView((v) => (v === 'inline' ? 'split' : 'inline'))
      })
    }
    setMenu({ ...at, items })
  }

  /** Right-click on a file heading inside a diff. */
  const diffFileMenu = (path: string, at: MenuState): void => {
    const name = path.split('/').pop() ?? path
    const rev = revForView()
    const absPath = `${root}/${path}`
    setMenu({
      ...at,
      items: [
        {
          label: msg.contextMenu.openInNewTab(name),
          accel: msg.contextMenu.openInNewTabAccel,
          action: () => openFileDoc(path)
        },
        {
          label: msg.contextMenu.selectInFileList,
          action: () => setSelectedFile(path)
        },
        {
          label: msg.contextMenu.copyRelativePath,
          separatorBefore: true,
          action: () => void window.gitty.clipboard.write(path)
        },
        { label: msg.contextMenu.copyAbsolutePath, action: () => void window.gitty.clipboard.write(absPath) },
        { label: msg.contextMenu.copyFileName, action: () => void window.gitty.clipboard.write(name) },
        // Only meaningful for the file as it is on disk right now.
        ...(rev
          ? []
          : [
              {
                label: msg.contextMenu.openInSystemApp,
                separatorBefore: true,
                action: () => void window.gitty.file.open(absPath)
              },
              {
                label: msg.contextMenu.revealInFileManager,
                action: () => void window.gitty.file.reveal(absPath)
              }
            ])
      ]
    })
  }

  /**
   * Pasting writes to the working directory, so it is offered by the two views
   * that *are* that directory — the changes and the working tree — and by
   * neither of the ones describing a revision, where there is nothing on disk
   * to write into.
   */
  const pastable = view.mode === 'worktree' || (view.mode === 'snapshot' && view.hash === null)

  /** The Paste item, or nothing: it is left out rather than greyed out when
   *  the clipboard holds no files, which is most of the time. */
  const pasteItem = (destDir: string, can: boolean): MenuItem[] =>
    pastable && can
      ? [
          {
            label: destDir ? msg.contextMenu.pasteInto(destDir) : msg.contextMenu.paste,
            accel: PASTE_ACCEL,
            separatorBefore: true,
            action: () => pasteFiles(destDir)
          }
        ]
      : []

  /**
   * The hosting site's own page for a file, or null when there is nothing to
   * point at: no remote whose layout we can name, no revision the remote would
   * know (a detached HEAD, or a commit that has not been pushed), or a file git
   * has never seen. The revision is the view's own where it names one, and the
   * checked-out branch in the two views that are the directory on disk — a
   * branch's files are still a guess about what was pushed, the same kind of
   * guess the address itself is; a hash is not, which is why one the remote
   * cannot have is left out rather than linked to a 404.
   */
  const remoteFileUrl = (rel: string, untracked: boolean): string | null => {
    if (!remoteBases || untracked) return null
    const rev = revForView() ?? branchRev
    if (!rev || unpushed.has(rev)) return null
    // Path and branch segments are escaped, the separators between them are
    // not: `feature/x` is two segments of the URL, not one escaped string.
    const enc = (p: string): string => p.split('/').map(encodeURIComponent).join('/')
    return `${remoteBases.file}${enc(rev)}/${enc(rel)}`
  }

  /**
   * `listed` is false for a file the view's list does not hold — a document
   * opened on an unchanged file, from a link or a search hit. The Changes view
   * lists only what is uncommitted, so such a file has nothing to stage,
   * discard or delete there, and is offered what the Working Tree would offer.
   */
  const fileMenu = async (entry: FileEntry, at: MenuState, listed = true): Promise<void> => {
    const rel = entry.path
    const can = await canPaste()
    // Snapshot entries carry a virtual absPath; opening must go through the
    // snapshot temp file, and "Reveal" has nothing to reveal on disk.
    const snapshot = entry.absPath.startsWith('gitty:snapshot:')
    const items: MenuItem[] = [
      {
        label: msg.contextMenu.viewFile,
        accel: msg.contextMenu.viewFileAccel,
        action: () => {
          setSelectedFile(entry.path)
          openFileDoc(entry.path)
        }
      }
    ]
    const snapshotHash = snapshot && view.mode === 'snapshot' ? view.hash : null
    if (snapshotHash) {
      items.push({
        label: msg.contextMenu.openInSystemApp,
        action: () => void window.gitty.git.snapshotOpen(root, snapshotHash, rel)
      })
    } else {
      items.push(
        { label: msg.contextMenu.openInSystemApp, action: () => void window.gitty.file.open(entry.absPath) },
        { label: msg.contextMenu.revealInFileManager, action: () => void window.gitty.file.reveal(entry.absPath) }
      )
    }
    // The same file on the hosting site, which is the other place it can be
    // read — and the one a link can be sent to somebody else.
    const remoteUrl = remoteFileUrl(rel, !!entry.untracked)
    if (remoteUrl) {
      items.push({
        label: msg.contextMenu.openRemoteUrl,
        action: () => void window.gitty.file.openExternal(remoteUrl)
      })
    }
    // Running it, and only where both halves of the question have an answer:
    // a tree Gitty can lay out on disk, and a file git recorded as a program.
    // The command lands at the prompt unrun — a right-click is not the moment
    // to execute a program, but it is a fine moment to have it typed out.
    if (view.mode === 'snapshot' && entry.exec) {
      items.push({
        label: msg.contextMenu.runFile,
        action: () => runSnapshotFile(rel)
      })
    }
    // A submodule is a repository of its own, and pulling it means running
    // git inside it — so it is offered only by the two views that are the
    // directory on disk, never by one describing a revision.
    if (entry.submodule && pastable) {
      items.push({
        label: msg.contextMenu.pullSubmodule,
        separatorBefore: true,
        action: () => pullSubmodule(rel)
      })
    }
    // Whole-file questions, in every mode: a commit-mode file blames that
    // revision, a snapshot file blames the snapshot's tree.
    items.push(
      {
        label: msg.contextMenu.blameFile,
        separatorBefore: true,
        action: () => openBlame(rel)
      },
      { label: msg.contextMenu.fileHistory, action: () => openHistory(rel) }
    )
    items.push({
      label: msg.contextMenu.copyRelativePath,
      separatorBefore: items.length > 0,
      action: () => void window.gitty.clipboard.write(rel)
    })
    items.push({ label: msg.contextMenu.copyAbsolutePath, action: () => void window.gitty.clipboard.write(entry.absPath) })
    items.push({
      label: msg.contextMenu.copyFileName,
      action: () => void window.gitty.clipboard.write(rel.split('/').pop() ?? rel)
    })
    // The index, and the two ways of leaving it: only in the Changes view,
    // which is the only mode that has one.
    if (view.mode === 'worktree' && listed) {
      items.push({
        label: entry.staged ? msg.contextMenu.unstageFile : msg.contextMenu.stageFile,
        separatorBefore: true,
        action: () => toggleStage(rel, !!entry.staged)
      })
      // Discarding restores from the index, so it needs something to restore
      // from: an untracked file has no such thing and is deleted instead.
      if (!entry.untracked) {
        items.push({
          label: msg.contextMenu.discardChanges,
          action: () => discardChanges(rel)
        })
      }
    }
    // Deleting is about the file on disk, so it belongs to the Changes view
    // alone: a commit's file list and a snapshot describe revisions, where there
    // is nothing to delete. A file already gone from the tree is not offered either.
    if (view.mode === 'worktree' && listed && !entry.deleted) {
      items.push({
        label: msg.contextMenu.deleteFile,
        separatorBefore: true,
        action: () => void window.gitty.file.trash(root, rel)
      })
    }
    // Into the directory holding the file that was right-clicked, which is
    // where a paste aimed at a row belongs.
    items.push(...pasteItem(rel.split('/').slice(0, -1).join('/'), can))
    setMenu({ ...at, items })
  }

  /**
   * A document tab names a file, so it offers that file's menu — the row's own
   * entry where the list has one, so the marks that decide Stage or Unstage are
   * the row's. A search has no file to offer. Every view change closes the
   * documents, so one read at another revision than the view's is not expected;
   * it would get items about the wrong revision, and gets none instead.
   */
  const docMenu = (doc: FileDocState, at: MenuState): void => {
    if (doc.kind === 'grep' || doc.rev !== revForView()) return
    const row = viewFiles.find((e) => e.path === doc.path)
    if (row) {
      void fileMenu(row, at)
      return
    }
    const absPath =
      view.mode === 'snapshot' && view.hash !== null
        ? `gitty:snapshot:${view.hash}:${doc.path}`
        : `${root}/${doc.path}`
    void fileMenu({ path: doc.path, absPath, marks: [], deleted: false }, at, false)
  }

  /**
   * Right-click on a directory row. A folder has no diff and no index entry,
   * so what is left is where it is and how to get at it: the paths, the two
   * ways of opening it outside Gitty, and a paste that lands inside it.
   */
  const dirMenu = async (dir: string, at: MenuState): Promise<void> => {
    const can = await canPaste()
    const absPath = `${root}/${dir}`
    const items: MenuItem[] = [
      { label: msg.contextMenu.copyRelativePath, action: () => void window.gitty.clipboard.write(dir) },
      { label: msg.contextMenu.copyAbsolutePath, action: () => void window.gitty.clipboard.write(absPath) },
      {
        label: msg.contextMenu.copyFolderName,
        action: () => void window.gitty.clipboard.write(dir.split('/').pop() ?? dir)
      }
    ]
    // A snapshot of a revision is not a directory anyone can open: the tree it
    // lists exists in git, not on disk. Every other view is the disk itself, or
    // a commit whose paths still resolve there.
    if (!(view.mode === 'snapshot' && view.hash !== null)) {
      items.push(
        {
          label: msg.contextMenu.openFolderInBrowser,
          separatorBefore: true,
          // The browser's own directory listing; `file.open` would hand the
          // folder to the file manager, which is the item below.
          action: () => void window.gitty.file.openExternal(`file://${absPath}`)
        },
        {
          label: msg.contextMenu.openFolderInFileManager,
          action: () => void window.gitty.file.open(absPath)
        }
      )
    }
    items.push(...pasteItem(dir, can))
    setMenu({ ...at, items })
  }

  /** Right-click on the tree itself rather than on a row: the repository root
   *  is what the menu acts on — the folder to open, and where a paste with no
   *  row under it lands. */
  const treeMenu = async (at: MenuState): Promise<void> => {
    const items: MenuItem[] = []
    // A revision's snapshot is a tree in git, not the directory on disk, for
    // the same reason dirMenu leaves its folders unopenable.
    if (!(view.mode === 'snapshot' && view.hash !== null)) {
      items.push({
        label: msg.contextMenu.openFolderInFileManager,
        action: () => void window.gitty.file.open(root)
      })
    }
    items.push(...pasteItem('', await canPaste()))
    if (items.length === 0) return
    // The first item heads the menu, so it needs no separator above it.
    items[0] = { ...items[0], separatorBefore: false }
    setMenu({ ...at, items })
  }

  const commitMenu = (c: Commit, at: MenuState): void => {
    // The local web server renders this commit for the system browser; the
    // URL is only meaningful while the repo stays open, so it is fetched at
    // click time rather than stashed.
    const openInBrowser = (): void => {
      void window.gitty.web.commitUrl(root, c.hash).then((url) => {
        if (url) void window.gitty.file.openExternal(url)
      })
    }
    const copyUrl = (): void => {
      void window.gitty.web.commitUrl(root, c.hash).then((url) => {
        if (url) void window.gitty.clipboard.write(url)
      })
    }
    const items: MenuItem[] = [
      { label: msg.contextMenu.showCommitDiff, accel: msg.contextMenu.showCommitDiffAccel, action: () => showCommit(c) },
      {
        label: msg.contextMenu.copyCommitHash,
        separatorBefore: true,
        action: () => void window.gitty.clipboard.write(c.hash)
      },
      { label: msg.contextMenu.copyShortHash, action: () => void window.gitty.clipboard.write(c.short) },
      { label: msg.contextMenu.copySubject, action: () => void window.gitty.clipboard.write(c.subject) },
      {
        label: msg.contextMenu.openInBrowser,
        separatorBefore: true,
        action: openInBrowser
      },
      { label: msg.contextMenu.copyCommitUrl, action: copyUrl }
    ]
    // Only when the remote's own page for this commit could be worked out —
    // there is no page to offer for a repository nobody hosts, and none for a
    // commit that has not left this machine.
    if (remoteBases && !unpushed.has(c.hash)) {
      items.push({
        label: msg.contextMenu.openRemoteUrl,
        action: () => void window.gitty.file.openExternal(remoteBases.commit + c.hash)
      })
    }
    items.push(
      {
        label: msg.contextMenu.browseSnapshot,
        separatorBefore: true,
        action: () => showSnapshot(c)
      }
    )
    if (selectedCommit && selectedCommit !== c.hash) {
      items.push({
        label: msg.contextMenu.diffAgainstSelected,
        accel: msg.contextMenu.diffAgainstAccel,
        separatorBefore: true,
        action: () => onSelectCommit(c.hash, true)
      })
    }
    setMenu({ ...at, items })
  }

  const worktreeMenu = (at: MenuState): void => {
    setMenu({
      ...at,
      items: [
        {
          label: msg.contextMenu.browseWorktree,
          accel: BROWSE_ACCEL,
          action: browseWorktree
        },
        {
          // For the case the terminal pane cannot serve: an agent being
          // talked to in another window entirely.
          label: msg.contextMenu.copyStagedDiff,
          separatorBefore: true,
          action: copyStagedDiff
        }
      ]
    })
  }

  return { diffMenu, diffFileMenu, fileMenu, docMenu, dirMenu, treeMenu, commitMenu, worktreeMenu }
}
