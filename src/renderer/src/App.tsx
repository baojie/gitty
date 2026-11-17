import { lazy, Suspense, useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { ContextMenu, type MenuItem, type MenuState } from './components/ContextMenu'
import { RepoMenu } from './components/RepoMenu'
import { PromptDialog } from './components/PromptDialog'
import { AboutPane } from './components/AboutPane'
import { HelpPane } from './components/HelpPane'
import { SettingsPane } from './components/SettingsPane'
import type { RepoTabHandle } from './RepoTab'
import { moveTab, renameTab, tabBasename, tabLabel } from './tabs'
import { usePreferences } from './prefs'

/** Shown in the Refresh button's tooltip; the keys RepoTab's handler refreshes on. */
const REFRESH_ACCEL = 'F5 / Ctrl+R'

/** Shown in the title bar's tooltip; the key that toggles the hidden menu bar. */
const MENU_ACCEL = 'Alt'

// macOS's menu bar is always on the screen, so Alt toggling it — the behaviour
// autoHideMenuBar gives Windows and Linux — is not a fact there.
const isMac = window.gitty.platform === 'darwin'

// The whole tab content is its own chunk, so the app shell — title bar, tab
// bar, empty state — paints before any pane code has loaded. The heavy panes
// inside it (terminal, opened files) are lazy again, one level down.
const RepoTab = lazy(() => import('./RepoTab').then((m) => ({ default: m.RepoTab })))
import {
  ALL_PANES,
  ALL_PANES_ACCEL,
  isOpenRepoChord,
  paneLabels,
  PANE_ORDER,
  paneAccel,
  visibleCount,
  type PaneId,
  type PaneVisibility
} from './panes'
import { navLabel, type NavHistory } from './nav'
import type { Branch, RepoStatus } from '../../shared/types'
import { LocaleProvider, loadLocale } from './locale'
import { PluginPrefsProvider } from './plugins'
import { TimeProvider } from './time'
import { copySelection, isCopyChord } from './copy'
import { ALL_LOCALES } from './locale'
import { getMessages } from './messages'

export default function App(): JSX.Element {
  const [roots, setRoots] = useState<string[]>([])
  const [active, setActive] = useState<string | null>(null)
  // Custom names for the tab bar, keyed by repository root; remembered.
  const [tabNames, setTabNames] = useState<Record<string, string>>(loadTabNames)
  const [statusByRoot, setStatusByRoot] = useState<Record<string, RepoStatus>>({})
  // Branch each tab is browsing; absent means its checked-out one. Kept here
  // rather than in RepoTab because the title bar is where it is chosen.
  const [browsingByRoot, setBrowsingByRoot] = useState<Record<string, string>>({})
  // Each tab's browsing history, reported up so the title bar's back, forward
  // and history buttons can act on the tab the user is looking at.
  const [navByRoot, setNavByRoot] = useState<Record<string, NavHistory>>({})
  const tabRefs = useRef<Record<string, RepoTabHandle | null>>({})

  // Preferences are app-wide: changing the theme or row height touches every
  // open repository's panes, so they are held above the tabs — in one hook,
  // which also owns storing them and putting them back.
  const prefs = usePreferences()
  const {
    locale,
    setLocale,
    wrap,
    setWrap,
    diffView,
    setDiffView,
    wordDiff,
    setWordDiff,
    mdOutline,
    setMdOutline,
    mdLineNumbers,
    pluginPrefs,
    setPluginPrefs,
    naturalSort,
    graph,
    setGraph,
    panes,
    setPanes,
    theme,
    fontSize,
    monoFont,
    restoreTabs,
    agentCommands,
    useAgentCommand,
    forgetAgentCommand,
    time,
    diffOptions,
    terminalOptions
  } = prefs
  const msg = getMessages(locale)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const agentCommand = agentCommands[0] ?? ''
  const [recent, setRecent] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  // The tab whose name is being typed, if the rename prompt is open.
  const [renameFor, setRenameFor] = useState<string | null>(null)
  // The drag in flight over the tab bar: which tab started it, and where the
  // pointer wants it to land. Dragover fires continuously, so `dropAt` is set
  // through a functional update that reuses the same object when nothing moved.
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropAt, setDropAt] = useState<{ index: number; after: boolean } | null>(null)
  // The four-pane icon, fetched from the main process as a data URL.
  const [appIcon, setAppIcon] = useState<string | null>(null)

  /* ---------- tab management ---------- */

  const openTab = useCallback(async (candidate: string, silent = false): Promise<boolean> => {
    const resolved = await window.gitty.repo.resolve(candidate)
    if (!resolved) {
      // A repository restored from the last session may simply be gone; that is
      // not something to complain about, it just does not reopen.
      if (!silent) setError(msg.app.notInWorkTreeHint(candidate))
      return false
    }
    setError(null)
    setRoots((prev) => (prev.includes(resolved) ? prev : [...prev, resolved]))
    setActive(resolved)
    await window.gitty.repo.watch(resolved)
    setRecent(await window.gitty.repo.remember(resolved))
    return true
  }, [msg])

  /** Replace the active tab's repository, keeping its position in the bar. */
  const openInActiveTab = useCallback(
    async (candidate: string): Promise<boolean> => {
      const resolved = await window.gitty.repo.resolve(candidate)
      if (!resolved) {
        setError(msg.app.notInWorkTree(candidate))
        return false
      }
      setError(null)
      const previous = active
      if (previous === resolved) return true
      // Already open in another tab: just go there rather than duplicating it.
      if (roots.includes(resolved)) {
        setActive(resolved)
        return true
      }
      setRoots((prev) =>
        previous && prev.includes(previous)
          ? prev.map((r) => (r === previous ? resolved : r))
          : [...prev, resolved]
      )
      setActive(resolved)
      await window.gitty.repo.watch(resolved)
      setRecent(await window.gitty.repo.remember(resolved))
      if (previous) {
        void window.gitty.repo.close(previous)
        setStatusByRoot((prev) => {
          const next = { ...prev }
          delete next[previous]
          return next
        })
        setBrowsingByRoot((prev) => {
          const next = { ...prev }
          delete next[previous]
          return next
        })
        setNavByRoot((prev) => {
          const next = { ...prev }
          delete next[previous]
          return next
        })
      }
      return true
    },
    [msg, active, roots]
  )

  const closeTab = useCallback(
    (root: string) => {
      void window.gitty.repo.close(root)
      setStatusByRoot((prev) => {
        const next = { ...prev }
        delete next[root]
        return next
      })
      setBrowsingByRoot((prev) => {
        const next = { ...prev }
        delete next[root]
        return next
      })
      setNavByRoot((prev) => {
        const next = { ...prev }
        delete next[root]
        return next
      })
      const i = roots.indexOf(root)
      if (i < 0) return
      const next = roots.filter((r) => r !== root)
      setRoots(next)
      if (next.length === 0) localStorage.setItem('gitty.roots', '[]')
      // Closing the active tab activates its neighbour; the last one leaves the
      // window on the empty state.
      if (active === root) setActive(next[Math.min(i, next.length - 1)] ?? null)
    },
    [roots, active]
  )

  /* ---------- dragging and renaming tabs ---------- */

  const startTabDrag = useCallback(
    (e: React.DragEvent, i: number) => {
      setDragIndex(i)
      e.dataTransfer.effectAllowed = 'move'
      // Firefox starts a drag only once a type has data in it.
      e.dataTransfer.setData('text/plain', roots[i])
    },
    [roots]
  )

  const endTabDrag = useCallback(() => {
    setDragIndex(null)
    setDropAt(null)
  }, [])

  /** Point at where the tab under the pointer would land: left or right half. */
  const overTab = useCallback(
    (e: React.DragEvent, i: number) => {
      if (dragIndex === null || dragIndex === i) {
        // Over the tab being dragged itself: no landing there, and keep the
        // drop effect from reaching the bar underneath.
        e.stopPropagation()
        setDropAt(null)
        return
      }
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const rect = e.currentTarget.getBoundingClientRect()
      const after = e.clientX > rect.left + rect.width / 2
      // Keep the same object while the pointer stays put, so React skips the
      // re-render a dragover every few pixels would otherwise cause.
      setDropAt((prev) => (prev && prev.index === i && prev.after === after ? prev : { index: i, after }))
    },
    [dragIndex]
  )

  const dropOnTab = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (dragIndex !== null && dropAt !== null) {
        setRoots((prev) => moveTab(prev, dragIndex, dropAt.index, dropAt.after))
      }
      endTabDrag()
    },
    [dragIndex, dropAt, endTabDrag]
  )

  const openTabMenu = useCallback(
    (e: React.MouseEvent, r: string) => {
      e.preventDefault()
      e.stopPropagation()
      setMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            label: msg.tab.rename,
            title: msg.tab.renameTitle,
            action: () => {
              setMenu(null)
              setRenameFor(r)
            }
          },
          {
            label: msg.contextMenu.openFolderInFileManager,
            action: () => void window.gitty.file.open(r)
          },
          {
            label: msg.tab.closeRepository,
            separatorBefore: true,
            action: () => closeTab(r)
          }
        ]
      })
    },
    [msg, closeTab]
  )

  const pickAndOpen = useCallback(() => {
    void window.gitty.repo.pick().then((p) => {
      if (p) void openTab(p)
    })
  }, [openTab])

  /* ---------- repository menu (recent + open) ---------- */

  // The menu is its own component (it holds a search box); it reads `recent`
  // live, so forgetting an entry updates it in place and several can go in a row.
  // `up` hangs it above its anchor, for the + at the foot of the window.
  const [repoMenuAt, setRepoMenuAt] = useState<{ x: number; y: number; up?: boolean } | null>(
    null
  )
  const repoButtonRef = useRef<HTMLButtonElement>(null)
  // Ctrl+O and + come here before the native dialog: a name typed into the
  // menu finds a repository, remembered or on disk, and Open Repository… —
  // or Ctrl+O again — is one step further. Ctrl+O drops it from the title
  // bar's repository button, or near the top when full screen hides that.
  const openRepoMenu = useCallback(() => {
    const r = repoButtonRef.current?.getBoundingClientRect()
    if (r && r.width > 0) setRepoMenuAt({ x: r.left, y: r.bottom + 2 })
    else setRepoMenuAt({ x: Math.max(4, window.innerWidth / 2 - 170), y: 48 })
  }, [])

  // Launch in the requested repository; if there is none — started from a
  // directory outside any work tree — fall back to the last one opened. Last
  // session's tabs are reopened first, so the requested repository is the one
  // left active whether or not it was among them.
  useEffect(() => {
    void (async () => {
      let restoredAny = false
      if (restoreTabs) {
        for (const saved of loadRoots()) {
          restoredAny = (await openTab(saved, true)) || restoredAny
        }
      }
      const initial = await window.gitty.repo.initial()
      if (await openTab(initial, restoredAny)) return
      if (restoredAny) return
      for (const previous of await window.gitty.repo.recent()) {
        if (await openTab(previous)) return
      }
    })()
    // Reopening is a startup decision; toggling the setting later must not
    // reopen anything under the user, so this deliberately runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTab])

  // Remember the open set for the next launch. Never the empty list: that is
  // what the app holds before the restore pass has opened anything, and React
  // remounts effects (StrictMode), so a "restored yet?" flag is not enough —
  // one replayed effect would erase the very session about to be reopened.
  // Closing the last tab is a deliberate act and writes the empty list itself.
  useEffect(() => {
    if (roots.length > 0) localStorage.setItem('gitty.roots', JSON.stringify(roots))
    // The main process asks before closing over several of them.
    window.gitty.repo.reportOpen(roots)
  }, [roots])

  // And once more as the window goes, so with several windows (Multiple
  // instances) the session kept is the one closed last, not the one whose
  // tabs happened to change last.
  const rootsRef = useRef(roots)
  rootsRef.current = roots
  useEffect(() => {
    const save = (): void => {
      if (rootsRef.current.length > 0) {
        localStorage.setItem('gitty.roots', JSON.stringify(rootsRef.current))
      }
    }
    window.addEventListener('pagehide', save)
    return () => window.removeEventListener('pagehide', save)
  }, [])

  // Ctrl+Shift+C copies as well, so the key does not change meaning when the
  // focus moves into a terminal — where Ctrl+C is the interrupt. App-wide
  // rather than per tab: the panes it covers belong to several of them.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!isCopyChord(e)) return
      // Nothing selected: leave the key alone rather than swallowing it.
      if (copySelection()) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => void window.gitty.appIcon().then(setAppIcon), [])

  const refreshActive = useCallback(() => {
    tabRefs.current[active ?? '']?.refresh()
  }, [active])

  const onStatus = useCallback((st: RepoStatus) => {
    setStatusByRoot((prev) => ({ ...prev, [st.root]: st }))
  }, [])

  const onNav = useCallback((root: string, h: NavHistory) => {
    setNavByRoot((prev) => ({ ...prev, [root]: h }))
  }, [])

  const activeStatus = active ? statusByRoot[active] ?? null : null
  const activeBrowsing = active ? browsingByRoot[active] ?? null : null

  /* ---------- browsing history of the active tab ---------- */

  const activeNav = active ? navByRoot[active] ?? null : null
  const canBack = activeNav !== null && activeNav.index > 0
  const canForward = activeNav !== null && activeNav.index < activeNav.places.length - 1

  const goBack = useCallback(() => {
    tabRefs.current[active ?? '']?.back()
  }, [active])
  const goForward = useCallback(() => {
    tabRefs.current[active ?? '']?.forward()
  }, [active])

  /** The places, most recent first — the order they are remembered in. */
  const openHistoryMenu = (x: number, y: number): void => {
    const items: MenuItem[] =
      activeNav && activeNav.places.length > 1
        ? activeNav.places
            .map((p, i) => ({
              label: `${i === activeNav.index ? '●' : ' '} ${navLabel(p, msg)}`,
              title: navLabel(p, msg),
              action: () => tabRefs.current[active ?? '']?.goTo(i)
            }))
            .reverse()
        : [{ label: msg.nav.noHistory, action: () => {} }]
    setMenu({ x, y, items })
  }

  useEffect(
    () =>
      window.gitty.repo.onMenuOpen(() => {
        openRepoMenu()
      }),
    [openRepoMenu]
  )

  // A second `gitty <repo>` handed its directory to this instance instead of
  // starting one of its own.
  useEffect(() => window.gitty.repo.onOpenExternal((repo) => void openTab(repo)), [openTab])

  useEffect(() => window.gitty.repo.onMenuSettings(() => setSettingsOpen(true)), [])

  useEffect(
    () =>
      window.gitty.repo.onMenuCloseRepo(() => {
        // The menu knows nothing about tabs; with none open there is nothing to close.
        if (active) closeTab(active)
      }),
    [active, closeTab]
  )

  useEffect(() => window.gitty.repo.onMenuRefresh(() => refreshActive()), [refreshActive])

  useEffect(() => window.gitty.repo.onMenuAbout(() => setAboutOpen(true)), [])

  useEffect(() => window.gitty.repo.onMenuShortcuts(() => setHelpOpen(true)), [])

  /* ---------- pane visibility ---------- */

  // The last visible pane cannot be hidden: an empty window would leave the
  // Panes menu as the only way back, which is easy to miss.
  const togglePane = useCallback((id: PaneId) => {
    setPanes((prev) => (prev[id] && visibleCount(prev) < 2 ? prev : { ...prev, [id]: !prev[id] }))
  }, [])

  // A view can come with a layout — browsing clears the window for reading,
  // Ctrl+D puts all four panes back — and the tab that switched view asks for
  // it, the record itself staying here with the other preferences.
  const setLayout = useCallback((next: PaneVisibility) => setPanes({ ...next }), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // Settings and About are app-wide; Escape closes them before any tab's
      // own unwinding.
      if (e.key === 'Escape' && (settingsOpen || aboutOpen || helpOpen)) {
        setSettingsOpen(false)
        setAboutOpen(false)
        setHelpOpen(false)
      } else if (e.key === 'F1') {
        // The one key every desktop application spends on help, and the only
        // place the whole set of shortcuts is written down inside the app.
        e.preventDefault()
        setHelpOpen((v) => !v)
      } else if (isOpenRepoChord(e)) {
        e.preventDefault()
        openRepoMenu()
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowLeft') {
        // The browser convention, and the only keys the panes leave free:
        // Alt+arrow walks the active tab's browsing history.
        e.preventDefault()
        goBack()
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowRight') {
        e.preventDefault()
        goForward()
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Digit0') {
        // Read from the code: with Shift down the key itself is punctuation.
        e.preventDefault()
        setPanes({ ...ALL_PANES })
      } else if ((e.ctrlKey || e.metaKey) && !e.altKey && /^[1-4]$/.test(e.key)) {
        // Ctrl+1..4 toggle the panes in layout order.
        e.preventDefault()
        togglePane(PANE_ORDER[Number(e.key) - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, aboutOpen, helpOpen, openRepoMenu, togglePane, goBack, goForward])

  const openPanesMenu = (x: number, y: number): void => {
    const items: MenuItem[] = PANE_ORDER.map((id) => ({
      label: `${panes[id] ? '●' : ' '} ${paneLabels(msg)[id]}`,
      accel: paneAccel(id),
      title: panes[id]
        ? msg.paneChrome.hidePaneMenu(paneLabels(msg)[id])
        : msg.paneChrome.showPane(paneLabels(msg)[id]),
      action: () => togglePane(id)
    }))
    items.push({
      label: msg.paneChrome.showAllPanes,
      accel: ALL_PANES_ACCEL,
      separatorBefore: true,
      action: () => setPanes({ ...ALL_PANES })
    })
    setMenu({ x, y, items })
  }

  // Tab names ride with the open set rather than with the preferences: they
  // are per repository, not app-wide.
  useEffect(() => {
    localStorage.setItem('gitty.tabNames', JSON.stringify(tabNames))
  }, [tabNames])

  /* ---------- repository menu, continued ---------- */

  const closeRepoMenu = useCallback(() => setRepoMenuAt(null), [])
  const recentLabel = useCallback((p: string) => tabLabel(tabNames, p), [tabNames])
  const guessRepos = useCallback((q: string) => window.gitty.repo.guess(q), [])
  const forgetRecent = useCallback((p: string): void => {
    void window.gitty.repo.forget(p).then(setRecent)
  }, [])

  /* ---------- branch menu ---------- */

  const browse = (root: string, branch: string | null): void => {
    setBrowsingByRoot((prev) => {
      const next = { ...prev }
      if (branch === null) delete next[root]
      else next[root] = branch
      return next
    })
  }

  /**
   * Point the log at another branch. Nothing here checks anything out: the
   * work tree, its diffs and the shells stay on the branch git is actually on.
   */
  const openBranchMenu = async (x: number, y: number): Promise<void> => {
    if (!active) return
    const root = active
    const list = await window.gitty.git.branches(root)
    // The branch whose history is on screen: what was picked, or the one
    // checked out when nothing was.
    const showing = browsingByRoot[root] ?? activeStatus?.branch ?? null

    const entry = (b: Branch): MenuItem => ({
      label: `${b.name === showing ? '●' : ' '} ${b.name}`,
      accel: b.head ? msg.branch.headLabel : ago(b.date),
      title: b.subject,
      action: () => browse(root, b.head ? null : b.name)
    })

    const locals = list.filter((b) => !b.remote)
    const remotes = list.filter((b) => b.remote)
    // The checked-out branch leads, however old its last commit is.
    locals.sort((a, b) => Number(b.head) - Number(a.head))

    const items: MenuItem[] = locals.map(entry)
    if (items.length === 0) items.push({ label: msg.branch.noBranchesYet, action: () => {} })
    remotes.forEach((b, i) => items.push({ ...entry(b), separatorBefore: i === 0 }))
    if (browsingByRoot[root]) {
      items.push({
        label: msg.branch.backTo(activeStatus?.branch ?? msg.branch.headLabel),
        separatorBefore: true,
        action: () => browse(root, null)
      })
    }
    setMenu({ x, y, items })
  }

  return (
    <LocaleProvider locale={locale} setLocale={setLocale}>
    <TimeProvider time={time}>
    <PluginPrefsProvider state={pluginPrefs} setState={setPluginPrefs}>
    <div className="app" onContextMenu={(e) => e.preventDefault()}>
      <div className="titlebar" title={isMac ? undefined : msg.app.menuTitle(MENU_ACCEL)}>
        {/* The brand opens the About dialog, like the application menu's
            About on macOS. */}
        <button
          className="titlebar-brand"
          title={msg.app.about.title}
          onClick={() => setAboutOpen(true)}
        >
          {appIcon && (
            <img className="titlebar-icon" src={appIcon} alt={msg.app.title} draggable={false} />
          )}
          <strong>{msg.app.title}</strong>
        </button>
        {/* Back, forward and the list of places — of the active tab, since the
            history belongs to a repository session, not to the window. */}
        {active && (
          <div className="nav-buttons">
            <button
              className="nav-btn"
              disabled={!canBack}
              title={
                canBack && activeNav
                  ? `${msg.nav.backTitle}\n${navLabel(activeNav.places[activeNav.index - 1], msg)}`
                  : msg.nav.backTitle
              }
              onClick={goBack}
            >
              ‹
            </button>
            <button
              className="nav-btn"
              disabled={!canForward}
              title={
                canForward && activeNav
                  ? `${msg.nav.forwardTitle}\n${navLabel(activeNav.places[activeNav.index + 1], msg)}`
                  : msg.nav.forwardTitle
              }
              onClick={goForward}
            >
              ›
            </button>
            <button
              className="nav-btn"
              title={msg.nav.historyTitle}
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                openHistoryMenu(r.left, r.bottom + 2)
              }}
            >
              ▾
            </button>
          </div>
        )}
        <button
          ref={repoButtonRef}
          className="repo-button"
          title={
            // A renamed tab hides its repository, so the tooltip names it.
            active && tabNames[active]
              ? `${msg.app.recentlyOpened}\n${active}`
              : msg.app.recentlyOpened
          }
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            setRepoMenuAt({ x: r.left, y: r.bottom + 2 })
          }}
        >
          <span className="repo">{active ? tabLabel(tabNames, active) : msg.app.noRepo}</span>
          <span className="caret">▾</span>
        </button>
        {activeStatus && (
          <>
            {/* The checked-out branch is a statement of fact, not a control:
                nothing here checks anything out, so it carries no menu. The
                menu belongs to the name being shown, which is what it changes
                — the same span when nothing is being browsed. */}
            {activeBrowsing ? (
              <>
                <span
                  className="branch branch-static"
                  title={msg.branch.checkedOutHint(activeStatus.branch)}
                >
                  ⎇ {activeStatus.branch}
                </span>
                <button
                  className="repo-button branch-button"
                  title={msg.branch.browseHint}
                  onClick={(e) => {
                    const el = e.currentTarget as HTMLElement
                    const r = el.getBoundingClientRect()
                    void openBranchMenu(r.left, r.bottom + 2)
                  }}
                >
                  <span className="browsing" title={msg.branch.browsingHint(activeBrowsing)}>
                    › {activeBrowsing}
                  </span>
                  <span className="caret">▾</span>
                </button>
              </>
            ) : (
              <button
                className="repo-button branch-button"
                title={msg.branch.browseHint}
                onClick={(e) => {
                  const el = e.currentTarget as HTMLElement
                  const r = el.getBoundingClientRect()
                  void openBranchMenu(r.left, r.bottom + 2)
                }}
              >
                <span className="branch" title={msg.branch.checkedOutHint(activeStatus.branch)}>
                  ⎇ {activeStatus.branch}
                </span>
                <span className="caret">▾</span>
              </button>
            )}
            {activeStatus.upstream && (
              <span className="tracking">
                {activeStatus.upstream} ↑{activeStatus.ahead} ↓{activeStatus.behind}
              </span>
            )}
            <span className="tracking">{msg.app.changesCount(activeStatus.files.length)}</span>
          </>
        )}
        {error && <span style={{ color: 'var(--red)' }}>{error}</span>}
        <span className="spacer" />
        <button
          title={msg.app.showHidePanes}
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            openPanesMenu(r.left, r.bottom + 2)
          }}
        >
          {msg.app.panes} ▾
        </button>
        <button
          onClick={() => {
            setMenu(null)
            setSettingsOpen(true)
          }}
        >
          {msg.app.settings}
        </button>
        <button onClick={refreshActive} title={msg.app.refreshTitle(REFRESH_ACCEL)}>
          {msg.app.refresh}
        </button>
      </div>

      {roots.length === 0 ? (
        <div className="tab-empty">
          <p>{msg.app.noReposOpen}</p>
          <button onClick={() => pickAndOpen()}>{msg.app.openRepository}</button>
        </div>
      ) : (
        <div className="tab-content">
          {roots.map((r) => (
            <div
              className="repo-tab-shell"
              key={r}
              style={r === active ? undefined : { display: 'none' }}
            >
              <Suspense
                fallback={
                  <div className="repo-tab">
                    <div className="pane">
                      <div className="empty">{msg.common.loading}</div>
                    </div>
                  </div>
                }
              >
                <RepoTab
                  ref={(el) => {
                    tabRefs.current[r] = el
                  }}
                  root={r}
                  active={r === active}
                  theme={theme}
                  fontSize={fontSize}
                  wrap={wrap}
                  setWrap={setWrap}
                  diffView={diffView}
                  setDiffView={setDiffView}
                  wordDiff={wordDiff}
                  setWordDiff={setWordDiff}
                  mdOutline={mdOutline}
                  mdLineNumbers={mdLineNumbers}
                  naturalSort={naturalSort}
                  setMdOutline={setMdOutline}
                  fontFamily={monoFont}
                  diffOptions={diffOptions}
                  terminalOptions={terminalOptions}
                  agentCommand={agentCommand}
                  agentCommands={agentCommands}
                  onAgentCommand={useAgentCommand}
                  onForgetAgentCommand={forgetAgentCommand}
                  graph={graph}
                  setGraph={setGraph}
                  panes={panes}
                  onHidePane={togglePane}
                  onLayout={setLayout}
                  browsing={browsingByRoot[r] ?? null}
                  dialogOpen={settingsOpen || aboutOpen || helpOpen}
                  onStatus={onStatus}
                  onNav={onNav}
                />
              </Suspense>
            </div>
          ))}
        </div>
      )}

      <div
        className="tabbar"
        onDragOver={(e) => {
          // The bar itself accepts drops too, so the gaps and the tail beyond
          // the last tab are landable places to move a tab to.
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDragLeave={(e) => {
          // Only leaving the whole bar clears the landing mark; moving between
          // tabs stays inside it.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropAt(null)
        }}
        onDrop={(e) => {
          e.preventDefault()
          // Dropped on the bar itself — a gap or the tail — lands after the
          // last tab. A drop on a tab is handled by the tab, which stops the
          // event from reaching here.
          if (dragIndex !== null) setRoots((prev) => moveTab(prev, dragIndex, prev.length - 1, true))
          endTabDrag()
        }}
      >
        {roots.map((r, i) => (
          <div
            className={`tab${r === active ? ' active' : ''}${dragIndex === i ? ' dragging' : ''}${
              dropAt && dropAt.index === i && dragIndex !== i
                ? dropAt.after
                  ? ' drop-after'
                  : ' drop-before'
                : ''
            }`}
            key={r}
            draggable
            title={statusByRoot[r]?.files.length ? msg.tab.uncommittedChanges(r) : r}
            onClick={() => setActive(r)}
            onContextMenu={(e) => openTabMenu(e, r)}
            onDragStart={(e) => startTabDrag(e, i)}
            onDragEnd={endTabDrag}
            onDragOver={(e) => overTab(e, i)}
            onDrop={dropOnTab}
          >
            <span className="tab-name">{tabLabel(tabNames, r)}</span>
            {statusByRoot[r]?.files.length ? (
              // No title of its own: hovering the dot would otherwise replace
              // the tab's tooltip with a version that drops the path.
              <span className="tab-dirty" />
            ) : null}
            <button
              className="tab-close"
              // Dragging the × would fight the click that closes the tab.
              draggable={false}
              title={msg.tab.closeRepository}
              onClick={(e) => {
                // Closing a tab must not also switch to it.
                e.stopPropagation()
                closeTab(r)
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="tab-add"
          title={msg.tab.openAnotherRepo}
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            setRepoMenuAt({ x: r.left, y: r.top - 2, up: true })
          }}
        >
          +
        </button>
      </div>

      <ContextMenu state={menu} onClose={() => setMenu(null)} />
      {repoMenuAt && (
        <RepoMenu
          x={repoMenuAt.x}
          y={repoMenuAt.y}
          up={repoMenuAt.up}
          list={recent.filter((p) => p !== active)}
          labelOf={recentLabel}
          shortPath={shortenPath}
          onOpen={(p, inActiveTab) => void (inActiveTab ? openInActiveTab(p) : openTab(p))}
          onForget={forgetRecent}
          onPick={pickAndOpen}
          onClear={() => {
            void window.gitty.repo.forgetAll().then((cleared) => {
              if (cleared) setRecent(active ? [active] : [])
            })
          }}
          onGuess={guessRepos}
          onClose={closeRepoMenu}
        />
      )}
      <PromptDialog
        open={renameFor !== null}
        title={msg.tab.renameTitle}
        placeholder={msg.tab.renamePlaceholder}
        initial={renameFor ? (tabNames[renameFor] ?? tabBasename(renameFor)) : ''}
        submitLabel={msg.tab.renameSubmit}
        cancelLabel={msg.tab.renameCancel}
        onCancel={() => setRenameFor(null)}
        onSubmit={(name) => {
          if (renameFor) setTabNames((prev) => renameTab(prev, renameFor, name))
          setRenameFor(null)
        }}
      />
      <SettingsPane
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
      />
      <AboutPane
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        appIcon={appIcon}
        onShortcuts={() => {
          setAboutOpen(false)
          setHelpOpen(true)
        }}
      />
      <HelpPane open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
    </PluginPrefsProvider>
    </TimeProvider>
    </LocaleProvider>
  )
}

/** The repositories open when the app last exited, for the restore pass. */
function loadRoots(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem('gitty.roots') ?? '[]')
    return Array.isArray(raw) ? raw.filter((r): r is string => typeof r === 'string') : []
  } catch {
    return []
  }
}

/** The custom tab names, keyed by repository root. */
function loadTabNames(): Record<string, string> {
  try {
    const v = JSON.parse(localStorage.getItem('gitty.tabNames') ?? 'null')
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const out: Record<string, string> = {}
      for (const [k, val] of Object.entries(v)) {
        if (typeof val === 'string' && val.trim()) out[k] = val
      }
      return out
    }
  } catch {
    // A hand-edited or truncated value is not worth a dialog; fall through.
  }
  return {}
}

/** Coarse age of a branch's last commit, to date the branch menu's entries. */
function ago(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.floor((Date.now() - then) / 86_400_000)
  const m = getMessages(loadLocale())
  if (days < 1) return m.time.today
  if (days === 1) return m.time.yesterday
  if (days < 30) return m.time.daysAgo(days)
  if (days < 365) return m.time.monthsAgo(days)
  return m.time.yearsAgo(days)
}

/** Home-relative directory of a path, for the recent-repository menu. */
function shortenPath(p: string): string {
  const dir = p.slice(0, p.lastIndexOf('/')) || '/'
  const home = window.gitty.homeDir
  return home && dir.startsWith(home) ? '~' + dir.slice(home.length) : dir
}
