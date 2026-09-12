import { useEffect, useMemo, useRef, type JSX } from 'react'
import { column, layoutLanes, MAX_LANES, type LaneRow } from '../lanes'
import { kinship } from '../kin'
import type { Commit, LogFilterMode } from '../../../shared/types'
import type { MenuState } from './ContextMenu'
import { useMsg } from '../locale'
import { fmtDateTimeZone, stamp, useTime } from '../time'

/** Pseudo-hash of the row that stands for the uncommitted changes. The row
 *  reads "Changes"; the constant keeps the internal `worktree` name. */
export const WORKTREE_ROW = '__worktree__'

/** Horizontal distance between two lanes, in the graph's own units. */
const LANE_W = 8

/** The row box the graph is drawn into. Its height scales to the real row. */
const ROW_H = 20

/**
 * One row of the graph.
 *
 * Drawn per row rather than as one tall SVG down the side, so a row can be
 * added, removed or re-ordered without redrawing the rest — and so the graph
 * scrolls with the list for free instead of being positioned against it.
 *
 * The viewBox is a fixed 20 units tall while the element takes the real row
 * height, which the row-height setting moves between 18 and 26: lines and a
 * dot survive that scaling, and nothing here is a shape that would not.
 */
function GraphCell({ row, lanes }: { row: LaneRow; lanes: number }): JSX.Element {
  const width = Math.max(1, lanes) * LANE_W
  const x = (lane: number): number => column(lane) * LANE_W + LANE_W / 2
  const mid = ROW_H / 2
  const hue = (lane: number): string => `var(--lane-${column(lane) % 6})`
  return (
    <svg
      className="commit-graph"
      width={width}
      viewBox={`0 0 ${width} ${ROW_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {row.through.map((lane) => (
        <line
          key={`t${lane}`}
          x1={x(lane)}
          y1={0}
          x2={x(lane)}
          y2={ROW_H}
          stroke={hue(lane)}
        />
      ))}
      {row.incoming && (
        <line x1={x(row.lane)} y1={0} x2={x(row.lane)} y2={mid} stroke={hue(row.lane)} />
      )}
      {row.edges.map((e, i) =>
        e.from === e.to ? (
          <line key={i} x1={x(e.from)} y1={mid} x2={x(e.to)} y2={ROW_H} stroke={hue(e.to)} />
        ) : (
          // A parent in another lane leaves as a curve, so which line goes
          // where is readable where several cross in one row.
          <path
            key={i}
            d={`M${x(e.from)},${mid} C${x(e.from)},${ROW_H} ${x(e.to)},${mid} ${x(e.to)},${ROW_H}`}
            fill="none"
            stroke={hue(e.to)}
          />
        )
      )}
      <circle cx={x(row.lane)} cy={mid} r={3} fill={hue(row.lane)} />
      {/* A lane past the cap shares the last column; the ring says so. */}
      {row.lane >= MAX_LANES && (
        <circle cx={x(row.lane)} cy={mid} r={5} fill="none" stroke={hue(row.lane)} />
      )}
    </svg>
  )
}

export function LogPane({
  commits,
  graph,
  selected,
  compare,
  changedCount,
  filterOpen,
  onCloseFilter,
  filter,
  onFilter,
  filterMode,
  onFilterMode,
  searching,
  onSelect,
  onEnter,
  onMenu,
  onWorktreeMenu,
  onScrollEnd
}: {
  commits: Commit[]
  /** Draw the lane graph beside the hashes. */
  graph: boolean
  selected: string | null
  compare: string | null
  /** Number of uncommitted changes, shown on the Changes row. */
  changedCount: number
  /** The filter strip is only on screen while the header button is on. */
  filterOpen: boolean
  /** Puts the strip away, which also drops the filter — see RepoTab. */
  onCloseFilter: () => void
  /** The commit filter, narrowed in git; '' shows all. */
  filter: string
  onFilter: (value: string) => void
  /** What the filter searches: the message, or the diffs themselves. */
  filterMode: LogFilterMode
  onFilterMode: (mode: LogFilterMode) => void
  /** A pickaxe search is running; it reads every diff in the history. */
  searching: boolean
  onSelect: (hash: string, additive: boolean) => void
  onEnter: (hash: string) => void
  onMenu: (commit: Commit, state: MenuState) => void
  onWorktreeMenu: (state: MenuState) => void
  onScrollEnd: () => void
}): JSX.Element {
  const { msg, locale } = useMsg()
  const time = useTime()
  const listRef = useRef<HTMLDivElement>(null)
  // Recomputed over the whole loaded list, which is what keeps the first page
  // identical once the second arrives — see lanes.ts.
  const lanes = useMemo(() => (graph ? layoutLanes(commits) : null), [graph, commits])

  /**
   * The selected commit's ancestry, which is the one relation the rows cannot
   * show by position: the row above may be on another branch, and a parent may
   * sit a hundred rows down. Kin stay as they are and everything else recedes,
   * so what the selection is built on — and what was built on it — reads off
   * the list. Recomputed on every selection, which is one pass over the loaded
   * window.
   */
  const kin = useMemo(
    // Not under a filter: those rows are a subset picked by a match, so the
    // chains between them are missing and almost everything would come out
    // unrelated — which would say "no kin" where the truth is "the rows in
    // between are not on screen".
    () => (filter ? null : kinship(commits, selected)),
    [commits, selected, filter]
  )

  /**
   * Rows whose date is later than the row above them. The log is ordered by
   * the author date, but a parent is always drawn below its children, so a
   * commit replayed onto newer work — rebased, cherry-picked, `am`'d — sits
   * among rows it predates and the column stops reading downwards. Marking
   * the row is all that can be done: re-sorting past the ancestry would draw
   * the lanes running backwards.
   *
   * Not under a filter, where the row above is not the commit before this one
   * and a date going backwards says only that the rows in between did not
   * match.
   */
  const backwards = useMemo(() => {
    if (filter) return commits.map(() => false)
    const times = commits.map((c) => Date.parse(c.date))
    return times.map((t, i) => i > 0 && !Number.isNaN(t) && !Number.isNaN(times[i - 1]) && t > times[i - 1])
  }, [commits, filter])
  // The Changes row sits above the log and takes part in keyboard navigation.
  const hashes = [WORKTREE_ROW, ...commits.map((c) => c.hash)]
  const index = hashes.indexOf(selected ?? '')

  // Keep the cursor row in view when it moves by keyboard.
  useEffect(() => {
    const el = listRef.current?.querySelector('.commit-row.selected')
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const move = (delta: number): void => {
    const next = Math.min(Math.max((index < 0 ? 0 : index) + delta, 0), hashes.length - 1)
    onSelect(hashes[next], false)
  }

  return (
    <>
      {filterOpen && (
        <div className="log-filter">
          {/* The mode sits before the box, because it changes what typing into
              the box means. */}
          <select
            className="log-filter-mode"
            value={filterMode}
            title={msg.log.filterModeTitle}
            onChange={(e) => onFilterMode(e.target.value as LogFilterMode)}
          >
            <option value="text">{msg.log.filterModeText}</option>
            <option value="content">{msg.log.filterModeContent}</option>
            <option value="regex">{msg.log.filterModeRegex}</option>
          </select>
          <input
            type="text"
            autoFocus
            value={filter}
            placeholder={msg.log.filterPlaceholder}
            onChange={(e) => onFilter(e.target.value)}
            onKeyDown={(e) => {
              // Escape puts the strip away and the whole log back.
              if (e.key === 'Escape') {
                e.stopPropagation()
                onCloseFilter()
              }
            }}
            spellCheck={false}
          />
          {searching && <span className="log-filter-busy">{msg.log.searching}</span>}
          {/* One button, and it closes the strip: a filter left behind an
              unopened strip would hide commits with nothing on screen saying
              why. */}
          <button className="log-filter-clear" title={msg.log.clearFilter} onClick={onCloseFilter}>
            ✕
          </button>
        </div>
      )}
      <div
        ref={listRef}
        className="pane-body"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'j') {
            e.preventDefault()
            move(1)
          } else if (e.key === 'ArrowUp' || e.key === 'k') {
            e.preventDefault()
            move(-1)
          } else if (e.key === 'PageDown') {
            e.preventDefault()
            move(20)
          } else if (e.key === 'PageUp') {
            e.preventDefault()
            move(-20)
          } else if (e.key === 'Home') {
            e.preventDefault()
            move(-commits.length)
          } else if (e.key === 'End') {
            e.preventDefault()
            move(commits.length)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (selected) onEnter(selected)
          } else if (e.key === ' ') {
            e.preventDefault()
            if (selected) onSelect(selected, true)
          }
        }}
        onScroll={(e) => {
          const el = e.currentTarget
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) onScrollEnd()
        }}
      >
        <div
          className={`commit-row worktree-row${selected === WORKTREE_ROW ? ' selected' : ''}`}
          onClick={() => onSelect(WORKTREE_ROW, false)}
          onContextMenu={(e) => {
            e.preventDefault()
            onWorktreeMenu({ x: e.clientX, y: e.clientY, items: [] })
          }}
          title={msg.log.worktreeRowTitle}
        >
          {lanes && <GraphCell row={{ lane: 0, incoming: false, edges: [], through: [] }} lanes={lanes.lanes} />}
          <span className="commit-hash">●</span>
          <span className="commit-time">{msg.log.now}</span>
          <span className="commit-author">{msg.log.placeholder}</span>
          <span className="commit-subject">
            {msg.log.worktreeRow}
            <span className="dim">
              {changedCount === 0
                ? msg.log.worktreeClean
                : msg.log.worktreeUncommitted(changedCount)}
            </span>
          </span>
        </div>
        {commits.length === 0 && (
          <div className="empty">
            {searching ? msg.log.searching : filter ? msg.log.noMatches : msg.log.noCommitsYet}
          </div>
        )}
      {commits.map((c, i) => {
        const cls =
          c.hash === selected ? ' selected' : c.hash === compare ? ' compare' : ''
        const kinCls = !kin || c.hash === selected || c.hash === compare
          ? ''
          : kin.ancestors.has(c.hash)
            ? ' kin-ancestor'
            : kin.descendants.has(c.hash)
              ? ' kin-descendant'
              : ' kin-unrelated'
        return (
          <div
            key={c.hash}
            className={`commit-row${cls}${kinCls}`}
            onClick={(e) => {
              onSelect(c.hash, e.ctrlKey || e.metaKey || e.shiftKey)
            }}
            onDoubleClick={() => onEnter(c.hash)}
            onContextMenu={(e) => {
              e.preventDefault()
              onMenu(c, { x: e.clientX, y: e.clientY, items: [] })
            }}
            title={`${c.hash}\n${c.author} <${c.email}>\n${fmtDateTimeZone(c.date, locale, time)}\n\n${c.subject}`}
          >
            {lanes && <GraphCell row={lanes.rows[i]} lanes={lanes.lanes} />}
            <span className="commit-hash">{c.short}</span>
            <span
              className={`commit-time${backwards[i] ? ' out-of-order' : ''}`}
              title={backwards[i] ? msg.log.dateOutOfOrder : undefined}
            >
              {stamp(c.date, time, msg.time)}
            </span>
            <span className="commit-author">{c.author}</span>
            {c.refs && <span className="commit-refs">({c.refs})</span>}
            <span className="commit-subject">{c.subject}</span>
          </div>
        )
      })}
      </div>
    </>
  )
}
