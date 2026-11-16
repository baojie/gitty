import { useEffect, useMemo, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import { BlamePane } from './BlamePane'
import { CodePane } from './CodePane'
import { FileHistoryPane } from './FileHistoryPane'
import { GrepPane } from './GrepPane'
import { LineHistoryPane } from './LineHistoryPane'
import { HtmlPane } from './HtmlPane'
import { ImagePane } from './ImagePane'
import { PdfPane } from './PdfPane'
import { MarkdownPane } from './MarkdownPane'
import { formatJsonDoc } from '../json'
import { isHtmlPath, isImagePath, isJsonPath, isMarkdownPath, isPdfPath } from '../paths'
import type { MenuState } from './ContextMenu'
import type { Commit } from '../../../shared/types'

/** What kind of document a diff-pane tab holds. */
export type FileDocKind = 'file' | 'blame' | 'history' | 'lines' | 'grep'

/**
 * One document in the diff pane. `kind` picks the reader: `file` is a whole
 * file (work tree when `rev` is null, that commit otherwise), `blame` is
 * whole-file blame, `history` is the file's commit list. Each instance loads
 * its own contents, so several can be open beside a diff at once.
 */
export function FileDoc({
  root,
  path,
  rev,
  kind = 'file',
  preview,
  wrap,
  outline,
  lineNumbers,
  changedLines,
  active,
  reloadKey,
  onSource,
  onMenu,
  setMenu,
  onOpenCommit,
  onCompareRevs,
  range,
  onOpenHit,
  gotoLine,
  onLineHistory,
  onOpenPath,
  onOpenDir,
  anchor
}: {
  root: string
  path: string
  /** Revision to read from; null means the file on disk. */
  rev: string | null
  kind?: FileDocKind
  /** Render markdown instead of showing its source, or re-indent JSON
   *  instead of showing the file as it is stored (files only). */
  preview: boolean
  wrap: boolean
  /** Show the outline beside the document: headings for markdown, symbols for
   *  source. */
  outline: boolean
  /** Number markdown blocks with their source lines. */
  lineNumbers: boolean
  /** New-side source lines the diff on screen marks as added; a rendered
   *  markdown's gutter numbers for those lines are drawn green. */
  changedLines?: Set<number> | null
  /** On screen in the active tab, so document-level keys belong to it. */
  active: boolean
  /** Bumped when the repository changes, to re-read a work-tree file. */
  reloadKey: number
  /** Reports the loaded text, so the context menu can copy it. */
  onSource: (text: string | null) => void
  onMenu: (state: MenuState) => void
  /** Sets the context menu directly; blame rows build their own items. */
  setMenu: (state: MenuState) => void
  /** History rows hand the picked commit back here. */
  onOpenCommit?: (c: Commit) => void
  /** Two revisions picked in the history: this file's diff between them. */
  onCompareRevs?: (from: string, to: string) => void
  /** The lines a `lines` document follows; unused by every other kind. */
  range?: { start: number; end: number }
  /** A search hit opens the file it names, at the line it names. */
  onOpenHit?: (path: string, line: number) => void
  /** 1-based line this file was opened at, from a search hit. */
  gotoLine?: number
  /** A blame row asks for the history of the lines under the selection. */
  onLineHistory?: (start: number, end: number) => void
  /** Ctrl+click on a rendered markdown link into this repository. */
  onOpenPath?: (path: string, rev: string | null, anchor?: string) => void
  /** A markdown link that names a directory, Ctrl+clicked. */
  onOpenDir?: (path: string, rev: string | null) => void
  /** Heading to open a rendered document at, from a link's `#fragment`. */
  anchor?: string
}): JSX.Element {
  const { msg } = useMsg()
  const [source, setSource] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const image = isImagePath(path)
  // A PDF is binary like an image, and read by its own viewer for the same
  // reason: there is no text under it to fall back to.
  const pdf = isPdfPath(path)

  // Blame and history have no file contents to copy from the context menu.
  useEffect(() => {
    if (kind !== 'file') onSource(null)
  }, [kind, onSource])

  useEffect(() => {
    // An image is never read as text: `readWorking` would only call it binary.
    // Nor is a PDF, nor anything but a file document — the others fetch their
    // own.
    if (image || pdf || kind !== 'file') return
    let cancelled = false
    void (async () => {
      try {
        const r = rev
          ? await window.gitty.git.snapshotFile(root, rev, path)
          : await window.gitty.git.readWorking(root, path)
        if (cancelled) return
        setSource(r.binary ? null : r.content)
        setError(r.binary ? msg.common.binaryOrOversized : null)
      } catch (e) {
        if (cancelled) return
        setSource(null)
        setError(String(e))
      }
    })()
    return () => {
      cancelled = true
    }
    // A file read from a revision never changes; only work-tree files reload.
  }, [image, pdf, root, path, rev, rev === null ? reloadKey : 0, msg])

  // Neither an image nor a PDF has text to copy from the context menu.
  useEffect(() => onSource(image || pdf ? null : source), [image, pdf, source, onSource])

  // The JSON re-indented, or null wherever there is none to show that way —
  // another kind of file, the button raised, or text that does not parse (a
  // template with placeholders in it, a half-finished edit). Then the file is
  // shown as it is stored rather than the pane emptying. A hook, so it sits
  // above the early returns below with every other one.
  const formatted = useMemo(
    () => (source !== null && preview && isJsonPath(path) ? formatJsonDoc(source) : null),
    [preview, path, source]
  )

  if (kind === 'lines') {
    return (
      <LineHistoryPane
        root={root}
        path={path}
        rev={rev}
        start={range?.start ?? 1}
        end={range?.end ?? range?.start ?? 1}
        wrap={wrap}
        active={active}
        onMenu={onMenu}
      />
    )
  }
  if (kind === 'grep') {
    return (
      <GrepPane
        root={root}
        pattern={path}
        rev={rev}
        active={active}
        onOpen={onOpenHit ?? (() => undefined)}
        onMenu={onMenu}
      />
    )
  }
  if (kind === 'blame') {
    return (
      <BlamePane
        root={root}
        path={path}
        rev={rev}
        active={active}
        setMenu={setMenu}
        onLineHistory={onLineHistory}
      />
    )
  }
  if (kind === 'history') {
    return (
      <FileHistoryPane
        root={root}
        path={path}
        rev={rev}
        active={active}
        onOpenCommit={onOpenCommit ?? (() => undefined)}
        onCompare={onCompareRevs ?? (() => undefined)}
        onMenu={onMenu}
      />
    )
  }

  if (image) {
    return <ImagePane root={root} path={path} rev={rev} reloadKey={reloadKey} onMenu={onMenu} />
  }

  if (pdf) {
    return <PdfPane root={root} path={path} rev={rev} reloadKey={reloadKey} onMenu={onMenu} />
  }

  if (source === null) {
    return (
      <div className="pane-body">
        <div className="empty">{error ?? msg.common.loading}</div>
      </div>
    )
  }

  // Which document this is, as opposed to what it currently says: a work-tree
  // file is re-read on every repository change, and the viewers must tell
  // "the reader opened something else" from "the text underneath them moved".
  const docKey = `${rev ?? ''}:${path}`


  return preview && isMarkdownPath(path) ? (
    <MarkdownPane
      source={source}
      docKey={docKey}
      root={root}
      docPath={path}
      rev={rev}
      outline={outline}
      lineNumbers={lineNumbers}
      changedLines={changedLines}
      wrap={wrap}
      active={active}
      onMenu={onMenu}
      onOpenPath={onOpenPath}
      onOpenDir={onOpenDir}
      anchor={anchor}
    />
  ) : preview && isHtmlPath(path) ? (
    <HtmlPane source={source} docKey={docKey} wrap={wrap} active={active} onMenu={onMenu} />
  ) : (
    <CodePane
      source={formatted?.text ?? source}
      folds={formatted?.folds}
      docKey={docKey}
      root={root}
      path={path}
      wrap={wrap}
      outline={outline}
      active={active}
      gotoLine={gotoLine}
      onMenu={onMenu}
    />
  )
}
