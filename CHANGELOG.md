# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The repository menu's search falls back to the disk when nothing remembered
  matches: it looks for a repository of that name where the remembered ones
  live and in the usual places under home, and asks *Is it one of these?*
  before opening anything.
- **+** and Ctrl+O open that menu rather than the folder dialog, so a
  repository is found by name; Ctrl+O again or **Open Repository…** reaches
  the dialog.

- `setup.sh` works on Windows from Git Bash: it installs `gitty` for Git Bash
  and `gitty.cmd` for cmd and PowerShell, plus Start Menu and desktop
  shortcuts. The README has the steps, the manual the details.
- **Open in File Manager** on a repository tab's right-click menu and on the
  file tree's empty space opens the repository's root directory.

### Fixed

- `npm install` on Windows no longer needs Visual Studio. node-pty's prebuilt
  Windows binaries are used as they are, instead of being rebuilt.
- `.gitattributes` keeps `*.sh` at LF, so a Windows checkout with
  `core.autocrlf` does not break `run.sh` and `setup.sh`.
- `run.sh` says so when `node` is not on `PATH`, instead of reporting a missing
  Electron binary.
- The LFS path test no longer assumes `/` as the path separator.

## [0.2.2] - 2026-11-16

### Added

- Closing the window or quitting with two or more repositories open asks first.
- The recent-repository menu remembers the last 100 repositories, shows the
  twelve most recent with **More…** for the rest, and has a search box that
  filters all of them.
- **Clear Recent** asks before emptying the recent-repository list.
- Any object or array in a formatted JSON document folds away: an arrow beside
  the line that opens it, a **…** on that line while it is shut. The ranges come
  from the formatter itself, so a bracket inside a string cannot move one.

### Fixed

- The session reopened at the next start is the set of tabs open when the
  window closed, so with several windows the one closed last wins. The manual
  no longer says open tabs are forgotten.

## [0.2.1] - 2026-09-14

### Added

- A `.pdf` opens as the document rather than as a note that it is binary, in
  the work tree and at any revision — Chromium's own viewer, with its pages,
  zoom and printing.
- Browsing a tree — the Working Tree listing or a commit's snapshot — names who
  last committed each file, where a change's row shows its churn.
- A file's right-click menu offers **Open Remote URL**: that file's page on the
  site hosting the repository, at the revision on screen or at the checked-out
  branch.
- A document tab beside the diff has the file tree's right-click menu for its
  file.
- Table columns in a markdown preview can be dragged: grab the edge of a header
  cell to widen or narrow one, and the table scrolls when it outgrows the pane.
  Double-click a boundary to go back to widths that fit the content.
- A JSON file viewed on its own has a **Format** button: it re-indents the
  document, so a minified file reads as a tree. Numbers keep the digits the file
  spells and keys their order — only the whitespace is the formatter's — and the
  button appears only where the text parses.
- Ctrl+E opens a file by name from anywhere in the window, the terminal
  included — the shell does not see the key. The letters are matched in order,
  so `dfpn` finds `DiffPane.tsx`, and a hit on a word boundary or in the file
  name ranks first. It lists the whole working directory, ignored files left
  out, and opens the pick as a document.
- A folder in the file tree has a context menu of its own: the three paths,
  **Open in Browser** for the directory listing, **Open in File Manager**, and
  a paste that lands inside that folder rather than at the root.
- A rendered markdown preview marks the blocks the diff on screen inserted or
  changed: the gutter number wears the diff's own add colours, green on the
  green background a `+` line is drawn on. A block counts as changed when any
  of the source lines it spans does, so a fence whose body was edited is
  marked even though its opening line was not.

### Changed

- A file row's line count is the number alone in English; the word was most of
  the column's width.
- A table in a preview sizes its columns to their content, wrapping or not: a
  wide column no longer squeezes the narrow ones into stacks of single letters.
- A file with no line count says how big it is instead — a binary file in the
  file tree, and every binary revision in a file's history. Sizes are measured
  for a whole history however long it is, the object headers alone being
  enough.
- A file's history reads like the commit log: a click picks a row, a double
  click opens that commit, and Shift+click on a second row diffs the file
  between the two revisions.
- The recent-repositories menu lists a renamed repository under its tab name,
  matching the button above it; the path stays on the row.

### Fixed

- Ctrl/Cmd+O opens a repository again. The terminal had the focus in every
  window that had one, and xterm passed the key to the shell instead of letting
  it reach the window — the File menu's accelerator being no help, since one
  fires only while the compositor calls the window focused.
- **Open Remote URL** is offered only where the hosting site has the commit:
  the item — and Ctrl/Cmd+click on a commit row — pointed at a page that does
  not exist yet for work that had not been pushed.
- A renamed file's diff shows what actually changed. Asking git for one path
  hid the rename — every line read as added, however little of it moved — while
  the row beside it counted the change against the old file. Staging by hunk
  follows, and leaves the rename staged.
- A file stored with Git LFS previews as the file rather than as its pointer:
  an LFS-tracked PDF showed the browser's own "failed to load" error and an
  image a broken icon, both from three lines of metadata. The object is read
  straight out of the local store, so it works without `git lfs` installed; one
  that was never fetched now says so.

## [0.2.0] - 2026-08-21

### Added

- Settings ▸ **Plugins**, a tab for the features that are not the core of a
  history browser. Each is a directory of its own with its own switch,
  settings, strings and files, and all of them start off.
- The first plugin, **Semantic reading**: a language analyser underlines the
  proper nouns in a rendered markdown document, latin words inside CJK prose
  (`GPT-4`, `Claude`) take a colour of their own, and the end of each sentence
  takes weight and a little extra room after it. **Analyser** is
  **jieba** (local, CJK) or **Model** (any OpenAI-compatible endpoint). Two
  JSON files hold what a mark looks like and how to reach the model; both open
  from its settings rows, and neither is in any repository.
- **Pull** offers a rebase when the branches have diverged: the fast-forward
  fails, a dialog asks, and yes re-runs the pull with `--rebase`. Declining
  shows git's refusal as before.
- Tab bar: drag a tab to reorder it (the order is remembered like the open set
  is). Right-click a tab for **Rename tab…** or **Close repository**; a rename
  shows in the tab bar and the title bar, is remembered per repository, and
  leaves the real path in the tooltip.
- Settings ▸ Session ▸ **Instances**: **Single**, the new default, keeps one
  Gitty per user — `gitty <repo>` from any directory adds the repository as a
  tab to the window already running and raises it, and the second launch exits
  at once. **Multiple** is a window per launch. Applies to the next `gitty`
  typed, not at the next restart.
- File tree: **Pull Submodule** on a submodule's row, in the Changes and Working
  Tree views. Moves it to the tip it tracks, cloning one never checked out; the
  superproject keeps its recorded pointer, so committing that is yours. Git's
  output lands where push and pull report.
- Markdown preview: **Ctrl/Cmd+click** a link that names a repository directory
  opens the file pane on that folder — the work tree for a document read from
  the disk, that commit's snapshot for one read at a commit.

- Selecting a commit shades the log by ancestry: the rows it is built on and
  the rows built on it stay as they are, everything else recedes. The walk
  covers the commits loaded so far.

- Dragging a separator to a window edge folds that side away — a row, or one
  side of a row — and gives its neighbour the freed space; dragging the
  separator back restores the split.

### Fixed

- The commit log is ordered by the author date, the one in its column. git
  orders by the commit date, which a rebase, a cherry-pick or a squashed pull
  request moves to the day the work was replayed — so a branch merged from
  someone else landed in a block of its own instead of among the dates it was
  written on. A file's history is ordered the same way. Where ancestry still
  puts a date out of order — a parent authored later than the children replayed
  on top of it — the stamp is marked and its tooltip says why.
- A file's history counts the lines of every revision instead of deriving all of
  them from the newest one's churn. The derivation only held down a single
  lineage, so any file two branches had both touched showed wrong lengths from
  the first crossing downwards. One `git cat-file --batch` reads them all.
- A rebase no longer hides the newest commits in a log that has been scrolled:
  refreshing re-reads the whole loaded window and replaces it, where it used to
  append what it did not recognise.
- A selection whose commit a rebase rewrote goes back to **Changes**, closes the
  documents read at it and leaves the browsing history. The panes used to go on
  showing a commit that had left the branch.
- **Open Remote URL** expands a bare host through `~/.ssh/config`
  (`git@github:…` → github.com, restoring `ssh.` transport endpoints) and
  remembers each repository's resolution on disk, so reopening it skips the
  re-derivation.

## [0.1.9] - 2026-08-18

### Added

- <kbd>F1</kbd> shows every shortcut in a sheet over the window, grouped by
  what it acts on — also **Help ▸ Keyboard Shortcuts**. The chords it names
  come from the constants the handlers use, so the sheet cannot drift from the
  keys (`src/renderer/src/components/HelpPane.tsx`). The About dialog links to
  it, beside the link to the home page.
- A commit's right-click menu offers **Open Remote URL**: the commit's page on
  the site hosting the repository, inferred from the remote. GitLab, Bitbucket
  and the `/commit/<hash>` hosts are known; where nothing can be inferred the
  item stays away (`src/main/remote.ts`, `test/remote.test.ts`).
  <kbd>Ctrl/Cmd+Click</kbd> a commit row opens the same page.
- **Run in the Terminal**, on an executable file in a snapshot: the commit is
  checked out into a temp work tree and `cd <tree> && ./<file>` is typed into
  the terminal pane, unrun — the program as it was then, beside the files it
  had then, and in a work tree git still answers questions about. A tree over
  256 MB is refused rather than checked out.

### Changed

- Both filter boxes read a **regular expression** by default. The file tree's
  takes `\.tsx?$` or `main|renderer` over the whole path, falling back to a
  literal substring while the expression is half typed; the log's
  **Message / Author** and **Content regex** modes now pass
  `--extended-regexp`, so `fix|revert` is either word rather than that text,
  and fall back to a literal search the same way instead of coming back empty.

- Marking a second commit to diff the pair is <kbd>Shift+Click</kbd> or
  <kbd>Space</kbd>; <kbd>Ctrl/Cmd+Click</kbd> now opens the commit's page on the
  hosting site.

- Files copied in a file manager can be **pasted into the file tree** — the
  tree's own right-click for the repository root, a file's right-click for the
  directory beside it, or <kbd>Ctrl+V</kbd> with the pane focused. Cut files
  move; a name already taken is asked about once, keep both or replace. Only in
  **Changes** and **Working Tree**, the two views that are the directory on
  disk. The clipboard shapes a desktop uses are parsed in
  `src/main/clipfiles.ts` (`test/clipfiles.test.ts`).

- <kbd>Ctrl+B</kbd> browses the working tree, and clears the window for it:
  Commits and Terminal go, leaving the tree and what it opens. The **Changes**
  row's menu item takes the same layout. The key is kept from the shell, tmux's
  prefix being what it is (`src/renderer/src/panes.ts`, `test/panes.test.ts`).

- <kbd>Ctrl+D</kbd> is its pair: back to the changes, with all four panes. In a
  terminal it stays end-of-input — that is how a shell is left. Both keys are
  listed in the file pane title's tooltip.

- The repository search box takes a query: `foo in:*.py` limits it to those
  files, `-in:test/*` leaves files out, `-foo` drops the lines holding it,
  several words must share a line, and quotes make a phrase — or search an
  operator literally. `foo in *.py` reads the same, but only when a path
  follows, so `for x in list` stays four words
  (`src/shared/query.ts`, `test/query.test.ts`).

- File names in the tree carry a type icon: the shape is the family — source,
  data, markup, prose, image, archive, script, lockfile, compiled output — and
  the colour is the language, so `.ts` and `.py` share a glyph and differ in
  hue. Eighteen hand-drawn glyphs rather than an icon package, and palette
  variables rather than brand colours, so both themes are one table
  (`src/renderer/src/icons.ts`, `test/icons.test.ts`). An unknown extension
  gets a plain page. `.py` is the exception to the colour rule: Python is drawn
  as its own two-tone mark, which a reader picks out faster than any tone of
  the shared glyph.

- A Wayland session whose monitors are scaled differently no longer leaves the
  interface shaking. Chromium could be left flipping the window's scale factor
  between two monitors — measured at some thirteen times a second — laying the
  page out again at every flip, worst of all in full screen. Gitty now notices
  two scales at startup and starts itself again with Chromium's fractional
  scaling switched off, before any window is on screen. The cost is that the
  desktop's scaling is then ignored: the interface renders smaller, and
  <kbd>Ctrl+=</kbd> zooms it back. `GITTY_DISABLE_FRACTIONAL_SCALE=1` asks for
  it whatever the monitors say, `=0` refuses it.

- The commit filter is behind a **Filter** button in the Commits header instead
  of standing above the log always. Closing it — the button, the ✕ or
  <kbd>Esc</kbd> — drops the filter, so a narrowed log always has the box above
  it saying why.

- The diff header's widen-back button reads **All** rather than **Show Whole
  Diff**: one word in a crowded header, with the tooltip saying what it widens
  to.

- **Send** and its command picker moved to the terminal pane's header, beside
  the splits: the shell they type into is what they touch. They are no longer
  tied to the Changes view, so the hand-over is there while browsing a commit
  or the working tree.

- **Working Tree** lists ignored files too — build output, `node_modules` — in
  dimmed italics, and dims a folder that holds nothing else. They were the one
  part of the directory the view left out. No line counts for them: counting
  reads every byte.

- The Changes pane's title is a picker: it opens a menu of **Changes** and
  **Working Tree**, ticked at whichever is on screen. Browsing the whole
  directory no longer needs the Changes row's context menu, and a commit or a
  snapshot has a second way back. **Back to Changes** is gone from the working
  tree's header, where the picker now says the same thing; a commit, a range or
  a revision's snapshot keeps it. Double-clicking the title itself no longer
  toggles full screen; the rest of the header still does.

## [0.1.8] - 2026-08-16

### Added

- A source file opened whole gets an **Outline** beside it: its classes,
  functions and members as a tree, indented by nesting and coloured by what
  each one declares. Click an entry to jump; the entry you have scrolled into
  is marked. Sixteen languages, read by declaration rather than parsed
  (`src/renderer/src/symbols.ts`, `test/symbols.test.ts`); a file with nothing
  to list shows no panel.

- **File history** carries a line-count column: how long the file was at each
  of its commits. Only the newest revision is read; the rest are derived
  backwards from `--numstat`, so a long history costs two `git log` calls.
  A binary revision, and anything older than one, shows nothing.

- <kbd>Ctrl+F</kbd> in the file tree filters it: a box above the tree, the
  paths holding that text and the count of how many are left. Matching is
  case-insensitive and against the whole path, so `src/main` keeps that
  subtree; nothing stays collapsed while the box has text. <kbd>Esc</kbd> or
  another commit clears it.

- <kbd>Ctrl+Tab</kbd> moves full screen on to the next pane, <kbd>Ctrl+Shift+Tab</kbd>
  back — hidden panes skipped, wrapping at either end. Only while a pane fills
  the window, where there is no other pane to click; the shell does not see the
  key either.

### Changed

- Opening a repository is one **+** rather than two: the title bar's is gone and
  the tab bar's takes over its accent, beside the tabs it adds to.
- Each entry in the **recent repositories** menu carries an **×** that forgets
  it. Right-click did this before and still does; now it can be seen.
- The diff header's view switch is one **Inline** button, pressed or raised,
  the way **Wrap** beside it works — not a label that renamed itself.
- The work-tree header's **Search** button also does **Filter**; the arrow
  beside it picks which. <kbd>Ctrl+F</kbd> still opens the filter, and only one
  of the two boxes is open at a time. The search box gains the **✕** the filter
  has, and both close when another commit is selected.
- **Send to agent** is now a picker naming the command plus a **Send** button.
  The command is the remembered list's head — the last one run; an empty list
  disables Send.
- **Send to agent** is no longer disabled when the index is empty; it types its
  command into the terminal regardless.
- The **Markdown outline** setting is now **Outline**: the one switch governs
  the headings beside a rendered document and the symbols beside a source file.
- The title bar's two branch names each hover-explain themselves — checked out
  versus being read. The branch menu now hangs off the name being shown; while
  another branch is browsed the checked-out one is plain text, since nothing
  here checks anything out.
- The terminal header no longer repeats the repository path; the tab bar and
  the title bar already name it, and a long path crowded out the split buttons.
- The document strip moved out of `RepoTab` into its own hook (`useDocs`);
  behaviour is unchanged.
- The file pane — its header, the search and tree-filter strips and their state —
  moved out of `RepoTab` into a `FilesView` component; behaviour is unchanged.
- The diff pane's header — the widen, index-side, preview, collapse, wrap,
  outline and view buttons, plus the document-tab strip — moved out of `RepoTab`
  into a `DiffHeader` component; behaviour is unchanged.
- The title bar's **Refresh** button hover-tells its shortcut: <kbd>F5</kbd> /
  <kbd>Ctrl+R</kbd>.
- The commit log's header keeps **Push** and **Pull**; the graph and
  all-branches switches, gource and opening the repository in the browser are
  one **⋯** click behind.
- The title bar's empty space hover-tells that <kbd>Alt</kbd> shows and hides
  the application menu; not on macOS, whose menu bar is always on the screen.
- The application menu follows the language setting end to end — the Edit
  menu and every View role carry explicit labels, which Electron otherwise
  renders in its own language — and gains **File ▸ Close Repository**
  (<kbd>Ctrl+W</kbd>), **View ▸ Refresh** and a **Help** menu (**About Gitty**,
  **GitHub**).
- The uncommitted changes are **Changes** throughout — the top-left pane's
  title, the log's first row and the back buttons — while **Working Tree** is
  reserved for browsing the whole directory.

## [0.1.7] - 2026-08-15

### Added

- Linux packages: a `.deb` and an `.AppImage`, built by electron-builder
  (`electron-builder.yml`, `npm run dist`) and attached to every `v*` tag by a
  release workflow. The `.deb` installs `/usr/bin/gitty` and a menu entry,
  needs no Node, and runs with Chromium's sandbox **on** — its `postinst` sets
  `chrome-sandbox` up and installs an AppArmor profile. The AppImage can do
  neither and may need `--no-sandbox`; it is the second choice.
- CI on pull requests: typecheck, tests and a build.
- **Staging.** Click a file's status column in the work tree to stage or
  unstage it; the context menu has **Stage** / **Unstage** and **Discard
  Changes…**, which confirms natively and says there is no undo. Every hunk
  header in a one-file diff carries a **Stage** button, and selecting lines
  turns it into **Stage 3 lines** — unselected additions leave the patch,
  unselected deletions become context, the header is recomputed. The patch is
  `git diff` for staging and `git diff --cached -R` for unstaging, never the
  HEAD diff the pane shows for a whole work tree, which merges both. Zero
  context adds `--unidiff-zero`; a whitespace-ignoring diff withdraws the hunk
  buttons rather than applying a patch that does not hold every change.
  A failed apply shows git's own stderr.
- **Send to agent**, in the work-tree header: types a command into the focused
  shell and presses Enter. No model is called from inside Gitty and nothing
  leaves the machine; the agent runs where there is a real tty, so its prompts,
  hooks and gpg signing all work. The arrow beside it holds the choice of
  command — the remembered ones, the current one ticked, an **×** to forget one
  (confirmed natively), and **New command…** for one that is not in the list. The list starts as
  suggestions and grows from what is actually run. **Copy Staged Diff** on the
  work-tree row's menu covers the case where the conversation is in another
  window.
- **Graph**: the commit log draws lanes beside the hashes, so a merge shows
  where it came from and a branch shows where it parted. The lanes are computed
  from the commits' parents — `git log --graph`'s ASCII is typeset for a
  terminal and would be brittle to parse and impossible to draw otherwise — and
  the whole loaded list is laid out from the start each time, which is what
  keeps the first page from being redrawn when the second arrives. Ten lanes,
  then the overflow shares the last column. **All Branches** (`git log --all`)
  shows every branch at once, beside the branch menu's one at a time.
- The commit filter has a mode: **Message / Author** as before, or git's
  pickaxe over the diffs themselves — **Content** (`-S`, where a string's
  number of occurrences changed) and **Content regex** (`-G`, any diff that
  matches). That is the question blame cannot answer: which commit introduced
  this line. The box reports that it is searching, and changing the query kills
  the search still running rather than letting it finish for nobody.
- **History of These Lines** on a blame row: `git log -L` over the selected
  lines (or the clicked one), as a document showing each commit that touched
  them and what it did. Blame says who last; this says how it got this way.
- **Ctrl+click** a link in a rendered markdown document to open the file it
  names, when that file is in the repository. It opens as its own document
  beside the diff, at the revision the document itself was read at, so a README
  at an old commit leads to that commit's files. A `#fragment` opens it at that
  heading. Hovering the link says so; a link out of the repository, or to the
  web, is unchanged.
- **Search** in the working-tree header runs `git grep` and opens the hits as a
  document grouped by file. Clicking one opens that file at that line, marked.
  The search follows the revision on screen — the work tree, or the commit or
  snapshot being read — and stops at 2000 hits like an oversized diff.
- A README section on what Gitty does not do — rebase, merge, cherry-pick,
  conflicts, branch surgery — and why the shell in the same window is the
  answer rather than half a button.
- README translations for 한국어, Русский and Português; the five existing
  translations updated to match the English README.

### Security

- Every local web-server URL now carries a per-session token, `/t/<token>/…`,
  which **Open in Browser** and **Copy Commit URL** include. Binding
  `127.0.0.1` keeps other machines out but not other pages in your own browser,
  and behind that port is the full contents and diffs of every open repository.
  A wrong token gets a 404, not a 403; a request whose `Host` is not loopback
  is refused, which is what stops DNS rebinding; and the pages carry
  `Referrer-Policy: no-referrer` so an outward link cannot leak the token,
  plus `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. The
  token changes each launch, so old URLs stop working — the README's "while the
  repository is open" is now "while this session is running", and the claim
  that the server was "your own browser and nobody else's" is gone with it.

### Changed

- A new README screenshot (`ref/gitty-0.1.7.png`), showing the window as it is
  now: **Send to agent** in the work-tree header, documents open beside the
  diff, the lane graph. The 0.1.6 image stays where it is — the translated
  READMEs are dated snapshots and still point at it.
- The README is 660 lines shorter than it was: everything pane-by-pane — the
  window, the panes, finding text, the settings table, the shortcuts and the
  platform notes — moved to **[ref/readme/manual.md](ref/readme/manual.md)**,
  which the README links to. A manual and a business card should not be the same
  file. The manual has translations of its own — `ref/readme/manual.<lang>.md`,
  in the same eight languages as the README's — and both sets are snapshots:
  the English README and the English manual are the official versions.
  (The review that asked for the split also asked for a ten-second GIF in the
  screenshot's place. That needs a screen recording of a real session, which
  this change cannot produce; the static screenshot stays.)
- The packaged desktop entry matches its window on `gitty`, so another
  unpackaged Electron app can no longer borrow Gitty's icon. `setup.sh` keeps
  `StartupWMClass=electron`: that route really is an unpackaged Electron, which
  reports nothing else.
- `electron` moved to `optionalDependencies`. electron-builder refuses to
  package a project that has it in `dependencies`, and npm installs optional
  ones anyway, so `npm install -g gitty-desktop` is unaffected.
- README's **Running** section leads with the `.deb`; Node 20 is listed as a
  requirement of the npm and source routes only.

### Fixed

- `npm ci` no longer fails on a clean checkout, which had taken CI with it.
  Electron 43 downloads its binary from an `install-electron` bin rather than
  an install script of its own, so `postinstall` runs that first — otherwise
  the rebuild looks for a version file nothing wrote. The lockfile's `resolved`
  URLs name the official registry again, rather than the mirror the machine
  that wrote them was configured for. CI and the release workflow build on
  Node 22: Electron 43 declares `engines: node >= 22.12`, and npm *skips* an
  optional dependency whose engines do not match rather than failing — which is
  how a checkout ended up with no Electron at all. The README asks for 22.12
  where it asked for 20.

## [0.1.6] - 2026-08-14

### Added

- <kbd>Ctrl+F</kbd> finds text in whatever the right-hand pane is showing: a
  diff, a file, rendered markdown, an HTML preview, a blame or a file's history.
  Matches are highlighted with the current one picked out; <kbd>Enter</kbd> /
  <kbd>Shift+Enter</kbd> and the arrows walk them, wrapping at either end;
  <kbd>Esc</kbd> closes; the count says where you are. The search reads the
  rendered text, so a phrase is found across markdown's bold and code spans.
  Views that render in chunks render the rest as the strip opens, so the count
  covers the whole file or diff; a collapsed file in a multi-file diff is not
  searched.
- <kbd>Ctrl+Shift+C</kbd> copies as well as <kbd>Ctrl+C</kbd>, everywhere in
  the window. In a terminal it takes xterm's own selection instead of reaching
  the shell as an interrupt; in an HTML preview, the selection inside the frame.
  With nothing selected, the key is left alone.
- Clicking the **Gitty** brand in the title bar opens an **About** dialog: the
  version, build time, author, and the Electron, Chromium and Node versions. It
  is drawn by the renderer, so the home-page link opens in the system browser.
- Whole-file blame is syntax-highlighted like the code viewer, so the lines in
  the blame pane carry the same token colours as the diff and the file.
- Each blame row shows the date of the commit that last touched the line, read
  through the same time-zone and relative-time settings as the rest of the UI.
- **Markdown source lines**, a View setting: each block of a rendered document
  is numbered in the left gutter with the line it starts on in the source.
  Headings, paragraphs, list items, tables, fenced code and images all get one,
  so a passage in the preview can be found in the file. Off by default.

### Changed

- **Font size** goes from 9 to 20, where it was 11 to 16.
- **Monospace font** and **Shell** are dropdowns rather than text fields.
  Fonts are the monospace families installed on this machine, measured by
  probing; shells come from `/etc/shells` plus the usual paths, `COMSPEC` and
  PowerShell on Windows. A stored value the machine no longer offers stays in
  the list.
- Settings is three tabs — Appearance, View, Session — rather than one column
  that had grown long enough to scroll. The panels stay mounted behind the
  tabs, so every control keeps its state and the dialog is sized by its tallest
  section rather than jumping as you switch. It opens on Appearance each time:
  a short-lived dialog that resumes where it was left is a small puzzle.
- Browsing a whole repository — the work tree, or a commit's snapshot — starts
  with every directory collapsed, while a list of changes still opens expanded.
  What you expand stays open while that tree is on screen; showing another tree
  starts from the default again.
- The file tree lists directories before files at every level, so a folder is
  never buried among the names of its siblings.
- **File sorting** in Settings: natural (the default) or git's byte order, for
  anyone who wants the tree to match what `git ls-files` prints.
- The file tree sorts names naturally. Git orders paths by byte, which puts
  `SKILL_W10` between `SKILL_W0` and `SKILL_W1` and every capital before every
  lowercase letter; the tree reads the digits in a name as a number and treats
  case as a tiebreak. It sorts in one place for all five commands the entries
  come from, by path segment — a whole-string compare could drop `a.txt`
  between two files in `a/`, drawing the `a/` heading twice.
- The markdown outline is a resizable panel: drag the line between it and the
  document (it used to be a fixed 210 pixels). The size is shared by every
  document in the repository and lasts as long as the window.
- **Open Repository** moved from the right-hand end of the title bar to a **+**
  beside the repository button, drawn in the accent colour — with one repository
  open it is the control the window still needs to offer.
- The work tree row's right-click menu offers **Browse Working Tree**: the
  repository as it is on disk right now, tracked and untracked files alike,
  contents read from the work tree. It used to say **Browse Snapshot** and open
  the tree at HEAD, omitting uncommitted work. A commit's **Browse Snapshot**
  still browses that revision.
- The blame pane's rows now show just the author and a compact date — the SHA
  column is gone. A date from the current year drops the year ("Jul 1"); an
  older one keeps it ("Jan 15, 2025"). The author and date carry the colour the
  SHA used to carry, so adjacent commits are still told apart by hue. The full
  SHA is in the row's tooltip; right-clicking a row copies it.

### Fixed

- Two user-visible strings bypassed the message tables — the lazy-chunk loading
  fallback and the oversized-image notice. Both now read through the tables.
- Rendered markdown, the code viewer and blame rebuilt their DOM on every state
  change — markdown the whole document on every scroll, the others every line.
  React sets innerHTML whenever the `dangerouslySetInnerHTML` prop is a different
  object, and a fresh `{__html}` per render always is; the `{__html}` is now
  memoised, leaving the nodes alone — which large files feel and which the find
  highlights need to survive.

## [0.1.5] - 2026-08-12

### Added

- Six new settings, and a third **Session** group in the dialog:
  - **Context lines** — 0 to 25 lines of context around each hunk (git's `-U`,
    default 3).
  - **Ignore whitespace** — Off, Amount (`-b`) or All (`-w`). Reindented or
    rewrapped code reads as unchanged. The file list's churn counts follow the
    same setting, so `+12 −3` cannot claim lines the diff refuses to show.
  - **Reopen last session** — the repositories open at exit come back as tabs
    at the next launch; the one Gitty started with stays active, and any that
    have since been deleted are dropped.
  - **Monospace font** — the family the panes and the terminal are drawn in.
    Empty keeps the built-in stack; a font the system lacks falls through to it.
  - **Time format** — Absolute or Relative (`28m ago`). Hover tips stay absolute
    either way.
  - **Shell** and **Login shell** — which shell a terminal starts and whether it
    sources the user's profile. Both apply to the next split, not to running
    shells; an unknown shell path falls back to the system's.
- **Time zone** in Settings: the zone every date and time on screen is rendered
  in — the machine's own by default, UTC, or any zone the system knows. The
  commit log, a file's history and the commit header follow it, as does the
  cutoff between a time and a date, which is a calendar day in the chosen zone.
  Hover tips spell the time out with its zone.
- A staged file's name is green in the work tree, the colour its index column
  already carried. Partly staged counts — the index has something either way —
  and a staged deletion keeps the line through its name as well.
- **Delete File…** in the work tree's file context menu: it asks first in a
  native dialog, then moves the file to the system trash, recoverable outside
  git as well as inside it. Where there is no trash it asks a second time and
  says plainly that the file leaves the disk. The entry belongs to the work tree
  alone — a commit's file list and a snapshot describe revisions, with nothing
  on disk to delete.
- Per-file churn in the file tree, after the line count: `+12 −3`, the lines
  this change added and removed in that file. Measured against HEAD in the work
  tree and against the parent for a commit or a range. A snapshot is a tree
  rather than a change and shows none, as do binary files and merge commits.
- <kbd>Ctrl+Shift+0</kbd> shows all four panes again, restoring a layout hidden
  down to one pane. It belongs with <kbd>Ctrl+1</kbd>…<kbd>Ctrl+4</kbd> but
  takes the Shift, since <kbd>Ctrl+0</kbd> is reset-zoom.
- **Gource**, in the commits pane when [gource](https://gource.io/) is on
  `PATH`: an animation of the repository growing, commit by commit, in its own
  window. A day of history per half second, idle files kept on screen, long gaps
  skipped. Where gource is not installed the button is not rendered — nothing is
  downloaded or installed.
- Browsing history: **‹** and **›** at the left of the title bar (<kbd>Alt+←</kbd>
  / <kbd>Alt+→</kbd>) and a **▾** listing the places viewed, most recent first,
  with a dot on the current one. A place is the whole of what the top panes were
  showing — view, selected file, open document — so going back to
  `src/main/git.ts @ 7bb7787` puts that file back at that revision. Each tab
  keeps its own fifty places; not remembered across restarts.
- A macOS launcher: `setup.sh` now writes a minimal `Gitty.app` to
  `~/Applications` (with a Desktop symlink) wrapping the same `run.sh` —
  unpackaged, but giving Finder and the Dock a name and an icon built from
  `build/icon.png` via `sips` and `iconutil`. Because a Finder-launched bundle
  inherits launchd's minimal `PATH`, `node` and `npm` are resolved at install
  time and prepended; re-run `setup.sh` after switching Node versions. Requested
  by @OrangeViolin ([#2]).

### Fixed

- Font size and row height started at their minimums (11 and 18) on a fresh
  install rather than their defaults (12.5 and 20): the stored value was read
  as `Number(localStorage.getItem(…))`, and `Number(null)` is 0, which is
  finite — so the fallback never ran and the clamp took over.
- A long file name no longer pushes its line count and churn out of the file
  tree: only the name gives way now, ellipsised to whatever room the rest of the
  row leaves.
- `setup.sh` wrote a `gitty.desktop` entry on macOS, where nothing would ever
  read it. The shortcut now follows `uname`.
- `run.sh` now says so when Electron's binary was never downloaded, instead of
  launching an install that hangs on "Downloading Electron binary…". The path
  comes from the package's own `path.txt`, so macOS resolves too (the old
  `dist/electron` check was Linux-only, and `.bin/electron` is a symlink that
  exists regardless). A missing binary reports how to reinstall,
  `ELECTRON_MIRROR` included. Reported and fixed by @OrangeViolin ([#1], [#4]).
- `package.json` read `0.1.3` at the `v0.1.4` tag, so the release described
  itself as the one before it. Thanks @OrangeViolin ([#3]).

[#1]: https://github.com/baojie/gitty/issues/1
[#2]: https://github.com/baojie/gitty/issues/2
[#3]: https://github.com/baojie/gitty/pull/3
[#4]: https://github.com/baojie/gitty/pull/4

## [0.1.4] - 2026-08-08

### Added

- Every file in the tree now shows its line count beside the name ("142
  lines"), counted from disk for the work tree and from the revision wherever
  else. Binary files, deleted files and files over 8 MB show none.
- Images are shown, not reported as binary. Opening a `.png`, `.jpg`, `.gif`,
  `.webp`, `.bmp`, `.ico`, `.avif` or `.svg` — from the file tree, the header
  button or a snapshot — gives the picture itself, fitted to the pane over a
  checkerboard, with its pixel dimensions and size underneath. Click for actual
  size and scroll around; click again to fit. The bytes come from disk in the
  work tree and from the commit everywhere else.
- Markdown previews show the images they reference: a relative path is resolved
  against the document and read from the repository at the document's own
  revision, so an old commit renders with the screenshots it shipped with; one
  missing at that revision leaves a placeholder carrying its alt text. Images
  from the web are still not fetched. Selecting an image renames the header's
  **View File** to **View Image**.
- A **Language** setting in the Settings dialog switches the interface without
  restarting: panes, menus, dialogs and the application menu's labels all change
  together. Nine languages — English, 简体中文, 日本語, 한국어, Français, Deutsch,
  Español, Русский, Português — all translated in full; English is the source
  the others are translated from.
- The commit log filters: a box above it narrows the list to commits whose
  message or author contains the text, with a ✕ to clear; typing is debounced
  and the result pages like the unfiltered log. The filter is a union of a
  message match and an author match — git would AND `--grep` with `--author` —
  so the two passes are merged by hash in one date-ordered pass.
- Selecting a commit shows its full message: the subject, author, date and the
  whole body sit above the file list whenever a commit or a snapshot is
  selected. A ▸ toggle folds a message with a body back to the subject and the
  metadata row.
- **Blame File** and **File History** from any file's context menu. Blame opens
  one row per source line — the commit, its author and the line itself, an em
  dash where a line is not yet committed; history lists every commit that
  touched the file, one click opening it. Both open as documents beside the
  diff, blame the revision being viewed (a commit-mode file blames that commit,
  a snapshot file the snapshot's tree), and history follows renames.
- A vitest suite for the git parsers, the only part of the app that is pure
  functions over text: `status`, `log`, `name-status`, branch and blame formats
  are parsed from fixtures without a repository. `npm test` joins `npm run
  typecheck` as the automated safety net.

### Changed

- A repository tab's tooltip now says when that repository has uncommitted
  changes.
- The README is available in five more languages — 简体中文, 日本語, Español,
  Français, Deutsch — under `ref/readme/`, linked from the English one. Each
  translation is stamped with the date it was made and says the English README
  is the official version and the only one kept up to date.
- README restructured around the window rather than the panes: the title bar —
  every button and counter in it — has a section of its own, tabs and recent
  repositories sit under it, and opening a file whole is documented beside the
  diff. Newly written up: the Settings dialog, snapshots (**Browse Snapshot**)
  and the **Word highlight** option.
- The window opens faster: the renderer bundle is split, so the app shell and
  the four panes no longer wait on the libraries only some of them need. The
  terminal (xterm), opened files and markdown previews (highlight.js,
  markdown-it) load as their own chunks only when they first appear.
- Hovering any of the four pane titles now shows **Double-click the title
  toggles full screen** alongside its shortcut.
- README screenshot updated for this release (`ref/gitty-0.1.4.png`).

### Fixed

- Yesterday evening's commits read as times still to come. The log shows a bare
  time for today's rows and a date for everything else, but "everything else"
  was the last 24 hours — at 3 PM, a commit from 9:45 the previous night showed
  "9:45 PM" with no date. The cutoff is now the calendar day. The file history
  pane shares the same stamp and was wrong the same way.
- The window could stay hidden forever on Wayland: it is created hidden and
  shown at its first paint, but an unmapped window's renderer can hold that
  frame back, and showing the window is what would release it. The load event
  now arms a fallback that shows the window a second later if the first paint
  has not.
- Around twenty strings never followed the language setting, because they were
  written into the components rather than read from a message table — **Show
  Whole Diff**, **Wrap**, **Outline**, **Preview**, **Open in Browser**, the
  document tabs, the work-tree row of the commit log and a dozen tooltips. They
  now come from the tables like everything else.

## [0.1.3] - 2026-08-07

### Added

- **Push** and **Pull** in the commits pane header, on the checked-out branch.
  **Push** carries the count of unpushed commits (**Push 3**) and greys out
  when there is nothing to send; on a branch that tracks nothing it publishes
  to `origin` and sets the upstream. **Pull** fast-forwards from the upstream
  and greys out when there is none. Git's own output appears above the log,
  clicked away when read — failures stay until dismissed. A push or pull that
  needs a credential prompt fails with git's message instead of hanging (there
  is no terminal behind them); the terminal pane is where it gets finished.
- Every pane hides and comes back: a **×** at each pane header's end hides it,
  **Panes** in the title bar lists all four with a dot on the visible ones, and
  <kbd>Ctrl+1</kbd>…<kbd>Ctrl+4</kbd> toggle them in layout order. The remaining
  panes share the space; the last visible pane keeps its **×** hidden, so the
  window is never empty. What is hidden is remembered across restarts, and
  hiding the terminal pane leaves its shells running, scrollback intact.
- The file heading stays in view while scrolling a whole-file diff: when it
  scrolls past the top of the pane it pins itself there until the next file's
  heading pushes it away. A single-file diff is unaffected.
- Every pane goes full screen, not just the diff. **⤢** at the left of each pane
  header fills the window; **⤡**, <kbd>Esc</kbd>, a header double-click or
  <kbd>Ctrl+Shift+1</kbd>…<kbd>Ctrl+Shift+4</kbd> restores the layout. The
  diff's **Full Screen** / **Restore** button is gone, its corner button
  replacing it.
- Hovering a pane title shows a styled tooltip spelling the pane's own gestures
  — the keys that hide it and fill the window — with the key labels
  colour-coded.

### Fixed

- Reading a long file no longer jumps back to the top when the file changes on
  disk. The position is kept across a reload, with the lines already loaded in
  the source view; only opening a different document rewinds.
- The window list and the dock show Gitty's icon instead of a generic
  placeholder. The desktop entry now carries `StartupWMClass=electron`: an
  unpackaged Electron app reports `electron` as its window class (its Wayland
  `app_id`) whatever `app.setName`, `--class`, `CHROME_DESKTOP` or a renamed
  binary say. Re-run `./setup.sh` and restart Gitty to pick it up.
- The work tree pane no longer gets stuck listing changes that are already
  committed. A burst of file-system events could start several refreshes at
  once, and a slow earlier `git status` landing after a newer one put its stale
  file list back on screen while the diff pane showed the real state. Replies a
  newer refresh has overtaken are now discarded, for the diff pane as well.

### Changed

- README screenshot updated for this release (`ref/gitty-0.1.3.png`).

## [0.1.2] - 2026-08-06

### Added

- The diff pane holds several documents at once: a single click still browses
  diffs in place, but double-clicking a file (or **View File** / **Preview**)
  opens it in a strip beside the diff. Each document remembers the revision it
  was opened at, closes with its own **×**, and reloads on its own when the work
  tree changes.
- A file heading inside a diff opens that file: **Ctrl+click** it, or use its
  context menu, which also copies the path and — for the work tree — hands the
  on-disk file to the system application. A rename opens the new path.
- Files in a multi-file diff fold: a triangle on each file heading collapses it
  to its name, and **Collapse All** / **Expand All** does the lot. Everything
  starts expanded.
- Every commit has a local URL: a web server inside the app (127.0.0.1 only)
  renders commits for the system browser. Right-click a commit for **Open in
  Browser** or **Copy Commit URL**; the commits pane's button lands on the
  repository's commit list, where each row links into its commit page —
  metadata, message, file list and diff. URLs work while the repository is
  open.
- The diff pane shows everything at once when no file is selected: in the work
  tree that is every uncommitted change — staged and unstaged together, with
  untracked files inlined (up to 50, then a notice, since `git diff` omits
  them); in a commit, the full commit diff. The work tree used to show nothing
  there but a prompt to pick a file.
- Browse any branch's history: the branch in the title bar is a menu of every
  local and remote-tracking branch, newest first, and picking one points the
  commit log at it. Nothing is checked out — the work tree, its diffs and the
  shells stay on the branch git is actually on — so the title bar reads
  `⎇ main › other-branch`. **Back to <branch>** returns to the checked-out one;
  each tab browses independently.
- Repository tabs: a bar along the bottom holds every open repository, each with
  its own four panes and terminal. **+** or **Ctrl+O** opens another repository
  into a new tab, a dot marks tabs with uncommitted changes, and **×** closes
  one. Switching tabs never disturbs another repository's view state or shells.
  Tabs are not persisted across restarts.
- A split terminal pane: **Split →** opens a shell beside the focused one,
  **Split ↓** below it, and a round **×** at each terminal's top right closes it
  — the last one has none. Splits nest and their separators drag; splitting the
  same way twice extends the row or column rather than nesting again. A shell
  that exits closes its own split, except the last one, which keeps the pane and
  its notice.
- Recent repositories are remembered: the title bar's repository name opens a
  menu of the last twelve, most recent first; picking one opens a new tab,
  **Ctrl/Cmd+click** or a middle-click opens in the current tab, and a
  **right-click** drops the entry. **Open Repository…** and **Clear Recent** sit
  below. The list is kept in `~/.config/Gitty/recent-repos.json`, and entries
  that no longer exist are skipped. Launching outside a work tree now falls back
  to the last repository opened.
- An application icon — the window icon on Linux and Windows, a small mark
  beside the **Gitty** name in the title bar: a dark rounded square split into
  the four panes, each tinted with its accent colour and carrying a glyph for
  what it shows. The SVG source lives in `build/` next to the rendered PNG.
- A desktop launcher from `./setup.sh`: the icon is installed into the hicolor
  theme and a `gitty.desktop` entry lands in the application menu, launching
  with a new `gitty --any` flag that starts from outside a work tree and opens
  the last repositories instead of failing. The icon theme cache is refreshed
  afterwards.
- Gitty installs from npm as `gitty-desktop`: the package ships the built
  bundle (`out/`), the icon and a `gitty` binary launching the app in the
  bundled Electron, so `npm install -g gitty-desktop` needs no checkout. Electron
  and the `node-pty` ABI rebuild moved to runtime dependencies to make it
  possible.

### Changed

- The diff pane reads as a list of files: the `diff --git a/x b/x` line is
  replaced by the path itself (`old → new` for a rename) as a full-width
  heading, files are separated by a blank line, and the hunk header is dimmed
  rather than highlighted.
- Blob hashes and the `---` / `+++` path lines are folded away; headers that
  carry meaning — `new file`, `deleted file`, `rename from` / `to`, `Binary
  files` — stay.
- **Show Whole Diff** stays in the diff header for the work tree, a commit and
  a range alike, lit while the whole diff is on screen, and also appears while
  viewing a file.
- README screenshot updated for this release (`ref/gitty-0.1.2.png`).

### Fixed

- A deleted line beginning with `-- ` (rendered `--- ` in a diff) was mistaken
  for a file header and vanished from the pane. Header prefixes now only count
  between `diff --git` and the first hunk.

## [0.1.1] - 2026-08-05

### Added

- Whole-file view beyond markdown: **View File** — a double-click in the file
  tree, the context menu, or the header toggle — shows any file's full contents
  with line numbers and syntax highlighting instead of its diff, from disk in
  the work tree and at the selected revision elsewhere. It is a one-off action:
  selecting another file or commit goes back to the diff. Snapshots are the
  exception and always view files, having no diff.
- A settings dialog (**Settings** in the title bar, File ▸ Settings, or
  <kbd>Cmd/Ctrl+,</kbd>) collects every preference: a **theme** toggle (dark by
  default, and light), font size and row height sliders, and the existing diff
  layout, word wrap, word highlight and markdown outline switches, each with a
  **Restore Defaults** button. The terminal palette follows the theme.
- Markdown preview for `.md` files, off by default: the **Preview** button
  renders the whole file — from disk in the work tree, from the selected commit
  elsewhere — with an **Outline** of its headings that indents by level, follows
  the reading position and jumps on click. Raw HTML is left inert; links open in
  the system browser.
- Colour in the markdown preview: fenced code blocks are syntax-highlighted
  through highlight.js when they name a language (22 common ones registered),
  YAML front matter is lifted out and shown as its own highlighted block, and
  headings, list markers, blockquotes, table headers, links and inline code are
  colour-coded onto the app's own palette.
- Word wrap now applies to the markdown preview too, on by default and sharing
  the diff's toggle: fenced code blocks, wide tables and long inline strings
  wrap instead of scrolling sideways.
- Full-screen mode for the diff / preview pane: its button, a header
  double-click, or <kbd>Esc</kbd> to leave. The pane is drawn over the layout,
  so the terminal underneath keeps its shell and scrollback.
- Word wrap in the diff pane, on by default, toggled from the header or the
  context menu and remembered between runs.
- Side-by-side diff view alongside the inline one: deletions are zipped with the
  additions that follow them, each pair a grid row so wrapped halves stay
  aligned. Also remembered between runs.
- Context menu in the diff pane: Copy Selection, Copy Whole Diff, and the wrap
  and view toggles.
- Minimal application menu (hidden bar) so Chromium's edit accelerators —
  <kbd>Ctrl+C</kbd> on selected diff text, <kbd>Ctrl+A</kbd> — are bound at all,
  plus File ▸ Open Repository and a View menu with reload and zoom.
- Browse Snapshot from a commit's context menu: the whole repository as it was
  at that commit, read-only — files come from the tree (`ls-tree`), contents
  from `git show`, and double-click opens a temp export with the system
  application. Nothing in the work tree or at HEAD is touched.

### Changed

- `gitty` now detaches from the terminal instead of holding it: it prints the
  pid and returns, the window survives the shell closing, and output goes to
  `${XDG_STATE_HOME:-~/.local/state}/gitty/gitty.log` (trimmed past 4 MB).
  `--fg` keeps the old attached behaviour.
- The diff pane renders in chunks of 1500 rows that grow as you scroll, instead
  of a fixed-height virtual window.
- Selected commit rows are more prominent: the cursor row gets a brighter
  background with a blue accent bar and a bold white hash, the compared (second)
  row a wider magenta accent bar.
- Word-level highlighting in the diff, on by default: changed words within a
  line get a brighter block than the row around them, in both views. Toggle it
  from the diff's context menu; very long or single-token lines fall back to the
  row-level highlight.
- Double-clicking a file views it in the pane beside the tree instead of handing
  it to the system application, which moved to the context menu as **Open in
  System App**.
- README screenshot updated for this release (`ref/gitty-0.1.1.png`).

### Fixed

- A replaced terminal session (window reload, repository switch) no longer
  writes its exit notice into the terminal that succeeded it.
- A diff-pane button with no tooltip of its own showed the header's
  "Double-click to toggle full screen" tip. Tooltips now sit on the individual
  parts; every button carries its own.
- **Show Whole Diff** no longer appears while browsing a snapshot, where there
  is no whole diff to widen back to — clicking it just emptied the pane.

## [0.1.0] - 2026-08-05

Initial release.

### Added

- Four-pane layout — working tree, diff, commit log and terminal — with
  draggable separators between every pane.
- Working tree pane: collapsible file tree with staged and unstaged status
  columns, untracked files included.
- Working Tree row pinned above the commit log: it shows how many files are
  uncommitted and selecting it brings the top panes back to the work tree. It
  takes part in keyboard navigation and is selected on startup.
- File interactions: click to diff, double-click to open with the system
  default application, right-click to open, reveal in the file manager, or copy
  the relative path, absolute path or file name.
- Commit log: paged loading (300 commits at a time, extended on scroll),
  keyboard navigation, <kbd>Enter</kbd> to show a commit's diff, and
  <kbd>Ctrl+Click</kbd> / <kbd>Space</kbd> to diff two selected commits.
- Selecting a commit swaps the top-left pane to that commit's file list;
  selecting a file there narrows the diff to that file.
- Diff pane: unified diff with old/new line numbers, hunk and add/delete
  colouring, virtualised rendering for large diffs and a 2 MB truncation notice.
- Terminal pane: a real interactive login shell rooted at the repository,
  backed by `node-pty` and rendered with xterm.js.
- Automatic refresh when the repository changes on disk, plus <kbd>F5</kbd> /
  <kbd>Ctrl+R</kbd> to refresh manually.
- Repository selection via `./run.sh [repo]`, `$GITTY_REPO`, a command-line
  argument, or <kbd>Ctrl+O</kbd> in the app.
- `run.sh` launcher that installs dependencies and rebuilds stale bundles, and
  `setup.sh` to install it as a global `gitty` command in `~/.local/bin` (or
  `/usr/local/bin` with `--system`).
- Linux runs with the SUID sandbox disabled (`ELECTRON_DISABLE_SANDBOX=1`);
  `chrome-sandbox` cannot keep its root-owned setuid bit inside `node_modules`.
- README shows a screenshot of the interface (`ref/gitty-0.1.0.png`).

[Unreleased]: https://github.com/baojie/gitty/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/baojie/gitty/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/baojie/gitty/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/baojie/gitty/compare/v0.1.9...v0.2.0
[0.1.9]: https://github.com/baojie/gitty/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/baojie/gitty/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/baojie/gitty/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/baojie/gitty/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/baojie/gitty/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/baojie/gitty/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/baojie/gitty/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/baojie/gitty/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/baojie/gitty/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/baojie/gitty/releases/tag/v0.1.0
