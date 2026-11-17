# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

It holds **rules only** — what to do, what never to do, and what to run. How the
program is built, and why, lives under `ref/spec/` (see
[Where the design is written down](#where-the-design-is-written-down)). Read the
relevant spec before changing a subsystem; do not re-derive it from the code.

## What this is

Gitty is an Electron desktop git history browser with four panes: the
uncommitted changes (top left, titled **Changes**), diff (top right), commit log
(bottom left) and an interactive shell (bottom right). See README.md for the
user-facing behaviour of each pane.

"Changes" and "Working Tree" are two different things throughout, and the
distinction is worth keeping in comments as well as on screen: **Changes** is
what is uncommitted, the `worktree` `View` mode; **Working Tree** is the whole
directory on disk, which is what browsing a null-hash snapshot shows. The
internal names (`worktree`, `WORKTREE_ROW`, `emptyWorktree`) kept the older word
rather than being renamed under the UI.

## Language

Two rules, and the line between them is *shipped UI* versus *the repository*.

**The interface is translatable.** Every user-visible string goes through the
message tables — never a literal in JSX or a dialog call. English (`en`) is the
source table: written first, and what every other language is translated from.

**Everything else is English, always.** Documentation, code comments, the
CHANGELOG, commit messages, `ref/spec/*`, this file. Conversation with the user
may be in another language, but nothing that lands in the repository is — except
the two things below, which are translations of English originals rather than
work authored in another language.

The user-facing documentation is two files. `README.md` is the short one —
what Gitty is, why it exists, how to install it, what it deliberately does not
do — kept under about 200 lines. `ref/readme/manual.md` is the long one: every
pane, the settings table, the shortcuts, the platform notes. A behaviour change
usually belongs in the manual; the README changes only when the pitch does. Both
have translations in `ref/readme/` — `README.<lang>.md` and `manual.<lang>.md` —
in eight languages (zh-CN, ja, ko, fr, de, es, ru, pt).

The translations are **snapshots, not a second source of truth**. Each carries
its translation date and a line saying the English file is the official version
and the only one kept current. Do not update a translation as part of changing
behaviour; the English file is what has to stay right. Because translated
headings would produce unpredictable anchors, each section carries an explicit
`<a id="…">` with the English slug, so the cross-links match the English file's.

Message tables other than `en` are the same kind of thing — translations that
follow, never lead. A new string is added to `en` and to the interface in the
same change; the other tables catch up afterwards.

## Commands

```bash
./run.sh [repo]          # build if stale, launch detached, print the pid
./run.sh --fg [repo]     # same but attached to the terminal
./run.sh --dev [repo]    # electron-vite dev with hot reload
npm run typecheck        # tsc over both tsconfigs
npm test                 # vitest over the pure modules in test/
npm run build            # electron-vite build into out/
npm run dist             # build, then electron-builder → release/ (.deb, AppImage)
./setup.sh               # symlink run.sh as `gitty` into ~/.local/bin
```

There is **no linter configured**. The automated safety net is `npm run
typecheck` plus `npm test`; **run both after every change.** The test suite is
one vitest file per pure module (`parse.ts`, `patch.ts`, `paths.ts`, `lanes.ts`,
`icons.ts`, `panes.ts`, `symbols.ts`), fed fixtures without a repository, so
`test/` is a readable index of what is tested. Anything that can be wrong *quietly* belongs there — the
patch builder above all.

A detached run writes everything to
`${XDG_STATE_HOME:-~/.local/state}/gitty/gitty.log`; use `--fg` when you want
the output inline.

**A freeze is diagnosed from `logs/stalls/*.jsonl`, not guessed at.** Each line
is one stall with the IPC calls in flight at the time (see "The stall log" in
`ref/spec/main-process.md`). Read the log before touching code for a hang, and
when fixing one, reproduce it and compare the log before and after. A fix is
usually: one git process instead of one per file, async instead of `*Sync`,
or a cap.

`npm run dist` is the *packaged* product and differs from the scripts above on
purpose: its own executable, so the desktop entry matches on `gitty` rather than
the `electron` window class, and the `.deb`'s postinst sets `chrome-sandbox` up.
`run.sh` and `setup.sh` are the developer path and keep both workarounds. Keep
`electron` in `optionalDependencies` — electron-builder refuses to package a
project that lists it as a dependency, and npm installs optional ones anyway.

`npm install` runs `install-electron && node scripts/postinstall.js` via
`postinstall`; both halves are needed. The script runs `electron-rebuild -f -w
node-pty` everywhere except Windows, where node-pty's N-API prebuilds load as
they are and a rebuild would demand Visual Studio. If the terminal pane fails to
start after an Electron version change, re-run that rebuild — node-pty must
match Electron's ABI, not Node's.

## Verifying changes visually

The UI cannot be checked by reading code, and this is a Wayland session where
X11 screenshot tools capture nothing. Screenshot it from inside Electron
instead: build, patch a `capturePage` call into `out/main/index.js` (the built
bundle, **never the source**) at the `ready-to-show` handler, run with
`GITTY_REPO=<repo>` and an env var carrying a delay plus an output path, then
read the PNG. Drive the UI first by passing a snippet to
`win.webContents.executeJavaScript` — clicking `.commit-row`, `.row` or header
buttons, or dispatching a `contextmenu` MouseEvent. `out/` is gitignored and
rebuilt, so the patch is throwaway. Use a repository with real history; this
repo's own log is short.

**Scope every query to the tab on screen.** An inactive tab keeps its DOM —
`display: none`, never unmounted — so a bare `document.querySelectorAll('.row')`
reaches into some other repository's file tree, and a click meant for the test
repo lands on this one. Start from the visible shell:
`[...document.querySelectorAll('.repo-tab-shell')].find((e) => e.style.display
!== 'none')`. A snippet that stages, discards or otherwise **writes** must run
against a throwaway repository for the same reason — and `discardFile` cannot
be driven this way at all, because it waits on a native modal the renderer
cannot click.

## Rules for changing code

**The process boundary.** `src/main/` owns everything privileged (git
subprocesses, the pty, the fs watcher, dialogs, clipboard, `shell.openPath`);
`src/preload/` is the only bridge, exposing a frozen `window.gitty` over
`contextBridge`; `src/renderer/` is pure presentation over that API, with no
node integration and no direct IPC; `src/shared/types.ts` is the contract both
sides import. **Adding a capability to the core means touching all three**: an
`ipcMain.handle` in `src/main/index.ts`, a method in `src/preload/index.ts`, and
a type in `src/shared/types.ts`. A **plugin** touches none of them — see below.

**Strings.** Add a string to the interface in `src/shared/messages.ts` and to
`en`; `npm run typecheck` then names every table that is missing it. Never reach
for a literal because a string is "obviously not going to be translated". A
message leaf is a string or a typed arrow function — no runtime interpolation,
no lookup by key. Because `msg` changes over a component's life, it is a
**dependency like any other**: every `useCallback` / `useMemo` / `useEffect`
that reads it must list it. Adding a language means a table beside `en.ts`, a
`Locale` in `locale.ts`, an entry in `messages/index.ts`, **and** a
`MainMessages` table in `src/main/messages.ts` — miss the last one and the menus
quietly stay English.

**Patches.** `src/main/patch.ts` is the one place a mistake is silent: a wrong
patch does not throw, it writes a wrong index. Read `ref/spec/main-process.md`
before touching it, keep it pure string work, and extend `test/patch.test.ts`
with every change. `DiffPane`'s line numbering must count exactly as `patch.ts`
counts — the `\ No newline` marker included — or a pick names different lines on
the two sides.

**Bundle size.** highlight.js and markdown-it may be imported only from the
`FileDoc` subtree, xterm only from `TerminalsPane`. A static import from a warm
chunk drags the library back into the main bundle. `paths.ts`, `icons.ts`,
`nav.ts`, `panes.ts`, `symbols.ts` and `quickopen.ts` are leaf modules and must
stay import-free; `terminals.ts` imports xterm **only as `import type`**. Full rules:
`ref/spec/lazy-loading.md`.

**Plugins.** Non-core features are plugins: a directory under
`src/plugins/<id>/` owning both halves of the process boundary, its own
storage, its own strings and its own settings rows. Adding one is its directory
plus one import and one array entry in `src/main/plugins.ts` and
`src/renderer/src/plugins.ts` — **never** a new IPC channel, a preload method, a
field in `src/shared/types.ts`, a string in the core message tables or an edit
to `SettingsPane`. A plugin holds its strings as `Record<Locale, …>` inside
itself, so adding a language means every plugin's table as well. `main/` and
`ui/` are compiled by different projects; anything outside them is compiled by
both, which is where a plugin's testable string work goes. Full rules:
`ref/spec/plugins.md`.

**Panels.** Every `react-resizable-panels` `Group` id must carry the repository
root and, where the child set varies, the visible set (`top-fd`, `bottom-lt`) —
sizes are stored per Group id. Every Group of a hidden tab needs
`disabled={!active}`: the library hit-tests every registered group, and a
`display: none` one reports a zero-sized rect.

**Preferences.** `src/renderer/src/prefs.ts` owns every app-wide preference and
persists it under `gitty.*`; a new one is a field on `Preferences`, a state in
`usePreferences`, a line in the store effect and a line in `resetSettings` —
all four, all in that file — plus its row in `SettingsPane`, which takes the
whole object rather than a prop each. The one exception is what the main
process must know before a window exists — the single-instance setting — which
lives in `src/main/prefs.ts`; put a preference there only when startup itself
reads it. Read a stored number through the `num()` helper, never
`Number(getItem(…))` — an absent key is `null` and `Number(null)` is `0`, so
the fallback never runs. Options git or the pty needs (`DiffOptions`,
`TerminalOptions`) travel *with each call*; the main process holds no view
state.

**Things that must not be unmounted.** Full screen is a `position: fixed` class,
not a different tree, and hiding the terminal pane must not end its shells:
unmounting the layout would dispose the pty and kill whatever is running in it.
Terminal sessions end only in `destroySession` / `destroyTerminals(root)`.

## Gotchas

- **`react-resizable-panels` v4** exports `Group` / `Panel` / `Separator` with
  an `orientation` prop — not the v3 `PanelGroup` / `PanelResizeHandle` names
  that most examples and model priors show. Sizes are strings like `"55%"`.
- **`ready-to-show` cannot be the only thing that shows the window.** Under
  Wayland an unmapped window's renderer can withhold its first frame, which is
  precisely the frame that event waits for, so the app starts and never appears
  — the DOM is there, the compositor simply submits nothing. `createWindow`
  therefore arms a fallback off `did-finish-load`; run it under
  `--ozone-platform=x11` to see the event fire normally again.
- **StrictMode replays effects on mount**, so `gitty.roots` (the **Reopen last
  session** list) is persisted only when **non-empty** — one replayed effect
  writing `[]` erases the very session about to be reopened.
- **`min-width: 0`** on `.tab-content`, `.repo-tab-shell` and `.repo-tab`: a
  flex item defaults to `min-width: auto`, so without it a tab is stretched by
  its own nowrap content and its panel group ends up wider than the window —
  one pane squeezed to a sliver, another pushed off screen.
- **React rewrites a `dangerouslySetInnerHTML` subtree wholesale.** Memoise the
  prop *object*, not just the string, and never patch the rendered DOM
  afterwards — anything anchored into it (find highlights, image `src`) must
  survive the rewrite. Find matches therefore use the CSS Custom Highlight API,
  not `<mark>`.
- **TypeScript 7** removed `baseUrl`; path aliases must be relative.
- **vite must stay on 7.x** — electron-vite 5 peers on `^5 || ^6 || ^7`.
- **An unpackaged Electron app's window class is always `electron`.** Which is
  why `setup.sh` writes `StartupWMClass=electron` into the desktop entry: that
  string is what the window list and the dock match a window against to find
  its icon. `app.setName`, `--class`, `--name`, `--wm-class-class`,
  `CHROME_DESKTOP` and renaming the binary were all measured and all leave
  `WM_CLASS` — the Wayland `app_id` — alone; only packaging Gitty into its own
  executable would change it. **A Linux fact that does not generalise**: on
  macOS the name is already right, because the application menu is
  `{ role: 'appMenu' }` and Electron labels it with `app.name`, which
  `app.setName('Gitty')` has set before any window exists.
- **An application menu must exist.** Without one Chromium binds no edit
  accelerators at all and Ctrl+C on selected diff text silently does nothing.
  The menu bar itself is hidden (`autoHideMenuBar`). That menu is also why
  **Ctrl+C is not handled in the renderer at all**. The second copy chord,
  Ctrl+Shift+C, is ours (`copy.ts`, wired in `App.tsx`), because three different
  things hold a selection: the document, xterm and the HTML preview's iframe.
  `TerminalPane` must tell xterm not to pass that chord (and `Ctrl+Tab`) to the
  shell, which would otherwise arrive as an interrupt.
- **`app.setName('Gitty')` runs before anything else**, or an unpackaged run
  scatters state into `~/.config/Electron`.
- **Linux runs with `ELECTRON_DISABLE_SANDBOX=1`** (set by `run.sh`);
  `chrome-sandbox` cannot keep a root-owned setuid bit inside `node_modules`.
- The repository to open is resolved as `$GITTY_REPO`, else the first argv entry
  that is a directory (argv also holds the electron binary and the entry
  script), else cwd.

## Conventions

- Keep `CHANGELOG.md` current (Keep a Changelog format). Released versions are
  tagged `vX.Y.Z` with a matching GitHub release; put new work under
  `## [Unreleased]`, not into a published section. Releasing is: bump
  `package.json` (and the lock), close `## [Unreleased]` as the new version,
  bump the version in the README's **download links** — they name the file, so
  they go stale silently — and push the tag, which is what builds the packages
  and creates the release.
- Files under `ref/` — specs and any other standalone documents — are named
  with a date prefix: `YYYY-MM-DD-<name>.md`, so they sort by the day they were
  written and each carries its date in its name. Two exceptions: the README
  translations, whose filenames are globbed by README.md as `README.<lang>.md`
  and which record their translation date inside; and the subsystem specs listed
  below, which are living documents named for the subsystem rather than a day.
- Comments explain why, not what — the existing ones mark git format quirks and
  layout constraints that are not obvious from the code.
- A design decision worth keeping goes into the matching spec under `ref/spec/`,
  not into this file. This file grows only when a *rule* changes.

## Where the design is written down

| file | what it covers |
| --- | --- |
| `ref/spec/main-process.md` | staging and the patch surgery, search and the commit graph, git access, the local web server, gource, recent repositories, one instance or several, terminal sessions, the watcher and refresh, the stall log |
| `ref/spec/renderer.md` | messages and i18n, time, settings, tabs, full screen, hiding panes, the `View` union and file icons, browsing history, browsing another branch, DiffPane, finding text |
| `ref/spec/file-viewers.md` | CodePane, MarkdownPane, ImagePane, highlighting, the two outlines, links and images |
| `ref/spec/plugins.md` | what a plugin is and is not, the one channel, preferences and settings rows, strings, the `marks` extension point |
| `ref/spec/semantic-reading.md` | the semantic-reading plugin: the analysers, the reader's two config files, how a mark reaches the document |
| `ref/spec/lazy-loading.md` | the four chunks, the import invariant, how to add a heavy dependency |
