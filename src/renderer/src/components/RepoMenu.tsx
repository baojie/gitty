import { useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import { filterRecent, RECENT_SHOWN } from '../recentFilter'

/**
 * The title bar's repository menu: the recent repositories, a box to search
 * them, and Open / Clear below.
 *
 * Its own component rather than a `ContextMenu` because it holds an input —
 * the generic menu closes on any key it does not know and has no focus of its
 * own. It keeps that menu's look (`.ctx`) and its mouse grammar: click opens in
 * a new tab, Ctrl+click or middle-click in the current one, × or right-click
 * forgets. The keyboard follows the quick-open box: arrows move, Enter opens,
 * Ctrl+Enter opens in the current tab, Escape closes.
 *
 * The list holds up to a hundred entries; only the most recent few are shown
 * until More is clicked or something is typed, which searches all of them.
 */
export function RepoMenu({
  x,
  y,
  list,
  labelOf,
  shortPath,
  onOpen,
  onForget,
  onPick,
  onClear,
  onClose
}: {
  x: number
  y: number
  /** Most recent first, without the repository the active tab shows. */
  list: string[]
  labelOf: (path: string) => string
  /** The entry's parent directory, home-relative, shown beside its name. */
  shortPath: (path: string) => string
  onOpen: (path: string, inActiveTab: boolean) => void
  onForget: (path: string) => void
  onPick: () => void
  onClear: () => void
  onClose: () => void
}): JSX.Element {
  const { msg } = useMsg()
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [cursor, setCursor] = useState(0)

  const matches = useMemo(
    () => filterRecent(list, labelOf, query, shortPath),
    [list, labelOf, query, shortPath]
  )
  // Searching reaches every entry; an empty box shows the head until More.
  const capped = !expanded && !query.trim() && matches.length > RECENT_SHOWN
  const shown = capped ? matches.slice(0, RECENT_SHOWN) : matches

  useEffect(() => setCursor(0), [query])

  // Clamped to the window once its size is known, and again when More grows it.
  useLayoutEffect(() => {
    if (!ref.current) return
    const { width, height } = ref.current.getBoundingClientRect()
    setPos({
      x: Math.max(4, Math.min(x, window.innerWidth - width - 4)),
      y: Math.max(4, Math.min(y, window.innerHeight - height - 4))
    })
  }, [x, y, expanded, shown.length])

  useEffect(() => {
    const close = (): void => onClose()
    window.addEventListener('mousedown', close)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('resize', close)
    }
  }, [onClose])

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const open = (p: string, inActiveTab: boolean): void => {
    onOpen(p, inActiveTab)
    onClose()
  }

  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, shown.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const p = shown[cursor]
      if (p) open(p, e.ctrlKey || e.metaKey)
    }
    // Keys reach the window's shortcuts otherwise — Ctrl+O, the pane chords.
    e.stopPropagation()
  }

  return (
    <div
      ref={ref}
      className="ctx repo-menu"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onKey}
    >
      {list.length > 0 && (
        <input
          className="repo-menu-search"
          autoFocus
          spellCheck={false}
          placeholder={msg.recent.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div ref={listRef} className="repo-menu-list">
        {shown.map((p, i) => (
          <div
            key={p}
            data-index={i}
            className={`ctx-item${i === cursor ? ' selected' : ''}`}
            title={`${p}${msg.recent.tooltip}`}
            onMouseMove={() => setCursor(i)}
            onClick={(e) => open(p, e.ctrlKey || e.metaKey)}
            onAuxClick={(e) => {
              if (e.button !== 1) return
              e.preventDefault()
              open(p, true)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              onForget(p)
            }}
          >
            {/* A tab's custom name follows the repository here, so the one
                name names it everywhere; the path is still beside it. */}
            <span>{labelOf(p)}</span>
            <span className="accel">{shortPath(p)}</span>
            <button
              className="ctx-remove"
              title={msg.recent.forget}
              onClick={(e) => {
                e.stopPropagation()
                onForget(p)
              }}
            >
              ×
            </button>
          </div>
        ))}
        {list.length === 0 && <div className="ctx-item ctx-note">{msg.recent.noOtherRepos}</div>}
        {list.length > 0 && shown.length === 0 && (
          <div className="ctx-item ctx-note">{msg.recent.noMatch}</div>
        )}
        {capped && (
          <div
            className="ctx-item ctx-more"
            title={msg.recent.moreTitle}
            onClick={() => setExpanded(true)}
          >
            <span>{msg.recent.more(matches.length - RECENT_SHOWN)}</span>
          </div>
        )}
      </div>
      <div className="ctx-sep" />
      <div
        className="ctx-item"
        onClick={() => {
          onPick()
          onClose()
        }}
      >
        <span>{msg.recent.openRepoEllipsis}</span>
        <span className="accel">{msg.recent.accelOpen}</span>
      </div>
      {list.length > 0 && (
        <div
          className="ctx-item"
          onClick={() => {
            onClear()
            onClose()
          }}
        >
          <span>{msg.recent.clearRecent}</span>
        </div>
      )}
    </div>
  )
}
