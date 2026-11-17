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
 * Ctrl+Enter opens in the current tab, Escape closes, and Ctrl+O — the chord
 * that opened it — goes on to Open Repository….
 *
 * The list holds up to a hundred entries; only the most recent few are shown
 * until More is clicked or something is typed, which searches all of them.
 *
 * A search the list cannot answer goes to disk: `onGuess` looks for a
 * repository of that name where the remembered ones live, and the menu offers
 * what it finds under a question rather than opening it — the pick is the
 * confirmation.
 */
export function RepoMenu({
  x,
  y,
  up = false,
  list,
  labelOf,
  shortPath,
  onOpen,
  onForget,
  onPick,
  onClear,
  onGuess,
  onClose
}: {
  x: number
  y: number
  /** `y` is where the menu's bottom goes rather than its top. */
  up?: boolean
  /** Most recent first, without the repository the active tab shows. */
  list: string[]
  labelOf: (path: string) => string
  /** The entry's parent directory, home-relative, shown beside its name. */
  shortPath: (path: string) => string
  onOpen: (path: string, inActiveTab: boolean) => void
  onForget: (path: string) => void
  onPick: () => void
  onClear: () => void
  /** Repositories on disk named like the query, outside the list. */
  onGuess: (query: string) => Promise<string[]>
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
  const shownRecent = capped ? matches.slice(0, RECENT_SHOWN) : matches

  // The guesses for one query; `null` while the disk is still being searched.
  const [guessed, setGuessed] = useState<{
    query: string
    found: string[] | null
  } | null>(null)
  const trimmed = query.trim()
  const guessing = trimmed !== '' && matches.length === 0
  useEffect(() => {
    if (!guessing) return
    let live = true
    setGuessed({ query: trimmed, found: null })
    // Typed out, not keystroke by keystroke: each search reads directories.
    const timer = window.setTimeout(() => {
      void onGuess(trimmed).then((found) => {
        if (live) setGuessed({ query: trimmed, found })
      })
    }, 250)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [guessing, trimmed, onGuess])
  const guesses = guessing && guessed?.query === trimmed ? guessed.found : null
  const shown = guessing ? (guesses ?? []) : shownRecent

  useEffect(() => setCursor(0), [query, guesses])

  // Clamped to the window once its size is known, and again when More grows it.
  useLayoutEffect(() => {
    if (!ref.current) return
    const { width, height } = ref.current.getBoundingClientRect()
    setPos({
      x: Math.max(4, Math.min(x, window.innerWidth - width - 4)),
      y: Math.max(4, Math.min(up ? y - height : y, window.innerHeight - height - 4))
    })
  }, [x, y, up, expanded, shown.length, guessing])

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
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === 'KeyO') {
      // The chord that opened the menu, again: on to the native dialog.
      e.preventDefault()
      onPick()
      onClose()
    } else if (e.key === 'Escape') {
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
      <input
        className="repo-menu-search"
        autoFocus
        spellCheck={false}
        placeholder={msg.recent.searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {guessing && (
        <div className="ctx-item ctx-note">
          {guesses === null
            ? msg.recent.guessSearching
            : guesses.length === 0
              ? msg.recent.noMatch
              : msg.recent.guessQuestion}
        </div>
      )}
      <div ref={listRef} className="repo-menu-list">
        {shown.map((p, i) => (
          <div
            key={p}
            data-index={i}
            className={`ctx-item${i === cursor ? ' selected' : ''}`}
            title={`${p}${guessing ? msg.recent.guessTooltip : msg.recent.tooltip}`}
            onMouseMove={() => setCursor(i)}
            onClick={(e) => open(p, e.ctrlKey || e.metaKey)}
            onAuxClick={(e) => {
              if (e.button !== 1) return
              e.preventDefault()
              open(p, true)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              if (!guessing) onForget(p)
            }}
          >
            {/* A tab's custom name follows the repository here, so the one
                name names it everywhere; the path is still beside it. */}
            <span>{labelOf(p)}</span>
            <span className="accel">{shortPath(p)}</span>
            {!guessing && (
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
            )}
          </div>
        ))}
        {list.length === 0 && !trimmed && (
          <div className="ctx-item ctx-note">{msg.recent.noOtherRepos}</div>
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
