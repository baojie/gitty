import fs from 'node:fs'
import path from 'node:path'
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  screen,
  shell,
  type MenuItemConstructorOptions
} from 'electron'
import * as git from './git'
import * as gource from './gource'
import { availableShells, createTerminal, type TerminalSession } from './pty'
import { addRecent, clearRecent, guessRepos, listRecent, removeRecent } from './recent'
import { readPrefs, writePrefs } from './prefs'
import { registerPlugins } from './plugins'
import { watchRepo, type RepoWatcher } from './watcher'
import { startStallLog, watchWindowStalls } from './stalls'
import * as web from './web'
import {
  copyName,
  parseCopiedFiles,
  parsePlainPaths,
  parseUriList,
  type ClipboardFiles
} from './clipfiles'
import type {
  AboutInfo,
  ApplyDirection,
  ChurnSpec,
  DiffOptions,
  DiffRequest,
  HunkPick,
  LogFilterMode,
  TerminalOptions
} from '../shared/types'
import { msg, setMainLocale } from './messages'

// Fixes the userData directory (~/.config/Gitty) rather than inheriting
// Electron's default name when running unpackaged.
app.setName('Gitty')

/**
 * A Wayland session driving two monitors at different scales can leave
 * Chromium flipping the window's scale factor between the two several times a
 * second. Every flip lays the page out again, so the whole interface shakes by
 * a pixel or two for as long as the window is open — full screen worst of all.
 * Nothing in the app causes it: an empty `BrowserWindow` shakes the same way,
 * and no window size avoids it. Switching this feature off is the only thing
 * measured to stop it, at the cost of ignoring the desktop's fractional
 * scaling — the interface then renders at scale 1, which is smaller.
 */
const FRACTIONAL_SCALE = 'WaylandFractionalScaleV1'

// `GITTY_DISABLE_FRACTIONAL_SCALE=1` switches it off; `=0` keeps it on and
// stops the relaunch below from second-guessing that. Unset leaves the choice
// to the monitors, which are not knowable until `ready`.
const forcedScale = process.env.GITTY_DISABLE_FRACTIONAL_SCALE
if (forcedScale && forcedScale !== '0') {
  app.commandLine.appendSwitch('disable-features', FRACTIONAL_SCALE)
}

/**
 * Which the monitors decide, once there are monitors to ask: the flip only
 * happens where two of them are scaled differently, and the switch is only
 * read before Chromium starts — too early for `screen`. So the app starts
 * itself again with the switch on the command line, before any window exists
 * and so before anything is on screen to flicker. The relaunched process sees
 * the switch it was given and leaves it alone; `GITTY_SCALE_RELAUNCHED` is the
 * second guard, in case a Chromium that ignored the switch would otherwise
 * have it start itself forever.
 */
function relaunchWithoutFractionalScale(): boolean {
  if (process.platform !== 'linux' || !process.env.WAYLAND_DISPLAY) return false
  if (process.env.GITTY_DISABLE_FRACTIONAL_SCALE || process.env.GITTY_SCALE_RELAUNCHED) return false
  if (app.commandLine.getSwitchValue('disable-features').includes(FRACTIONAL_SCALE)) return false
  if (new Set(screen.getAllDisplays().map((d) => d.scaleFactor)).size < 2) return false
  process.env.GITTY_SCALE_RELAUNCHED = '1'
  app.relaunch({ args: [...process.argv.slice(1), `--disable-features=${FRACTIONAL_SCALE}`] })
  app.exit(0)
  return true
}

let win: BrowserWindow | null = null

/** How many repository tabs the renderer has open, as it last reported. */
let openRepoCount = 0
/** Set once the user has agreed to close with several repositories open. */
let closeConfirmed = false
/** The close under way came from Quit rather than from closing the window. */
let quitRequested = false

/** The project's home page — the About dialog and the Help menu both point here. */
const GITTY_REPO_URL = 'https://github.com/baojie/gitty'

// The renderer can split the terminal pane, so shells are keyed by the id it
// hands out rather than held one at a time.
const terms = new Map<string, TerminalSession>()

// Each open tab watches its own repository, so several may be watched at once.
const watchers = new Map<string, RepoWatcher>()

function disposeTerminal(id: string): void {
  terms.get(id)?.dispose()
  terms.delete(id)
}

function disposeAllTerminals(): void {
  for (const t of terms.values()) t.dispose()
  terms.clear()
}

/**
 * Repository to open on launch: $GITTY_REPO, else the first command-line
 * argument that names a directory (argv also holds the electron binary and,
 * when unpackaged, the entry script), else the cwd.
 */
function initialPath(): string {
  if (process.env.GITTY_REPO) return path.resolve(process.env.GITTY_REPO)
  for (const arg of process.argv.slice(1)) {
    if (arg.startsWith('-')) continue
    const candidate = path.resolve(arg)
    try {
      if (fs.statSync(candidate).isDirectory()) return candidate
    } catch {
      /* not a path we can use */
    }
  }
  return process.cwd()
}

/**
 * One process per user unless the setting says otherwise. A second `gitty
 * <repo>` then hands its directory to the process already running — which
 * opens it as another tab and comes to the front — and exits, so the terminal
 * it was typed in returns at once.
 *
 * The lock is taken here rather than at `ready` because Electron delivers
 * `second-instance` to whoever holds it, and a race between two launches is
 * exactly what the lock exists to settle. `quitting` stops the rest of the
 * startup from running in a process that is on its way out.
 */
let quitting = false
if (readPrefs().singleInstance && !app.requestSingleInstanceLock({ repo: initialPath() })) {
  quitting = true
  app.quit()
}

/** Bring the window forward, whatever the window manager has done with it. */
function focusWindow(): void {
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  if (!win.isVisible()) win.show()
  win.focus()
}

app.on('second-instance', (_e, _argv, _cwd, extra) => {
  focusWindow()
  const repo = (extra as { repo?: unknown } | undefined)?.repo
  // The renderer resolves it to a work tree, or reports that it is not one —
  // the same path the File menu takes, so the two behave alike.
  if (typeof repo === 'string' && win && !win.isDestroyed()) {
    win.webContents.send('repo:open-external', repo)
  }
})

/**
 * The application menu. Without one, Chromium's edit accelerators (Ctrl+C to
 * copy selected diff text, Ctrl+A, …) are not bound at all. The bar itself
 * stays hidden, but every item is labelled from the message table — a role's
 * own label is Electron's language, not Gitty's, so each carries an explicit
 * one, or the menu would stay English under a different language setting.
 */
function installMenu(): void {
  const isMac = process.platform === 'darwin'
  const editItems: MenuItemConstructorOptions[] = isMac
    ? [
        { role: 'undo', label: msg.menu.undo },
        { role: 'redo', label: msg.menu.redo },
        { type: 'separator' },
        { role: 'cut', label: msg.menu.cut },
        { role: 'copy', label: msg.menu.copy },
        { role: 'paste', label: msg.menu.paste },
        { role: 'selectAll', label: msg.menu.selectAll }
      ]
    : [
        { role: 'undo', label: msg.menu.undo },
        { role: 'redo', label: msg.menu.redo },
        { type: 'separator' },
        { role: 'cut', label: msg.menu.cut },
        { role: 'copy', label: msg.menu.copy },
        { role: 'paste', label: msg.menu.paste },
        { role: 'delete', label: msg.menu.delete },
        { type: 'separator' },
        { role: 'selectAll', label: msg.menu.selectAll }
      ]
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(isMac ? [{ role: 'appMenu' as const }] : []),
      {
        label: msg.menu.file,
        submenu: [
          {
            label: msg.menu.openRepo,
            accelerator: 'CmdOrCtrl+O',
            click: () => win?.webContents.send('menu:open-repo')
          },
          {
            label: msg.menu.closeRepo,
            accelerator: 'CmdOrCtrl+W',
            click: () => win?.webContents.send('menu:close-repo')
          },
          {
            label: msg.menu.settings,
            accelerator: 'CmdOrCtrl+,',
            click: () => win?.webContents.send('menu:open-settings')
          },
          { type: 'separator' },
          isMac
            ? { role: 'close', label: msg.menu.closeWindow }
            : { role: 'quit', label: msg.menu.quit }
        ]
      },
      { label: msg.menu.edit, submenu: editItems },
      {
        label: msg.menu.view,
        submenu: [
          // Refresh carries no accelerator: F5 and Ctrl+R are already the
          // app's own keys, and registering them here too would fire twice.
          {
            label: msg.menu.refresh,
            click: () => win?.webContents.send('menu:refresh')
          },
          { role: 'reload', label: msg.menu.reload },
          { role: 'toggleDevTools', label: msg.menu.devTools },
          { type: 'separator' },
          { role: 'resetZoom', label: msg.menu.actualSize },
          { role: 'zoomIn', label: msg.menu.zoomIn },
          { role: 'zoomOut', label: msg.menu.zoomOut },
          { type: 'separator' },
          { role: 'togglefullscreen', label: msg.menu.fullscreen }
        ]
      },
      {
        label: msg.menu.help,
        submenu: [
          // macOS puts About in the application menu; a second one here would
          // just duplicate it.
          ...(!isMac
            ? [
                {
                  label: msg.menu.about,
                  click: () => win?.webContents.send('menu:about')
                }
              ]
            : []),
          {
            // No accelerator, for the same reason Refresh carries none: F1 is
            // already handled in the renderer, which toggles the sheet, and a
            // menu accelerator would swallow the key before it got there.
            label: msg.menu.shortcuts,
            click: () => win?.webContents.send('menu:shortcuts')
          },
          {
            label: msg.menu.github,
            click: () => void shell.openExternal(GITTY_REPO_URL)
          }
        ]
      }
    ])
  )
}

function createWindow(): void {
  // A window reopened on macOS starts its own session: nothing open, nothing agreed.
  openRepoCount = 0
  closeConfirmed = false
  // BrowserWindow's icon shows on Linux and Windows; the macOS dock has its
  // own. Guard it in case the file is absent when running unpackaged.
  const icon = path.join(app.getAppPath(), 'build', 'icon.png')
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#12141a',
    title: msg.window.title,
    autoHideMenuBar: true,
    ...(fs.existsSync(icon) ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // Chromium's PDF viewer is a plugin, and off by default in Electron.
      // Without this a PDF frame is a blank page rather than a document.
      plugins: true
    }
  })
  watchWindowStalls(win)

  // The window is created hidden and shown at its first paint, so it never
  // appears empty. Under Wayland that frame can never come: an unmapped
  // window's renderer keeps its first frame to itself, 'ready-to-show' waits
  // for exactly that frame, and the window stays hidden for good — showing it
  // is what unblocks the paint it is waiting for. So the load event arms a
  // fallback; on a compositor that paints hidden windows the first paint has
  // long since won the race.
  const show = (): void => {
    if (win && !win.isDestroyed() && !win.isVisible()) win.show()
  }
  win.on('ready-to-show', show)
  win.webContents.once('did-finish-load', () => setTimeout(show, 1000))
  // A reload throws away the renderer's terminal ids, so its shells would
  // otherwise linger with nothing able to reach them.
  win.webContents.on('did-start-loading', disposeAllTerminals)

  // Several tabs are a session worth asking about; one is not. The dialog is
  // async, so the close is cancelled first and repeated once it is answered —
  // as a quit when Quit started it, since on macOS closing the window alone
  // would leave the app running.
  win.on('close', (e) => {
    if (closeConfirmed || openRepoCount < 2 || !win) return
    e.preventDefault()
    const wasQuit = quitRequested
    quitRequested = false
    void dialog
      .showMessageBox(win, {
        type: 'question',
        title: msg.dialog.quitTitle,
        message: msg.dialog.quitConfirm(openRepoCount),
        detail: msg.dialog.quitDetail,
        buttons: [msg.dialog.cancelButton, msg.dialog.quitButton],
        defaultId: 1,
        cancelId: 0
      })
      .then(({ response }) => {
        if (response !== 1) return
        closeConfirmed = true
        if (wasQuit) app.quit()
        else win?.close()
      })
  })

  win.on('closed', () => {
    disposeAllTerminals()
    for (const w of watchers.values()) w.close()
    watchers.clear()
    win = null
  })

  // Open external links in the system browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

/**
 * What the system clipboard holds, if it holds files at all. The formats are
 * tried in the order of how much they say: the desktop-specific ones carry the
 * copy/cut verb, `text/uri-list` and macOS's file URLs carry only the paths,
 * and plain text is read as paths last and only when they are really there —
 * that check is what keeps ordinary copied prose out.
 */
function readClipboardFiles(): ClipboardFiles | null {
  // Read each format rather than asking which ones are there:
  // `availableFormats()` reports the MIME types Chromium knows and leaves the
  // desktop's `x-special/*` ones out entirely, while `readBuffer` returns them
  // perfectly well — measured on this Wayland session. An absent format reads
  // as an empty buffer, so trying costs nothing.
  const read = (format: string): string => {
    try {
      return clipboard.readBuffer(format).toString('utf8')
    } catch {
      return ''
    }
  }
  const desktop = [
    'x-special/gnome-copied-files',
    'x-special/KDE-copied-files',
    'x-special/mate-copied-files',
    'x-special/nautilus-clipboard'
  ]
  for (const format of desktop) {
    const parsed = parseCopiedFiles(read(format))
    if (parsed) return parsed
  }
  for (const format of ['text/uri-list', 'public.file-url']) {
    const parsed = parseUriList(read(format))
    if (parsed) return parsed
  }
  const plain = parsePlainPaths(clipboard.readText())
  if (plain && plain.paths.every((p) => fs.existsSync(p))) return plain
  return null
}

function registerIpc(): void {
  ipcMain.handle('repo:initial', () => initialPath())
  ipcMain.handle('prefs:single-instance', () => readPrefs().singleInstance)
  ipcMain.handle('prefs:set-single-instance', (_e, on: boolean) => {
    writePrefs({ ...readPrefs(), singleInstance: on })
    // Apply it to this process too, so the next `gitty <repo>` behaves as the
    // setting now says rather than as it said at launch. Taking the lock can
    // fail — another instance started while the setting was off still holds
    // it — and then the change waits for the next launch.
    if (on) app.requestSingleInstanceLock({ repo: initialPath() })
    else app.releaseSingleInstanceLock()
  })

  // The window icon doubles as the title-bar mark, and the About dialog shows
  // it too. The renderer cannot read build/ for itself, so serve it as a data
  // URL. Unpackaged, getAppPath points at out/main, where no build/ lives — the
  // repo root beside the bundle is where the icon actually is, the same root
  // the About dialog reads its version from.
  ipcMain.handle('app:icon', () => {
    const icon = fs.existsSync(path.join(app.getAppPath(), 'build', 'icon.png'))
      ? path.join(app.getAppPath(), 'build', 'icon.png')
      : path.join(path.resolve(__dirname, '..', '..'), 'build', 'icon.png')
    try {
      return `data:image/png;base64,${fs.readFileSync(icon).toString('base64')}`
    } catch {
      return null
    }
  })

  // The About dialog's contents. The renderer draws the dialog itself — a
  // native message box's detail is plain text, and the project link has to be
  // clickable — so this returns the facts and lets React lay them out.
  // Unpackaged, getAppPath points at out/main, where no package.json lives —
  // app.getVersion() would report Electron's own version — so the version
  // comes from the repo root beside the bundle instead, and the build time is
  // the bundle's own mtime.
  ipcMain.handle('app:about', (): AboutInfo => {
    const root = path.resolve(__dirname, '..', '..')
    let version = app.getVersion()
    let author = ''
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(root, 'package.json'), 'utf8')
      ) as { version?: string; author?: string }
      if (pkg.version) version = pkg.version
      author = pkg.author ?? ''
    } catch {
      // Packaged: no manifest beside the bundle; app.getVersion() is right.
    }
    let builtAt = ''
    try {
      builtAt = fs.statSync(path.join(__dirname, 'index.js')).mtime.toISOString()
    } catch {
      // No stat-able bundle — nothing to say about the build.
    }
    return {
      version,
      author,
      github: GITTY_REPO_URL,
      builtAt,
      electron: process.versions.electron ?? '',
      chromium: process.versions.chrome ?? '',
      node: process.versions.node ?? ''
    }
  })

  ipcMain.handle('repo:resolve', async (_e, cwd: string) => {
    try {
      return await git.resolveRepo(cwd)
    } catch {
      return null
    }
  })

  ipcMain.handle('repo:pick', async () => {
    if (!win) return null
    const res = await dialog.showOpenDialog(win, {
      title: msg.dialog.openRepoTitle,
      properties: ['openDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) return null
    try {
      return await git.resolveRepo(res.filePaths[0])
    } catch {
      dialog.showErrorBox(msg.dialog.notARepo, msg.dialog.notInsideWorkTree(res.filePaths[0]))
      return null
    }
  })

  ipcMain.on('repo:open-set', (_e, roots: string[]) => {
    openRepoCount = Array.isArray(roots) ? roots.length : 0
  })

  ipcMain.on('settings:setLocale', (_e, locale: string) => {
    setMainLocale(locale)
    installMenu()
  })

  ipcMain.handle('recent:list', () => listRecent())
  ipcMain.handle('recent:add', (_e, root: string) => addRecent(root))
  ipcMain.handle('recent:remove', (_e, root: string) => removeRecent(root))
  ipcMain.handle('recent:guess', (_e, query: string) => guessRepos(String(query)))
  // Asked natively, as forgetting a command is: the whole list goes at once and
  // there is no undo. Resolves whether it was cleared.
  ipcMain.handle('recent:clear', async () => {
    const n = listRecent().length
    const answer = await dialog.showMessageBox(win!, {
      type: 'question',
      title: msg.dialog.clearRecentTitle,
      message: msg.dialog.clearRecentConfirm(n),
      detail: msg.dialog.clearRecentDetail,
      buttons: [msg.dialog.cancelButton, msg.dialog.clearRecentButton],
      defaultId: 0,
      cancelId: 0
    })
    if (answer.response !== 1) return false
    clearRecent()
    return true
  })

  ipcMain.handle('repo:watch', (_e, root: string) => {
    // Re-watching the same root replaces its watcher; others stay untouched.
    watchers.get(root)?.close()
    watchers.set(
      root,
      watchRepo(root, () => {
        if (win && !win.isDestroyed()) win.webContents.send('repo:changed', { root })
      })
    )
    // The web server serves any open repo; a re-open just re-registers it.
    web.registerRepo(root)
    return true
  })

  // A closed tab stops watching its repository; its terminals are already gone,
  // disposed by the renderer when the tab's terminal pane unmounts.
  ipcMain.handle('repo:close', (_e, root: string) => {
    watchers.get(root)?.close()
    watchers.delete(root)
    web.unregisterRepo(root)
    return true
  })

  ipcMain.handle('git:status', (_e, root: string) => git.status(root))
  ipcMain.handle(
    'git:log',
    (
      _e,
      root: string,
      limit: number,
      skip: number,
      ref: string | null,
      filter: string,
      mode: LogFilterMode,
      all: boolean
    ) => git.log(root, limit, skip, ref, filter, mode, all)
  )
  ipcMain.handle('git:branches', (_e, root: string) => git.branches(root))
  ipcMain.handle('git:remoteBases', (_e, root: string) => git.remoteBases(root))
  ipcMain.handle('git:push', (_e, root: string, branch: string | null) =>
    git.push(root, branch ?? undefined)
  )
  // Pull is fast-forward only, and the one failure worth an offer rather than
  // a report is a branch that has diverged: the rebase is asked for natively,
  // where the dialog is modal to the window the way discarding's is.
  ipcMain.handle('git:pull', async (_e, root: string) => {
    const res = await git.pull(root)
    if (res.ok || !git.pullNeedsRebase(res.output)) return res
    const answer = await dialog.showMessageBox(win!, {
      type: 'question',
      title: msg.dialog.rebaseTitle,
      message: msg.dialog.rebaseConfirm,
      detail: msg.dialog.rebaseDetail,
      buttons: [msg.dialog.cancelButton, msg.dialog.rebaseButton],
      defaultId: 0,
      cancelId: 0
    })
    if (answer.response !== 1) return res
    return git.pull(root, true)
  })
  ipcMain.handle('git:submodules', (_e, root: string) => git.submodules(root))
  ipcMain.handle('git:submodulePull', (_e, root: string, subPath: string) =>
    git.submodulePull(root, subPath)
  )
  ipcMain.handle('git:commitDetail', (_e, root: string, hash: string) =>
    git.commitDetail(root, hash)
  )
  ipcMain.handle('git:commitMeta', (_e, root: string, hash: string) =>
    git.commitMeta(root, hash)
  )
  ipcMain.handle(
    'git:blame',
    (_e, root: string, rev: string | null, filePath: string) =>
      git.blame(root, rev, filePath)
  )
  ipcMain.handle('git:ownerRepo', (_e, root: string, rev: string | null, filePath: string) =>
    git.ownerRepo(root, rev, filePath)
  )
  ipcMain.handle(
    'git:fileHistory',
    (_e, root: string, rev: string | null, filePath: string) =>
      git.fileHistory(root, rev, filePath)
  )
  ipcMain.handle(
    'git:lineHistory',
    (_e, root: string, rev: string | null, filePath: string, start: number, end: number) =>
      git.lineHistory(root, rev, filePath, start, end)
  )
  ipcMain.handle('git:grep', (_e, root: string, pattern: string, rev: string | null) =>
    git.grep(root, pattern, rev)
  )
  ipcMain.handle('git:rangeFiles', (_e, root: string, from: string, to: string) =>
    git.rangeFiles(root, from, to)
  )
  ipcMain.handle('git:diff', (_e, root: string, req: DiffRequest, opts?: DiffOptions) =>
    git.diff(root, req, opts)
  )
  // Staging. Everything that writes to the index reports what git said rather
  // than throwing: a rejected patch is git's sentence to say, not ours.
  ipcMain.handle('git:stageFile', (_e, root: string, filePath: string) =>
    git.stageFile(root, filePath)
  )
  ipcMain.handle('git:unstageFile', (_e, root: string, filePath: string) =>
    git.unstageFile(root, filePath)
  )
  // Confirmed here rather than in the renderer, like deleting a file: the
  // window cannot be clicked past while a native dialog is up, and there is
  // nothing to undo afterwards — the changes were never in git.
  ipcMain.handle('git:discardFile', async (_e, root: string, filePath: string) => {
    const answer = await dialog.showMessageBox(win!, {
      type: 'warning',
      title: msg.dialog.discardTitle,
      message: msg.dialog.discardConfirm(path.basename(filePath)),
      detail: msg.dialog.discardDetail,
      buttons: [msg.dialog.cancelButton, msg.dialog.discardButton],
      defaultId: 0,
      cancelId: 0
    })
    if (answer.response !== 1) return null
    return git.discardFile(root, filePath)
  })
  // Forgetting a remembered agent command. Confirmed natively for the reason
  // discarding is: the window cannot be clicked past while the dialog is up,
  // and the list is the only place the command was written down.
  ipcMain.handle('settings:confirmForget', async (_e, command: string) => {
    const answer = await dialog.showMessageBox(win!, {
      type: 'question',
      title: msg.dialog.forgetTitle,
      message: msg.dialog.forgetConfirm(command),
      detail: msg.dialog.forgetDetail,
      buttons: [msg.dialog.cancelButton, msg.dialog.forgetButton],
      defaultId: 0,
      cancelId: 0
    })
    return answer.response === 1
  })
  ipcMain.handle('git:stagedDiff', (_e, root: string) => git.stagedDiff(root))
  ipcMain.handle(
    'git:applyHunks',
    (
      _e,
      root: string,
      filePath: string,
      picks: HunkPick[],
      direction: ApplyDirection,
      opts?: DiffOptions,
      origPath?: string
    ) => git.applyHunks(root, filePath, picks, direction, opts, origPath)
  )

  ipcMain.handle('git:unpushedCommits', (_e, root: string) => git.unpushedCommits(root))

  ipcMain.handle('git:snapshotFiles', (_e, root: string, hash: string) =>
    git.snapshotFiles(root, hash)
  )
  ipcMain.handle('git:worktreeFiles', (_e, root: string) => git.worktreeFiles(root))
  ipcMain.handle('git:snapshotFile', (_e, root: string, hash: string, filePath: string) =>
    git.snapshotFile(root, hash, filePath)
  )
  // Lay a commit's whole tree out on disk, for running something that was
  // committed at that revision. The path is all that comes back; running it is
  // the renderer typing a line into the terminal pane, not this process
  // spawning anything.
  ipcMain.handle('git:snapshotExport', (_e, root: string, hash: string) =>
    git.snapshotExport(root, hash)
  )
  ipcMain.handle('git:snapshotOpen', async (_e, root: string, hash: string, filePath: string) => {
    const tmp = await git.snapshotWriteTemp(root, hash, filePath)
    return (await shell.openPath(tmp)) || null
  })

  ipcMain.handle('git:readWorking', (_e, root: string, filePath: string) =>
    git.readWorkingFile(root, filePath)
  )

  ipcMain.handle('git:pathKind', (_e, root: string, rev: string | null, filePath: string) =>
    git.pathKind(root, rev, filePath)
  )

  ipcMain.handle('git:readImage', (_e, root: string, rev: string | null, filePath: string) =>
    git.readImageFile(root, rev, filePath)
  )

  ipcMain.handle(
    'git:fileLines',
    (_e, root: string, pairs: Array<{ rev: string | null; filePath: string }>) =>
      git.countFileLines(root, pairs)
  )

  ipcMain.handle('git:readPdf', (_e, root: string, rev: string | null, filePath: string) =>
    git.readPdfFile(root, rev, filePath)
  )

  ipcMain.handle(
    'git:fileAuthors',
    (_e, root: string, rev: string | null, paths: string[]) => git.fileAuthors(root, rev, paths)
  )

  ipcMain.handle('git:fileChurn', (_e, root: string, spec: ChurnSpec, opts?: DiffOptions) =>
    git.fileChurn(root, spec, opts)
  )

  // Every plugin's methods, behind one validated channel — see
  // `ref/spec/plugins.md`. Adding a plugin adds no handler here.
  registerPlugins(ipcMain)

  ipcMain.handle('file:openExternal', (_e, url: string) => {
    // Only ever hand real web links to the system browser.
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
  })

  ipcMain.handle('file:open', async (_e, abs: string) => {
    const err = await shell.openPath(abs)
    return err || null
  })
  ipcMain.handle('file:reveal', (_e, abs: string) => {
    shell.showItemInFolder(abs)
  })

  /**
   * Delete a file from the work tree. The path is resolved against the root and
   * checked, like every other path the renderer names, and it goes to the
   * system trash rather than being unlinked — a deletion made by a right-click
   * should be recoverable outside git as well as inside it. Confirmation is a
   * native dialog here rather than something the renderer draws, so the window
   * cannot be clicked past while it is up.
   */
  ipcMain.handle('file:trash', async (_e, root: string, filePath: string) => {
    const abs = path.resolve(root, filePath)
    if (abs === root || !abs.startsWith(root + path.sep)) return false
    const answer = await dialog.showMessageBox(win!, {
      type: 'warning',
      title: msg.dialog.deleteTitle,
      message: msg.dialog.deleteConfirm(path.basename(abs)),
      detail: msg.dialog.deleteDetail,
      buttons: [msg.dialog.cancelButton, msg.dialog.deleteButton],
      defaultId: 0,
      cancelId: 0
    })
    if (answer.response !== 1) return false
    try {
      await shell.trashItem(abs)
      return true
    } catch {
      // No trash to move it to — a repository on a mount without one, or a
      // system with no desktop trash at all. Ask again rather than report a
      // failure the user can do nothing about: the second ask says plainly
      // that the file is gone from disk.
      const again = await dialog.showMessageBox(win!, {
        type: 'warning',
        title: msg.dialog.deleteTitle,
        message: msg.dialog.deletePermanentConfirm(path.basename(abs)),
        detail: msg.dialog.deletePermanentDetail,
        buttons: [msg.dialog.cancelButton, msg.dialog.deletePermanentButton],
        defaultId: 0,
        cancelId: 0
      })
      if (again.response !== 1) return false
      try {
        await fs.promises.rm(abs)
        return true
      } catch (e) {
        dialog.showErrorBox(msg.dialog.deleteFailed, e instanceof Error ? e.message : String(e))
        return false
      }
    }
  })

  // Optional: the button is only rendered where gource is installed.
  /** Whether pasting into the file tree would do anything, for the menu item. */
  ipcMain.handle('file:canPaste', () => readClipboardFiles() !== null)

  /**
   * Paste the clipboard's files into a directory of the work tree. The target
   * is resolved and checked like every other path the renderer names, and the
   * sources come from the desktop rather than from the renderer — nothing here
   * takes a source path over IPC.
   *
   * A name already taken is the only question worth asking, and it is asked
   * once for the whole paste rather than per file: keep both, which adds
   * "(copy)" to the name, or replace. A cut moves the sources; a copy leaves
   * them where they are. Returns how many arrived, which is what tells the
   * renderer whether to say anything.
   */
  ipcMain.handle('file:paste', async (_e, root: string, destDir: string) => {
    const dest = path.resolve(root, destDir || '.')
    if (dest !== root && !dest.startsWith(root + path.sep)) return 0
    const clip = readClipboardFiles()
    if (!clip) return 0

    const conflicts = clip.paths.filter((src) =>
      fs.existsSync(path.join(dest, path.basename(src)))
    )
    // Pasting a file back into the directory it came from is not a conflict to
    // ask about — it is a duplicate being made on purpose.
    const sameDir = clip.paths.every((src) => path.dirname(src) === dest)
    let replace = false
    if (conflicts.length > 0 && !sameDir) {
      const answer = await dialog.showMessageBox(win!, {
        type: 'question',
        title: msg.dialog.pasteTitle,
        message: msg.dialog.pasteConflict(conflicts.length),
        detail: msg.dialog.pasteConflictDetail,
        buttons: [msg.dialog.cancelButton, msg.dialog.pasteKeepBothButton, msg.dialog.pasteReplaceButton],
        defaultId: 1,
        cancelId: 0
      })
      if (answer.response === 0) return 0
      replace = answer.response === 2
    }

    let pasted = 0
    for (const src of clip.paths) {
      // A directory cannot be pasted into itself or into its own subtree; the
      // copy would recurse into what it is writing.
      if (dest === src || dest.startsWith(src + path.sep)) continue
      const name = replace
        ? path.basename(src)
        : copyName(path.basename(src), (c) => fs.existsSync(path.join(dest, c)))
      const target = path.join(dest, name)
      try {
        if (clip.op === 'cut') {
          try {
            await fs.promises.rename(src, target)
          } catch (e) {
            // Across filesystems rename cannot work; copy and then remove.
            if ((e as NodeJS.ErrnoException).code !== 'EXDEV') throw e
            await fs.promises.cp(src, target, { recursive: true, force: true })
            await fs.promises.rm(src, { recursive: true })
          }
        } else {
          await fs.promises.cp(src, target, { recursive: true, force: replace })
        }
        pasted++
      } catch (e) {
        dialog.showErrorBox(msg.dialog.pasteFailed, e instanceof Error ? e.message : String(e))
        break
      }
    }
    // A cut is spent once it has been pasted; leaving it would move the same
    // files again on the next paste, from a source that is no longer there.
    if (clip.op === 'cut' && pasted > 0) clipboard.clear()
    return pasted
  })

  ipcMain.handle('gource:available', () => gource.available())
  ipcMain.handle('gource:play', (_e, root: string) => gource.play(root))

  ipcMain.handle('web:repoUrl', (_e, root: string) => web.repoUrl(root))
  ipcMain.handle('web:commitUrl', (_e, root: string, hash: string) => web.commitUrl(root, hash))
  ipcMain.handle('settings:shells', () => availableShells())

  ipcMain.handle('clipboard:write', (_e, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle(
    'terminal:start',
    (e, id: string, root: string, cols: number, rows: number, opts?: TerminalOptions) => {
      disposeTerminal(id)
      terms.set(id, createTerminal(e.sender, id, root, cols, rows, opts))
      return true
    }
  )
  ipcMain.on('terminal:input', (_e, id: string, data: string) => terms.get(id)?.write(data))
  ipcMain.on('terminal:resize', (_e, id: string, cols: number, rows: number) =>
    terms.get(id)?.resize(cols, rows)
  )
  ipcMain.on('terminal:close', (_e, id: string) => disposeTerminal(id))
}

app.whenReady().then(async () => {
  // Another instance owns this session; this one only delivered its path.
  if (quitting) return
  // Ends this process and starts another when it fires, so nothing below it
  // should have run yet.
  if (relaunchWithoutFractionalScale()) return
  // The web server must be up before the renderer can ask for URLs.
  await web.start()
  // Before registerIpc: it wraps ipcMain.handle so every handler is timed.
  startStallLog()
  registerIpc()
  installMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  quitRequested = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  web.stop()
})
