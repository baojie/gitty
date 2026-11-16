import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { highlightLines, languageFor } from '../highlight'
import { outlineLanguage, outlineOf, type CodeSymbol } from '../symbols'
import type { MenuState } from './ContextMenu'
import { useMsg } from '../locale'
import { useFind } from './useFind'

/** Lines rendered before the first scroll, and added each time the end nears. */
const CHUNK = 1500

/** The symbol tree as one list, each entry carrying the depth it was found at. */
function flatten(syms: CodeSymbol[], depth = 0): { sym: CodeSymbol; depth: number }[] {
  return syms.flatMap((sym) => [{ sym, depth }, ...flatten(sym.children, depth + 1)])
}

/** Whole-file viewer with line numbers and syntax highlighting. */
export function CodePane({
  source,
  docKey,
  root,
  path,
  wrap,
  outline,
  folds,
  active,
  gotoLine,
  onMenu
}: {
  source: string
  /** Identifies the document, not its text; changes only on opening another. */
  docKey: string
  /** Only for the outline's panel id, which is per repository. */
  root: string
  /** Used only to pick the language. */
  path: string
  wrap: boolean
  /** Show the symbol outline beside the file. */
  outline: boolean
  /**
   * Where the document's containers open and close, as opening line → closing
   * line. Only a document whose shape was worked out while it was written has
   * any — the formatted JSON — and only then are the fold arrows drawn. Text
   * whose nesting is a guess gets none: a fold that hides the wrong lines is
   * worse than no fold.
   */
  folds?: ReadonlyMap<number, number>
  /** On screen in the active tab, so Ctrl+F belongs to this view. */
  active: boolean
  /** 1-based line to open at, when the file was opened from a search hit. */
  gotoLine?: number
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg } = useMsg()
  const language = useMemo(() => languageFor(path), [path])
  const lines = useMemo(() => highlightLines(source, language), [source, language])
  // Only worth computing while the outline is on: it walks the whole file, and
  // most files are opened to be read rather than navigated.
  const symbols = useMemo(
    () => (outline ? flatten(outlineOf(source, outlineLanguage(path))) : []),
    [outline, source, path]
  )
  // The prop objects, not just the strings: React sets innerHTML whenever the
  // dangerouslySetInnerHTML prop is a different object, so a literal per render
  // would rebuild every line on every state change — and take the find Ranges
  // with it. See MarkdownPane, which has the same rule for the whole document.
  const bodies = useMemo(() => lines.map((h) => ({ __html: h || ' ' })), [lines])
  const hostRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(CHUNK)

  // Which containers the reader has folded away, by the line their opening
  // bracket sits on.
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set())

  const toggle = useCallback((line: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(line)) next.add(line)
      return next
    })
  }, [])

  // The lines a fold takes off the screen: everything after the line that
  // opens the container, its closing bracket included. What is left is the
  // opening line with a … after it, which is the row the arrow reopens.
  const hidden = useMemo(() => {
    if (!folds || collapsed.size === 0) return null
    const h = new Set<number>()
    for (const open of collapsed) {
      const close = folds.get(open)
      if (close === undefined) continue
      for (let n = open + 1; n <= close; n++) h.add(n)
    }
    return h
  }, [folds, collapsed])

  // Another document, or the same one read again after the repository changed:
  // the line a fold named is not necessarily the line it names now, so nothing
  // stays folded across a new set of ranges.
  useEffect(() => setCollapsed(new Set()), [folds])

  const scrollTop = useRef(0)

  // Rewinding to the top belongs to opening a document, not to its text
  // changing underneath: a work-tree file is re-read on every repository
  // change, and dropping the loaded chunks would strand the reader too.
  useLayoutEffect(() => {
    scrollTop.current = 0
    setShown(CHUNK)
    if (hostRef.current) hostRef.current.scrollTop = 0
  }, [docKey])

  // Opened from a search hit: render far enough to hold the line, then put it
  // in the middle of the pane and mark it. Once only — scrolling away from it
  // afterwards is the reader's business, and re-running on every render would
  // drag them back.
  const jumped = useRef('')
  useLayoutEffect(() => {
    if (!gotoLine || jumped.current === docKey) return
    if (gotoLine > shown) {
      setShown(Math.min(lines.length, gotoLine + CHUNK))
      return
    }
    jumped.current = docKey
    hostRef.current
      ?.querySelector(`[data-line="${gotoLine}"]`)
      ?.scrollIntoView({ block: 'center' })
  }, [gotoLine, docKey, shown, lines.length])

  // Re-rendering the lines clamps the scroll when the file got shorter; put
  // the reader back. The reset above has already zeroed the remembered
  // position when the document itself changed.
  useLayoutEffect(() => {
    const el = hostRef.current
    if (el && el.scrollTop !== scrollTop.current) el.scrollTop = scrollTop.current
  }, [lines, shown])

  // Which symbol the outline marks — the last one to have started above the
  // top of the pane — as a line number, since that is what identifies a row.
  const [currentSymbol, setCurrentSymbol] = useState<number | null>(null)

  useEffect(() => setCurrentSymbol(null), [docKey])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const onScroll = (): void => {
      scrollTop.current = el.scrollTop
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 600) {
        setShown((n) => (n >= lines.length ? n : n + CHUNK))
      }
      if (symbols.length === 0) return
      // Ask the document which row is at the top rather than measuring every
      // symbol's row: word wrap makes heights variable, so there is nothing to
      // compute from, and a file can hold hundreds of symbols to measure.
      const box = el.getBoundingClientRect()
      const row = document
        .elementFromPoint(box.left + 6, box.top + 6)
        ?.closest?.('.code-line') as HTMLElement | null
      const line = Number(row?.dataset.line)
      if (!line) return
      let at: number | null = null
      for (const { sym } of symbols) {
        if (sym.line > line) break
        at = sym.line
      }
      setCurrentSymbol(at)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [lines.length, symbols])

  // A symbol clicked in the outline, held until its line has been rendered:
  // the file is drawn in chunks, and the row may be thousands of lines past
  // the end of the last one.
  const [wanted, setWanted] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (wanted === null) return
    if (wanted > shown) {
      setShown(Math.min(lines.length, wanted + CHUNK))
      return
    }
    hostRef.current?.querySelector(`[data-line="${wanted}"]`)?.scrollIntoView({ block: 'start' })
    setCurrentSymbol(wanted)
    setWanted(null)
  }, [wanted, shown, lines.length])

  // A search covers the file, not the part of it scrolled to so far, so the
  // chunks still to come are rendered as the strip opens.
  const revealAll = useCallback(() => setShown(lines.length), [lines.length])
  const find = useFind({
    hostRef,
    active,
    // Folding changes which lines are in the document, not just how many have
    // been rendered, and a Range into a line that is gone points at nothing.
    contentKey: `${shown}:${[...collapsed].join(',')}`,
    resetKey: docKey,
    onOpen: revealAll
  })

  const nav = (
    <nav className="md-outline">
      <div className="md-outline-title">{msg.diff.outline}</div>
      {symbols.map(({ sym, depth }) => (
        <div
          key={`${sym.line}:${sym.name}`}
          className={`md-toc-item sym sym-${sym.kind} lvl-${Math.min(depth + 1, 6)}${
            currentSymbol === sym.line ? ' active' : ''
          }`}
          title={`${sym.name} — ${sym.kind}`}
          onClick={() => setWanted(sym.line)}
        >
          {sym.name}
        </div>
      ))}
    </nav>
  )

  const body = (
    <div
      className={`pane-body code${wrap ? ' wrap' : ''}${find.open ? ' finding' : ''}`}
      ref={hostRef}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu({ x: e.clientX, y: e.clientY, items: [] })
      }}
    >
      {lines.slice(0, shown).map((_, i) => {
        const n = i + 1
        if (hidden?.has(n)) return null
        // Undefined for a line that opens nothing, which is most of them; the
        // arrow's column is still drawn, or the text would step sideways from
        // one line to the next.
        const close = folds?.get(n)
        const shut = collapsed.has(n)
        return (
          <div
            key={i}
            className={`code-line${gotoLine === n ? ' hit' : ''}${shut ? ' folded' : ''}`}
            data-line={n}
          >
            {folds && (
              <span
                className={`code-fold${close === undefined ? '' : ' foldable'}`}
                title={
                  close === undefined ? undefined : shut ? msg.diff.unfoldNode : msg.diff.foldNode
                }
                onClick={close === undefined ? undefined : () => toggle(n)}
              >
                {close === undefined ? '' : shut ? '▶' : '▼'}
              </span>
            )}
            <span className="code-gutter">{n}</span>
            <span className="code-text" dangerouslySetInnerHTML={bodies[i]} />
            {shut && <span className="code-fold-mark">…</span>}
          </div>
        )
      })}
      {shown < lines.length && (
        <div className="diff-more" onClick={() => setShown((n) => n + CHUNK)}>
          {msg.diff.loadMoreLines(lines.length - shown)}
        </div>
      )}
    </div>
  )

  return (
    <div className="find-host">
      {find.bar}
      {symbols.length > 0 ? (
        // The width is shared by every file in this repository rather than kept
        // per document: it is a reading preference, not a property of the file.
        // Disabled while the tab is hidden — the library hit-tests every
        // registered group, and a display:none one reports a zero-sized rect.
        <Group
          orientation="horizontal"
          className="md-split"
          id={`code-outline-${root.replace(/[^A-Za-z0-9_-]/g, '_')}`}
          disabled={!active}
        >
          <Panel className="md-pane" defaultSize="22%" minSize="8%" maxSize="50%">
            {nav}
          </Panel>
          <Separator className="sep-v" />
          <Panel className="md-pane" minSize="30%">
            {body}
          </Panel>
        </Group>
      ) : (
        body
      )}
    </div>
  )
}
