# The Gitty manual

**English** · [简体中文](manual.zh-CN.md) · [日本語](manual.ja.md) · [한국어](manual.ko.md) · [Français](manual.fr.md) · [Deutsch](manual.de.md) · [Español](manual.es.md) · [Русский](manual.ru.md) · [Português](manual.pt.md)

Everything Gitty does, pane by pane. The [README](../../README.md) is the short
version — what it is, why it exists, how to install it — and stays that way;
this is where the details live.

*This English manual is the official version and the only one kept up to date.
The translations are snapshots, each stamped with the date it was made; where
one disagrees with this file, this file is right.*

---

## The window

Four panes in the middle, a title bar above them and a tab bar below.

### Title bar

Left to right, it describes the active repository and then acts on it:

- **Gitty** — the icon and name at the far left open the **About** dialog: the
  version, build time, author, and the Electron, Chromium and Node versions,
  with links to the home page and to the
  [keyboard shortcuts](#keyboard-shortcuts).
- **‹ › ▾** — where you have been in this repository. See
  [Going back](#going-back).
- **The repository path** is a button: it opens the
  [recent repositories](#recent-repositories) menu.
  **+** at the end of the [tab bar](#tabs) and <kbd>Ctrl+O</kbd> open the same
  menu.
- **⎇ branch** is a button too — the branch git has checked out, and a menu of
  every other branch to read. See
  [browsing another branch](#browsing-another-branch).
- **`origin/main ↑2 ↓0`** — the upstream of the checked-out branch and how far
  ahead and behind it is. Absent on a branch that tracks nothing.
- **`3 changes`** — how many files the work tree has uncommitted, the same count
  the **Changes** row in the commits pane carries.
- **Panes ▾** — show or hide each of the four; see
  [Full screen and hiding](#full-screen-and-hiding).
- **Settings** — the preferences dialog ([Settings](#settings)),
  also <kbd>Ctrl+,</kbd>.
- **Refresh** — re-read status and log by hand (<kbd>F5</kbd> /
  <kbd>Ctrl+R</kbd>). Gitty watches the repository and refreshes on its own;
  this is for the times watching cannot see a change — on Linux, a work tree
  of more than about 8,000 directories is watched only in part.

While you are reading another branch the branch button reads `⎇ main ›
other-branch`, and errors from the last git command appear in red beside the
counts.

### Going back

Reading history means wandering: a commit, a file inside it, another commit two
pages down the log, then back to the first one. The three buttons at the left of
the title bar remember that wandering, the way a browser does.

- **‹** (<kbd>Alt+←</kbd>) returns to the place you were looking at before this
  one, and **›** (<kbd>Alt+→</kbd>) goes back to the one you stepped away from.
  Both are greyed out when there is nowhere to go, and hovering either one names
  the place it would take you to.
- **▾** lists the places themselves, most recent first, with a dot on the one
  you are at. Pick any of them to jump straight there.

A *place* is everything the two top panes were showing: the view — the
uncommitted changes, one commit, a range of two, a snapshot — the file selected
inside it, and the document opened beside the diff. So a stop reads as
`Changes`, `7bb7787 — Refresh screenshot batches`, `src/main/git.ts @ 7bb7787`
or
`blame: src/main/git.ts @ 7bb7787`, and returning to it puts the same file back
on screen at the same revision rather than merely reselecting the commit.

The history belongs to the repository, not to the window: each tab remembers its
own fifty most recent places, and switching tabs switches which ones the buttons
walk. It is not kept across restarts.

### Tabs

A tab bar along the bottom holds every open repository — its basename, a yellow
dot when the working tree has uncommitted changes, and a **×** to close it. The
dot counts anything `git status` reports, untracked files included, and it earns
its place on the tabs you are *not* looking at: the active repository already
says `3 changed` in the title bar, while a background tab is hidden entirely, so
the dot is the only sign that there is work left there. Hovering a tab names the
repository and says so in words.

**+** (and <kbd>Ctrl+O</kbd>) opens another repository into a new tab, by way of
the [recent repositories](#recent-repositories) menu; the title
bar always shows the active one. Each tab keeps its own panes and terminal, so a
commit you are reading and a shell you left running stay exactly where they were
when you switch away and back. Drag a tab to a new place in the bar to reorder
the repositories. Right-clicking a tab offers **Rename tab…** — the name is
remembered for that repository, shown in the tab bar and the title bar, with the
real path still in the tooltip — **Open in File Manager**, which opens the
repository's root directory, and **Close repository**. Closing the last tab
leaves an empty window with a button to open the next repository.

The tabs open when Gitty exits are reopened at the next start — the
repository it was started with still ends up the active tab, and one that has
since been deleted is quietly dropped. **Reopen last session** in the settings
turns this off. With several windows (**Instances: Multiple**) the window
closed last is the session kept.

Closing the window or quitting with more than one repository open asks first,
so a stray <kbd>Ctrl+Q</kbd> does not take the whole set with it. One open
repository closes without a question.

### Recent repositories

The repository path in the title bar is a menu of the repositories opened
before — basename plus its parent directory — most recent first.

- **Click** — open it in a new tab.
- **Ctrl/Cmd+click** or **middle-click** — open it in the current tab, replacing
  the repository there and keeping the tab's place in the bar.
- **×** at the right of an entry — take it out of the list; right-clicking the
  entry does the same. The menu stays open, so several can go in a row.

The menu shows the twelve most recent; **More…** at the bottom lists the rest.
The search box at the top filters the whole list as you type — every word has
to appear in the repository's name or its directory, and name matches come
first. <kbd>↑</kbd>/<kbd>↓</kbd> move, <kbd>Enter</kbd> opens in a new tab,
<kbd>Ctrl+Enter</kbd> in the current one, <kbd>Esc</kbd> closes.

When nothing in the list matches, the search goes to disk: Gitty looks for a
repository whose directory name matches, in the places your remembered
repositories live — each one's parent directory, and the directory above that
searched two levels deep, so `~/work/<group>/<repo>` is covered without being
configured —
and in the usual places under home (`~/work`, `~/code`, `~/src`,
`~/projects`, …). What it finds is listed under *Is it one of these?* with its
full path, and opens only when you pick it; once opened it joins the list.

**+** and <kbd>Ctrl+O</kbd> open this same menu, so a repository is found by
typing its name; <kbd>Ctrl+O</kbd> a second time, or **Open Repository…**, goes
on to the folder dialog.

**Open Repository…** and **Clear Recent** sit below; Clear Recent asks before
emptying the list, which has no undo. The list lives in
`~/.config/Gitty/recent-repos.json`, holds the last hundred repositories, and
skips any that have since been moved or deleted.

### Full screen and hiding

Every pane header carries the same two controls: **⤢** at its left fills the
window with that pane, and **×** at its right hides it.

Full screen covers everything else, including the title and tab bars, and the
panes underneath keep working — the terminal goes on running while it is
covered. **⤡** in the same corner, <kbd>Esc</kbd>, a double-click on the
header (on its empty space — the buttons, and the Changes pane's title menu,
have their own meaning), or <kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd> restores the
layout. Only one pane is full screen at a time.

<kbd>Ctrl+Tab</kbd> moves full screen on to the next pane in layout order and
<kbd>Ctrl+Shift+Tab</kbd> back, skipping the hidden ones and wrapping round at
either end. It works only while a pane fills the window, which is where it is
needed: with the layout on screen every pane is already a click away. The
terminal does not see the key, so it works from inside a shell too.

Hiding is the other direction — any pane can be put away and brought back:

- **Panes** in the title bar lists all four, with a dot beside the visible ones;
  clicking one toggles it, and **Show All Panes** restores the four-pane layout.
- <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> toggle Files, Diff, Commits and
  Terminal, in that order.
- <kbd>Ctrl+Shift+0</kbd> brings all four back — zero for "all of them", one
  key past the four that each toggle one. It takes the Shift because
  <kbd>Ctrl+0</kbd> is the browser engine's reset-zoom, which the View menu
  keeps.

Whatever is left shares out the window, so hiding the commits pane gives the
diff the full height. The last visible pane has no **×** — an empty window
would leave nothing to click. Hidden panes are remembered across restarts, and
the terminal pane is only put away, never closed: its shells keep running and
come back with their scrollback when it does.

A pane can also be folded away by dragging a separator to a window edge: the
separator between the two rows folds that row, and either vertical separator
folds the pane on that side — its neighbour takes the freed space. Dragging the
separator back restores the split. Useful when one part of the window deserves
the full width or height.

## The panes

### Changes (top left)

Changed files as a collapsible tree, each with its line count beside the name.
Browsing a whole repository — the work tree or a commit's snapshot — opens with
every directory shut, since that is a tree to descend into rather than a list of
changes to read; a list of changes opens expanded. Directories come before files at every level, and within each group names are
sorted the way a
reader expects rather than the way a byte comparison does: the digits in a name count as a number, so `W9` comes before `W10`, and
case is not a first-order difference, so `butler/` sorts with the b's instead of
after every capital letter.
Each name carries a type icon: the shape is the family — source, structured
data, markup, a stylesheet, prose, an image, an archive, a shell script, a
lockfile, compiled output — and the colour is the language, so `.ts` and `.py`
are the same glyph in different colours. Python is the one language drawn as
itself, in its own blue and yellow. An extension Gitty does not know gets a
plain page rather than a guess.
Two status columns are shown: the staged state (green) and the work-tree state
(yellow / red); untracked files are `??`. The count is read from disk in the
work tree and from the revision everywhere else; where there is none to read —
a binary file, or anything above 8 MB — the row says how big the file is
instead, and a deleted file says nothing at all. After it comes the churn — how many lines
this change added and removed in that file, `+12 −3`, against HEAD in the work
tree and against the parent for a commit or a range. A snapshot is a tree rather
than a change, so it has no churn; nor do binary files or a merge commit, whose
combined diff attributes nothing.

Where the churn would be, a tree — the Working Tree listing and a commit's
snapshot — names **who last committed each file** instead: a change is already
somebody's, but a tree is a question of whose file this is. Hover the name for
the whole sentence. A file git has never seen has none, so untracked and
ignored files show nothing.

The pane's title says what is listed, and clicking it opens a menu of the two
standing views: **Changes**, the uncommitted ones, and **Working Tree**, every
file in the directory on disk, read-only. A tick marks whichever is on screen;
from a commit, a range or a snapshot the same menu is the way back to either.

**Working Tree** means every file: the ones `.gitignore` covers — build output,
`node_modules`, whatever else — are listed like the rest, in dimmed italics, and
a folder holding nothing but ignored files is dimmed too. They open and read
like any other file; only their line counts are left off, since counting them
means reading every byte of a directory that is usually the largest thing on
disk. `.git` itself is not listed. A submodule that is checked out is a folder
like any other, its files listed beneath it — nested submodules too, and a git
repository sitting untracked inside the tree; one that was never checked out
stays a single row.

<kbd>Ctrl+B</kbd> — b for browse — is the shortcut into it from anywhere, and it
sets the window up for reading as well as switching the view: Commits and the
terminal go away, leaving the tree and what it opens. <kbd>Ctrl+D</kbd> is the
way back: the changes again, with all four panes. In a terminal that key stays
end-of-input, which is how a shell is left, so the pair works everywhere else.
Both keys are listed in the pane title's tooltip.

- **Click** — show the file's diff on the right.
- **Double-click** — open the whole file as a document beside the diff, with
  line numbers and syntax highlighting (a rendered document for markdown, the
  picture itself for an image).
- **Click a status column** — stage the file, or unstage it if it is staged.
- **Right-click** — View File, Open in System App, Reveal in File Manager, Open
  Remote URL, Copy Relative Path, Copy Absolute Path, Copy File Name, Blame
  File, File History, Stage / Unstage File, Discard Changes, Delete File. A
  submodule's row also offers **Pull Submodule**.
- **Right-click → Open Remote URL** — this file's page on the site the
  repository is hosted on, opened in the system browser. The revision is the
  one being looked at — a commit, a snapshot — and the checked-out branch in
  the Changes and Working Tree views. The address is inferred from the remote
  the same way the [commit menu's item](#commits-bottom-left) is, so it appears
  only where that inference succeeds, and never for an untracked file, a
  detached HEAD, or a commit that has not been pushed — the site has no page
  for one yet.
- **Click a folder** — collapse or expand it.
- **Right-click a folder** — Copy Relative Path, Copy Absolute Path, Copy Folder
  Name, and the two ways of opening it outside Gitty: **Open in Browser**, which
  is the browser's own listing of the directory, and **Open in File Manager**.
  A revision's snapshot lists a tree that is not on disk, so it offers the paths
  alone.
- **Right-click the empty space below the rows** — **Open in File Manager** on
  the repository's root directory (not in a revision's snapshot), and **Paste**
  when there are files to paste.

Files copied in a file manager can be **pasted into the tree**: right-click the
empty space below the rows for **Paste**, which writes into the repository
root, or right-click a file for **Paste into `dir`/**, which writes beside it.
<kbd>Ctrl+V</kbd> does the same with the pane focused — into the selected
file's directory, or the root when nothing is selected. Cut files are moved
rather than copied, and a name the directory already holds is asked about once:
keep both, which adds `(copy)` to the arriving name, or replace.

Pasting belongs to the two views that *are* the directory on disk — **Changes**
and **Working Tree**. A commit, a range or a revision's snapshot is a listing of
something that is not there to write into, so no paste is offered.

<kbd>Ctrl+F</kbd> with this pane focused — or **Filter** on the header's
search button, whose arrow chooses between searching the repository and
filtering this list — opens a filter box above the tree and
narrows it to the paths holding what you type, with the count of how many of
how many files are left. What you type is a **regular expression** —
`\.tsx?$`, `main|renderer` — matched against the whole path, so `src/main`
keeps everything under that directory, and matching is case-insensitive.
Ordinary text is an expression that means itself, and an expression that does
not compile yet (`src/(`, half of `src/(main|renderer)`) is matched literally
rather than reported as an error. Nothing stays shut while the box has text — a match five
directories down is the point of having typed. <kbd>Esc</kbd> or the **✕**
clears it and puts the whole tree back, and so does moving to another commit.

<kbd>Ctrl+E</kbd> answers the other question — not "narrow what is listed here"
but "show me that file, wherever it is". It opens a box over the window from
anywhere, needing no pane focused, and lists the whole working directory rather
than the tree on screen: every file `git` would name, the ones `.gitignore`
covers left out, so `node_modules` cannot bury the answer. The letters are
matched **in order but not adjacently** — `dfpn` finds `DiffPane.tsx` — and the
ranking prefers letters that start a word (a path segment, or after `-`, `_`,
`.`, or a lowercase-to-uppercase step), letters in the file name rather than in
the directories above it, and runs that stay together; a shorter path breaks a
tie. <kbd>↑</kbd> <kbd>↓</kbd> pick, <kbd>Enter</kbd> opens the file as a
document beside the diff, and <kbd>Esc</kbd> closes the box. The file opens as
it is on disk even while a commit is on screen, since the working directory is
what the box listed. The key works inside a terminal too, where the shell does
not see it — unlike <kbd>Ctrl+D</kbd>, which stays end-of-input because that is
how a shell is left; readline's end-of-line is <kbd>End</kbd> as well.

**Pull Submodule** appears on the row of a path `.gitmodules` names — its
folder's row, in **Working Tree**, when it is checked out — in the two
views that are the directory on disk — **Changes** and **Working Tree**. It
fetches that submodule's own remote and moves it to the tip of the branch it
tracks (`git submodule update --init --remote`), so a submodule that was never
checked out is cloned by the same item. The superproject is left pointing at the
commit it recorded, which is why the submodule shows up in **Changes**
afterwards: committing the new pointer stays your decision. What git said lands
in the message strip above the commit log, where push and pull report.

**Discard Changes** puts the file back to what the index holds, after a native
confirmation that says plainly there is no undo; an untracked file has no index
version to go back to, so it offers **Delete File** instead, which goes to the
system trash.

Right-clicking the work-tree row in the commit log also offers **Copy Staged
Diff**, for a conversation happening in another window.

When a commit or a commit range is selected, this pane lists that commit's files
instead; **Back to Changes** (or <kbd>Esc</kbd>) returns to the uncommitted
changes.
In a [snapshot](#snapshots) it lists the entire tree at that commit, not just
what changed. Browsing the working tree has no such button — the title picker
it was opened from is also the way out of it.

### Diff (top right)

Unified diff with old/new line numbers, hunk headers and add/delete colouring,
laid out as a list of files: each path is a full-width heading, the hunk header
is dimmed — a line range, not the thing to look at first — and a rename reads
`old → new`. With no file selected it shows everything at once: every
uncommitted change in the work tree, or every file in the selected commit.

- **Show Whole Diff** — back to that combined diff after picking a file. It
  stays in the header and lights up while the whole diff is what you are
  looking at. The work-tree version covers staged and unstaged changes together
  and inlines untracked files (up to 50, then a notice), which `git diff` alone
  leaves out.
- **Wrap** — wrap long lines instead of scrolling sideways. On by default.
- **Inline** — a switch like **Wrap**: pressed, one column with `+`/`-` markers;
  raised, old and new side by side, where a run of deletions is zipped with the
  additions that follow it. Wrapped halves stay aligned.
- **File headings** — each heading folds its file: the triangle collapses it
  to the name, and **Collapse All** / **Expand All** in the header does the
  lot. **Ctrl+click** a heading opens that file in a new document tab;
  right-click it for **Open in a New Tab**, **Select in the File List**, the
  path copies and — in the work tree, where the file on disk is the version
  shown — **Open in System App** and **Reveal in File Manager**. A rename
  opens its new path.
- **Stage / Unstage** — while the diff is one tracked file's work, every hunk
  header carries a button that puts that hunk into the index, or takes it back
  out. Select lines first and the button becomes **Stage 3 lines**: an
  unselected addition is left out of the patch, an unselected deletion is
  demoted to a context line, and the hunk header is recomputed — the same split
  `git add -p` makes, from a window where the whole file is in front of you.
  The selection is the ordinary text selection, so a drag still copies. A
  selection spanning two hunks gives each of them its own part of it.
- **Unstaged / Staged** — which side of the index a file is being read from,
  shown once both sides hold something. Staging acts on whichever is on screen.
  Binary files, mode changes and renames have no hunks to pick and are staged
  whole from the file list; hunk buttons also disappear while **Ignore
  whitespace** is on, because that diff does not hold every change it would
  apply.
- **Right-click** — Copy Selection, Copy Whole Diff, and the same toggles.

Changed words inside a changed line are highlighted where that reads better than
the whole line at once; it is **Word highlight** in [Settings](#settings).

Settings are remembered between runs. Rows render in chunks of 1500 and extend
as you scroll, so large commits stay responsive; diffs above 2 MB are truncated
with a notice.

### Viewing files

A diff is what the pane shows by default, but any file can be opened whole:
**double-click** it in the tree, use **View File** / **Preview** in the header,
**Ctrl+click** a file heading in the diff, or take it from either context menu.

The file opens as its own document in a strip of tabs beside the diff, rather
than over it, so a file can be read without losing the diff you were on. The
**Diff** tab is always first and a single click in the tree still browses diffs
in place. Each document remembers the revision it was opened at, closes with its
own **×**, and re-reads a work-tree file when the repository changes.
**Right-click** a document's tab for the same menu its row has in the file
tree; a file the list does not hold — an unchanged one, in the Changes view —
gets the Working Tree's version, without staging, discarding or deleting. Source
files get line numbers and syntax highlighting; markdown opens
[rendered](#markdown-preview), with a toggle back to the source; HTML opens
[rendered too](#html-preview); an image opens as [the picture](#images).

Which revision you get follows the pane: the file on disk in the work tree, the
file as it was at the selected commit everywhere else. Opening a document is an
action rather than a mode — selecting another file or another commit puts the
diff back — so the pane is never stuck showing files when you wanted changes.

#### The outline of a source file

A source file carries an **Outline** button, the same one a rendered document
has: the file's classes, functions and members beside it as a tree, indented by
nesting and coloured by what each one declares. Click an entry to jump to it —
the file is drawn far enough to hold it, however deep — and the entry you have
scrolled into is marked. Drag the separator to give either side more room; the
width is shared by every file in the repository.

It reads sixteen languages — C, C++, C#, Go, Java, JavaScript, Lua, Perl, PHP,
Python, Ruby, Rust, shell, Swift, TypeScript and the JSX flavours of the last
two — and reads them by recognising declarations rather than by parsing:
comments and strings are blanked out first, nesting comes from brace depth (or
indentation, where the language is written that way), and a name appears only
where a keyword put it. Anything else — data formats, stylesheets, a language
it does not know — shows no panel rather than a guessed list. Markdown has an
[outline of its own](#markdown-preview), from its headings.

#### Snapshots

Right-click a commit and choose **Browse Snapshot** to read the repository as it
was at that commit: the top-left pane lists the *entire* tree rather than the
files that commit touched, and picking any file opens it at that revision. A
snapshot has no diff to show, so every file there is a document.

The files in a snapshot never existed on disk at that revision, which is why
**Open in System App** hands over a temporary copy of it and **Reveal in File
Manager** is not offered. **Back to Changes** (or <kbd>Esc</kbd>) leaves.

A file git recorded as executable — mode `755` — also offers **Run in the
Terminal**. Choosing it checks the commit out into a temporary directory and
types `cd <that directory> && ./<file>` into the terminal pane, so the program
runs as it was then, next to the neighbours it had then rather than today's.
The line is only typed: pressing <kbd>Enter</kbd> is yours, and nothing runs
until you do. The terminal pane is brought back if it was hidden. Browsing the
working tree offers the same item, and needs no copy — the command runs in the
repository itself.

That temporary directory is a real linked work tree (`git worktree`), detached
at the commit, so a program that asks git where it is gets an answer; it has an
index and a HEAD of its own, and nothing run there touches your checkout. It
also means a registration under `.git/worktrees`, which `git worktree list`
shows and Gitty prunes as it goes; the checkout itself is kept per commit, so
running a second thing from the same snapshot is immediate. A commit whose tree
is over 256 MB is refused rather than checked out — the item is for running a
script, not for writing a repository's worth of binaries into the temporary
directory.

#### Markdown preview

Selecting a `.md` file adds a **Preview** button — off by default, so a diff
stays a diff until you ask for the rendered document. It renders the file as a
whole: the version on disk in the work tree, the version at the selected commit
everywhere else.

Fenced code blocks are syntax-highlighted when they name a language, YAML front
matter is lifted out and shown as its own highlighted block, and heading levels,
list markers, links and inline code are colour-coded so structure reads at a
glance.

- **Wrap** — the same toggle as the diff, on by default. Prose always wraps; in
  a preview this decides whether fenced code blocks, wide tables and long inline
  strings wrap too, rather than scrolling sideways.
- **Table columns** — a table's columns are sized to their content, and each
  boundary can be dragged: grab the right edge of a header cell and the column
  follows the pointer, the rest keeping the width they had. A table wider than
  the pane scrolls sideways. Double-click a boundary to give the table back to
  the browser, i.e. back to widths that fit the content. The widths last as long
  as the document is open.
- **Outline** — the heading structure beside the document, indented by level,
  tracking the heading you have scrolled to. Click an entry to jump, and drag
  the separator between it and the document to give either side more room. The
  width is shared by every document in the repository — it is a reading
  preference, not a property of one file — and lasts as long as the window,
  like the other panes' sizes.
- **Source lines** — off by default, and turned on in
  [Settings](#settings): every heading, paragraph, list item, table, fenced
  block and image is numbered in the left gutter with the line it starts on in
  the source. The numbers are drawn rather than inserted, so they stay out of a
  selection you copy and out of what <kbd>Ctrl+F</kbd> searches. When the
  document is one the diff on screen is about, the number of a block that diff
  inserted or changed is drawn green on green — the colours the diff itself
  paints a `+` line in — so the gutter mirrors what the diff said. A block
  counts as changed when any line it spans does, so an edited fence is marked
  even though its opening line is untouched. An image written inside a sentence
  takes its paragraph's line, having none of its own.
- **<kbd>Ctrl+F</kbd>** — find in the document; see
  [Finding text](#finding-text).
- **Right-click** — Copy Selection, Copy Markdown Source, the wrap and outline
  toggles, and Show Diff Instead.

Raw HTML inside the markdown is not rendered, and a link to the web opens in
the system browser rather than inside the app. A link to another file in the
repository — `ref/readme/manual.md`, `../README.md`, `/CHANGELOG.md` — is followed
here instead: **Ctrl/Cmd+click** opens that file as its own document beside the
diff, at the same revision as the document holding the link, so a README read at
an old commit leads to that commit's files. A `#fragment` on the end travels
with it — `manual.md#the-window` opens the manual at that heading, the way it
would on a forge — and a heading this document does not have simply opens it at
the top. Hovering such a link says so. A plain click does nothing, as before,
and a link that climbs out past the repository root is not one of these.

A link that names a directory instead — `src/`, `ref/spec` — opens the file pane
on that folder, at the same revision: the work tree for a document read from
the disk, that commit's snapshot for one read at a commit.

Images written relative to the document are read out of the repository — at the same revision as the document, so an old
commit shows the screenshots it shipped with. One the repository does not have
there leaves a dashed placeholder with its alt text. Images from the web are not
fetched at all: reading a stranger's README should not announce you to whatever
host it points at.

![Markdown preview](../../ref/gitty-0.1.5-markdown.png)

#### HTML preview

An `.html`, `.htm` or `.xhtml` file gets the same **Preview** button, and the
document is rendered rather than shown as source — the version on disk in the
work tree, the version at the selected commit everywhere else.

It renders in a sandboxed frame loaded through `srcdoc`, so the page can never
navigate the app away from itself. Its own stylesheets apply — layout, colours,
fonts are the document's. Scripts do not run and remote images are not fetched:
the frame inherits the app's content security policy, which admits neither. A
page is shown, not executed. **Wrap** decides whether the frame scrolls on its
own or grows to its content so the whole page scrolls as one. <kbd>Ctrl+F</kbd>
and <kbd>Ctrl+Shift+C</kbd> work inside the frame, whose keys never reach the
rest of the window.

#### JSON

A `.json`, `.geojson`, `.topojson` or `.webmanifest` file opens as the file
stores it and gets a **Format** button beside **Wrap**: pressed, the document is
re-indented two spaces to a level, so a minified file that arrives as one
endless line reads as a tree. Press it again for the file as it is stored.

While the document is formatted, every object and array that holds something
carries a **▼** beside its line number: click it to fold that node away, and the
line it opened on keeps a **…** to say what is missing. Click the **▶** it
becomes to open it again. Folds nest, so a node folded inside another is still
folded when its parent is opened, and <kbd>Ctrl+F</kbd> searches what is on
screen — a folded node's lines are not rendered at all. Nothing stays folded
when another document is opened, or when a work-tree file is re-read after the
repository changes: the lines a fold named may not be those lines any more.

Only the whitespace between tokens changes. Numbers keep the digits the file
spells — a value too long for a double, an exponent too large — keys keep the
order they are in, and a duplicate key stays. The button appears only where the
text parses as one complete JSON document, so a template full of placeholders,
or a truncated download, offers nothing rather than a button that does nothing.
Formatting is a way of reading the file; nothing is written back.

#### Images

A `.png`, `.jpg`, `.gif`, `.webp`, `.bmp`, `.ico`, `.avif` or `.svg` opens as
the picture rather than as a report that it is binary — from disk in the work
tree, from the commit everywhere else. It is fitted to the pane over a
checkerboard, so transparency reads as transparency; **click** it for actual
size and scroll around, click again to fit. Its pixel dimensions and size on
disk sit underneath. Images above 12 MB are not inlined.

![Image preview](../../ref/gitty-0.1.5-image.png)

#### PDFs

A `.pdf` opens as the document, read by the viewer the browser engine already
carries: pages down the side, zoom, rotation, its own find, and buttons to
print or save a copy. It works the same at a revision — a PDF in a commit's
snapshot is read from git, so an old edition of a paper reads as it was then
without checking anything out. The file's size sits underneath. PDFs above
64 MB are not opened, and the name in the viewer's own toolbar is not the
file's; the pane header above it is.

#### Files stored with Git LFS

A file tracked by [Git LFS](https://git-lfs.com/) is a three-line pointer in
the repository itself, with the real file in a store beside it. Gitty follows
the pointer, so an LFS-tracked image or PDF previews like any other — at a
revision as well as in the work tree, and whether or not `git lfs` is installed
on the machine. When the object has not been fetched, the pane says so rather
than showing a broken picture or a viewer error. `git lfs pull` gets it, and
the preview then works. The size beside the file in the tree stays the
pointer's, which is what the repository actually stores.

#### Blame and file history

Right-click any file in the tree and choose **Blame File** or **File History**;
both open as documents beside the diff. Blame shows one row per source line —
the commit, its author, its date and the line itself, highlighted like the code
viewer, with an em dash where a line is not committed yet — at the revision you
are viewing. File History lists every commit
that touched the file and follows renames; a
column between the date and the author says how long the file was at that
commit, and how big it was where the count cannot be worked out — a binary
revision, and anything older than one. Its rows behave like the commit log's: a click
picks one, a double click opens that commit, and Shift+click on a second row
diffs the file between the two revisions — the same range view the log's second
pick opens, with the file already selected.

Right-clicking a blame row offers **History of These Lines**: `git log -L` over
the lines the selection covers — or the clicked line, with no selection — which
opens as its own document showing each commit that touched them together with
what it did to them. Blame answers *who last*; this answers *how it got this
way*. It tracks the range across renames by itself.

#### Searching the repository

**Search** in the Changes pane's header opens a box above the file list
and runs `git grep`. The arrow beside it switches that button to **Filter**,
which narrows the list of files instead; the one you pick stays chosen, and
only one of the two boxes is open at a time. The results are a document grouped by file, line numbers
down the left; clicking one opens that file at that line, with the line marked.

The search follows the revision on screen: in the work tree it reads what is on
disk, uncommitted work and all, and in a commit or a snapshot it reads that
revision — the box says which. Above 2000 hits it stops and says so, the way an
oversized diff does.

The box takes a query rather than a bare pattern, in the shape a mail client
taught everyone:

| Typed | Found |
| --- | --- |
| `foo bar` | lines holding both words |
| `"foo bar"` | the phrase, spaces and all |
| `-foo` | lines without it |
| `foo in:*.py` | only files matching the glob; `in:*.py,*.pyi` for several |
| `foo -in:test/*` | those files left out |
| `foo in *.py` | the same as `in:` — without the colon it reads as the operator only when a path follows, so `for x in list` is still four words |

Quoting turns the operators off, which is how `"in:*.py"` is searched for
literally. Every term and every glob reaches git as its own argument — nothing
is spliced into a command line — so a regular expression is not eaten on the
way. A query that says where to look but not what to look for (`in:*.py` alone)
does not run; the strip says there is nothing to search for.

### Commits (bottom left)

The log of the current branch, loaded 300 at a time and extended as you scroll.
The first row is **Changes** — the uncommitted changes, with a count of changed
files; selecting it brings the top panes back to them. **Filter** on the
header's right opens a filter box above the log, which narrows the list —
debounced, and the result pages the same way. The ✕, <kbd>Esc</kbd> or the
button again put the box away and the whole log back.

The header keeps **Push** and **Pull**, the two used often; everything else
about the log is one click behind **⋯** — **Graph**, **All Branches**,
**Gource** where it is installed, and **Open in Browser**. The two switches
carry a dot in that menu while they are on.

**Graph** draws the lanes beside the hashes: where a branch parted, where a
merge landed, which line a commit belongs to. It is computed
from each commit's parents rather than parsed out of `git log --graph`, whose
ASCII is typeset for a terminal. A lane keeps its colour down the page, and the
palette is a fixed one — deliberately unlike blame, whose colours are derived
from the SHA and mean "who". Past ten lanes the overflow shares the last
column, ringed, so a repository with many heads cannot push the subjects off
the pane. **All Branches** shows every branch at once (`git log --all`), which
is how two branches can be seen relating to each other; the branch menu still
reads one at a time.

The log is ordered by the **author date**, the one in the column, so a commit
replayed rather than made — rebased, cherry-picked, merged from a squashed pull
request — reads among the dates it was written on rather than the day it landed.
What no ordering can change is that a parent is always drawn below its
children, so such a commit can still sit among rows it predates; where that
happens the date is marked, and its tooltip says why. Under a filter the mark
is off: the row above is then not the commit before this one, so a date going
backwards says only that the rows in between did not match.

Selecting a commit **shades the log by ancestry**: the rows it is built on and
the rows built on it stay as they are, everything else recedes. That is the one
relation position cannot show — the row directly above may be on another
branch, and a parent may sit a hundred rows down. The walk covers what has been
loaded, so an ancestry running past the last row is shown as far as the log
reaches; under a filter, where the rows are a subset and the chains between
them are missing, nothing is shaded.

The dropdown beside it says what is being searched:

| | |
| --- | --- |
| **Message / Author** | The commit message and the author, case-insensitively, as an extended regular expression — `fix\|revert` is either word. The default. |
| **Content** | git's `-S`: the commits where the *number of occurrences* of the text changed — where it was introduced or removed. Literal, so a search full of `.` and `(` means those characters. |
| **Content regex** | git's `-G`: every commit whose diff matches the expression — extended, like the mode above — including the ones that only moved the line about. |

Text that is not an expression yet — `(fix`, on the way to `(fix|revert)` — is
searched for literally in both expression modes, so a box read on every
keystroke does not empty the log while you finish typing.

The two content modes answer the question blame cannot — *which commit
introduced this line* — and they read every diff in the history to do it, so
the box says it is searching while they run. Changing the text or the mode
kills the search still running; nothing is spliced into a command line, so a
regular expression reaches git as one argument.

- **Click** or <kbd>Enter</kbd> — show that commit: its files fill the top-left
  pane and its full diff the top-right one. The commit's subject, author, date
  and full body appear in a strip above the file list; when the body is long, a
  ▸ toggle folds it away so the file list keeps the room.
- <kbd>Shift+Click</kbd> or <kbd>Space</kbd> — pick a second commit and diff
  the two, oldest first.
- **Ctrl+Click** (<kbd>Cmd</kbd> on macOS) — open the commit's page on the site
  hosting the repository, the same address as **Open Remote URL** below. Where
  no such page can be worked out the click does nothing, leaving the row as it
  was.
- **↑ ↓ / j k / PgUp / PgDn / Home / End** — move the cursor.
- **Right-click** — show the diff, copy the hash, the short hash or the subject,
  [browse the snapshot](#snapshots), or diff against the currently selected
  commit.
- **Right-click → Open in Browser** — render this commit in the system browser;
  **Copy Commit URL** copies the link. A web server inside the app serves every
  open repository as a browsable commit list — the commits pane's **Open in
  Browser** button lands there — with each commit's metadata, files and diff,
  and per-file diffs one click away.
- **Right-click → Open Remote URL** — the commit's page on the site the
  repository is hosted on, opened in the system browser. The address is
  inferred from the remote (the one the current branch tracks, else `origin`),
  and the item appears only when that inference succeeds: GitHub, GitLab,
  Bitbucket, Gitea, Forgejo, Codeberg and sourcehut are known, as is any
  self-hosted host that follows the `/commit/<hash>` layout. A repository with
  no remote, or one on Azure DevOps, does not get the item, and neither does a
  commit that has not been pushed yet — nor does Ctrl+Click open one.

  It listens on `127.0.0.1`, and that alone would not be much: loopback keeps
  other machines out, not other pages in your own browser, any of which could
  fetch it. So every URL carries a token generated at startup and kept in
  memory — `/t/<token>/…` — which the links Gitty hands you already have. A
  wrong token is a 404 rather than a 403, a request whose `Host` is not
  loopback is refused (that is what makes DNS rebinding pointless), and the
  pages are served `Referrer-Policy: no-referrer`, so following a link out of
  a commit message does not take the token with it. The token is new each
  launch, so the URLs work while this session is running.
- Selecting a file in the top-left pane narrows the diff to that file;
  **Show Whole Diff** widens it back out.

![Diff against any two commits](../../ref/gitty-0.1.5-range.png)

#### Gource

If [gource](https://gource.io/) is on `PATH`, the commits header's **⋯** menu
grows a **Gource** entry: it plays the repository's history
as an animation — the directory tree growing, files lighting up as each commit
lands, one author flying between them per name in the log. Gource opens a window
of its own and keeps running after you close Gitty; the entry only waits long
enough to see that it started, and shows what gource said if it did not.

It is started with a day of history per half second, idle files kept on screen
and long gaps skipped, which is what makes a real repository readable rather
than a slow trickle. Nothing is installed for you: where gource is not on
`PATH`, the entry is simply not there.

#### Browsing another branch

The branch in the title bar opens a menu of every local and remote-tracking
branch, newest commit first, and picking one shows that branch's history
instead. It is a read-only look: gitty runs no `checkout`, so the work tree,
its diffs and the terminals stay exactly where git left them. While you are
looking at another branch the title bar reads `⎇ main › other-branch` and the
commit pane says which branch it is listing; **Back to <branch>** returns.
Each of the two names has its own hover text saying which is which, since the
distinction is the whole point of the feature. Each tab browses on its own.

#### Push and Pull

**Push** and **Pull** sit in the header, and both act on the checked-out branch
whichever branch the log is pointed at. **Push** counts what is unpushed —
**Push 3** — and greys out when there is nothing to send; on a branch that
tracks nothing it publishes the branch to `origin` and sets the upstream.
**Pull** fast-forwards from the upstream, and is greyed out when there is no
upstream to pull from. When the branches have diverged a fast-forward is
impossible, and Gitty asks whether to pull with a rebase instead — your local
commits replayed on top of the upstream. Declining leaves the repository as it
was and shows git's refusal; accepting needs a clean work tree, and a conflict
stops the rebase for you to finish in the terminal. Whatever git says appears above the log — click to
dismiss it; failures stay until you do.

Neither can answer a prompt: there is no terminal behind them, so a push that
wants a password or a passphrase fails with git's own message rather than
hanging. Both are then finished by hand in the terminal pane, which is right
there.

### Terminal (bottom right)

A real interactive login shell (`$SHELL`) rooted at the repository, so any git
command can be run directly. <kbd>Ctrl+Shift+C</kbd> copies the terminal's
selection — <kbd>Ctrl+C</kbd> there is the interrupt, and stays the interrupt.
The same chord copies in every other pane too, so it does not change meaning as
the focus moves. The other panes refresh automatically when the
repository changes on disk. Which shell it starts, and whether it starts as a
login shell, are [Settings](#settings); both are read when a terminal is
created, so a change takes effect on the next split.

The pane splits into as many shells as you want: **Split →** puts a new one
beside the focused terminal, **Split ↓** below it, and the separators between
them drag like every other pane. Clicking a terminal focuses it — the outlined
one is where the next split or **Close** lands. Splitting the same way twice
extends the row or column rather than nesting, so three side-by-side terminals
resize against each other.

**Close** ends the focused shell; leaving a shell with `exit` closes its split
by itself. The last terminal always stays: exiting it leaves the notice on
screen instead of an empty pane.

**Send** in this pane's header hands the index over. It types a command into
the focused shell and presses Enter, and that is all it does: no model is
called from inside Gitty, nothing leaves the machine that you did not send. The
agent's prompts and output appear in the terminal, where there is a real tty,
so hooks and gpg signing work as they always do.

The box to its left names the command it would run, and is where a different
one is chosen — there is no setting for it, because it is a question asked once
per hand-over rather than once per install. The dropdown lists the commands
Gitty remembers, most recently run first, and runs the one you pick; running a
command moves it to the top, so the box always shows the last one used. With
nothing remembered the box is faint and **Send** greys out. The **×** at the right
of an entry takes it out of the list, after a confirmation — the list is the
only place a command is written down, and the menu stays open so several can
go in a row. **New command…** at the bottom opens a one-line box, prefilled with
the current command, for anything not in the list. The list starts as a few
suggestions — which agent is installed is not something Gitty can know — and a
command joins it by having been run, so nothing is remembered on the strength
of a half-typed line.

## Finding text

<kbd>Ctrl+F</kbd> searches whatever the right-hand pane is showing: a diff, a
file, a rendered markdown document, an [HTML preview](#html-preview), a blame,
or a file's history. With the file tree focused it does something else — it
filters that tree, described in
[Changes](#changes-top-left). Every match is highlighted with the current one picked out,
<kbd>Enter</kbd> and <kbd>Shift+Enter</kbd> (or the arrows) walk them and wrap
around at either end, the count says where you are, and <kbd>Esc</kbd> closes.

The search is case-insensitive and reads the text as rendered, not the markup
behind it — so a phrase is found across the bold and code spans markdown leaves
inside it, and a diff is searched as the lines you see. Views that render in
chunks as you scroll (a long file, a large diff) render the rest when the strip
opens, so the count covers the whole thing rather than the part scrolled to so
far. A collapsed file in a multi-file diff stays collapsed and is not searched.

## Settings

**Settings** in the title bar, or <kbd>Ctrl+,</kbd>. Everything here applies to
every tab and is remembered across restarts; **Restore Defaults** puts it all
back. The dialog is in three tabs — **Appearance**, **View** and **Session** —
so it stays one screenful as it grows; the table below lists them in that
order.

| | |
| --- | --- |
| **Theme** | Dark or Light. |
| **Language** | English, 简体中文, 日本語, 한국어, Français, Deutsch, Español, Русский or Português — the interface, the menus and the dialogs all change together without restarting. |
| **Time zone** | The zone every date and time on screen is rendered in: the machine's own by default, or UTC, or any zone the system knows. Git records each commit with its author's offset, so a stamp is always a choice of zone — this is where it is made. The log's date column follows it, which means the boundary between "today" and a date moves with it too. |
| **Time format** | Absolute (a clock time or a date) or Relative (`28m ago`, `2h ago`). Relative sidesteps the zone question entirely; the hover tip on a row stays absolute either way, and names its zone. |
| **Font size** | 9 – 20, in half points. Applies to every pane, the terminal included. |
| **Monospace font** | The family the panes and the terminal are drawn in, chosen from the monospace fonts found on this machine. **System default** is the built-in stack (JetBrains Mono, Fira Code, DejaVu Sans Mono, …). |
| **Row height** | 18 – 26 pixels — the line height every list is built on, the file tree, the log and the diff. Tighter fits more on screen, looser reads easier. |
| **Diff layout** | Inline or Side-by-Side, the same toggle the diff header carries. |
| **Context lines** | 0 – 25 unchanged lines around each hunk — git's `-U`, whose own default is 3. Widen it to see what a change sits in, narrow it to fit more of a large diff on screen. |
| **Ignore whitespace** | Off, Amount (git's `-b`: a run of spaces changing length is not a change) or All (`-w`: no whitespace difference is). Reindented or rewrapped code reads as unchanged rather than as a wall of red and green. The file list's `+12 −3` counts follow the same setting, so it cannot claim lines the diff then refuses to show. |
| **Word wrap** | Wrap long lines instead of scrolling sideways. |
| **Word highlight** | Mark the words that changed inside a changed line, not just the line. |
| **Outline** | Show the outline beside a document: headings in a rendered one, classes and functions in a source file. |
| **Markdown source lines** | Number each block of a rendered document with the line it starts on in the source. Headings, paragraphs, list items, tables, fenced code and images all carry one, in a gutter down the left. Off by default. |
| **File sorting** | Natural or Byte order. Natural reads the digits in a name as a number (`W9` before `W10`) and puts case second; byte order is git's own, where every capital sorts ahead of every lowercase letter. |
| **Reopen last session** | Reopen the repositories that were open when the app last exited. The repository Gitty was started with is still the active tab; ones that have since been deleted are quietly dropped. |
| **Instances** | **Single** — the default — keeps one Gitty per user: `gitty <repo>` from any directory hands the repository to the window already open, which adds it as a tab and comes to the front, and the second launch exits at once. **Multiple** starts a separate window for each launch instead. Unlike the rest of the table this one is kept by the app rather than the window, so it is the same for every window; changing it applies to the next `gitty` typed, not at the next restart. |
| **Shell** | The shell a terminal starts, listed from `/etc/shells` plus the usual paths (`COMSPEC` and PowerShell on Windows). **System default** is `$SHELL`. A path that has since gone falls back to it rather than leaving a dead pane. |
| **Login shell** | Start it with `-l`, so the user's profile is sourced. Turn it off for a faster, quieter shell — no profile output, no login-time checks. Windows shells have no such flag and ignore this. |

### Plugins

<a id="plugins"></a>

The last settings tab. Everything that is not the core of a history browser
lives here as a plugin: its own switch, its own settings, its own files. All of
them start off.

| plugin | what it does |
| --- | --- |
| **Semantic reading** | A language analyser reads the prose of a rendered markdown document and underlines the proper nouns in it — the names of people, places and organisations — so a paragraph can be skimmed for who and where it is about. Latin words inside CJK prose (`GPT-4`, `Claude`, `v0.1.9` in a Chinese sentence) get a colour of their own instead of a line, and the end of each sentence gets weight and a little extra room after it, so a paragraph can be counted in sentences at a glance. Neither of those two needs an analyser, so both hold even when none can answer. Markup is untouched, and so is code: a fenced block, an inline code span and a link target are never marked. |

Semantic reading has three settings of its own, shown once it is on.
**Analyser** is who does the reading: **jieba** segments the text on this
machine, needs no network and no key, and knows Chinese; **Model** sends the
text to whatever OpenAI-compatible endpoint `Model access` names, which costs a
round trip per document and reads any language the model does. Either way an
analyser that cannot answer leaves the document exactly as it was.

**Mark styles** opens `rules.json`, which says what each kind of mark looks
like: `underline` (`none`, `solid`, `dotted`, `dashed`, `double`, `wavy`),
`underlineColor`, `color`, `background`, `bold`, `italic` and `spaceAfter`, one
entry each for
`person`, `place`, `org`, `proper`, `latin` and `sentence-end`. `spaceAfter` is
extra room after the mark, in em, up to 2 — which is what the default gives a
sentence ending instead of another colour. Colours are `#rgb`, `#rrggbb` or
`#rrggbbaa`, and are the dark theme's — the file has no second palette for the
light one. Edit it, reopen the document, and the change is there.

**Model access** opens `models.json`: the `baseUrl`, `model` and key for the
**Model** analyser. `apiKeyEnv` names an environment variable to read the key
from, which keeps it out of the file; `apiKey` holds it directly for anyone who
would rather. Both files sit in Gitty's own state directory, under
`plugins/semantic-reading/`, never in a repository, and their contents never
leave the main process.

**Shell** and **Login shell** are read when a terminal is created, so they take
effect on the next split or the next repository tab, not in the shells already
running. **Word wrap**, **Diff layout** and **Outline** are the same toggles the
diff header carries, so changing one in either place changes both. **Word
highlight** lives here only.

## Keyboard shortcuts

<kbd>F1</kbd> shows this table inside the app — **Help ▸ Keyboard Shortcuts**
opens the same sheet.

| Key | Action |
| --- | --- |
| <kbd>↑</kbd> <kbd>↓</kbd> / <kbd>PgUp</kbd> <kbd>PgDn</kbd> / <kbd>Home</kbd> <kbd>End</kbd> | Move the selection in the commit list |
| <kbd>Enter</kbd> | Show the selected commit |
| <kbd>Space</kbd> / <kbd>Shift+Click</kbd> | Mark a second commit and diff the pair |
| <kbd>Ctrl+Click</kbd> on a commit | Open its page on the hosting site |
| <kbd>Ctrl+Click</kbd> on a file heading | Open that file in a new document tab |
| <kbd>Ctrl+F</kbd> | Find in the diff, the file, or whatever the pane is showing — or filter the file tree, with that pane focused |
| <kbd>Ctrl+C</kbd> / <kbd>Ctrl+Shift+C</kbd> | Copy the selection, anywhere in the window |
| <kbd>Esc</kbd> | Back to the changes |
| <kbd>Ctrl+B</kbd> | Browse the working tree, with Commits and Terminal out of the way |
| <kbd>Ctrl+D</kbd> | Back to the changes, with all four panes (not in a terminal, where it is end-of-input) |
| <kbd>Ctrl+V</kbd> | Paste the clipboard's files into the file tree, with that pane focused |
| <kbd>Alt+←</kbd> / <kbd>Alt+→</kbd> | Back and forward through the places viewed |
| <kbd>Alt</kbd> | Show or hide the application menu bar (not on macOS, where it is always there) |
| <kbd>F1</kbd> | The shortcuts, in a sheet over the window |
| <kbd>F5</kbd> / <kbd>Ctrl+R</kbd> | Refresh status and log |
| <kbd>Ctrl+O</kbd> | Open another repository in a new tab: the recent-repository menu; again for the folder dialog |
| <kbd>Ctrl+E</kbd> | Open a file by name, from anywhere in the window — the terminal included |
| <kbd>Ctrl+,</kbd> | Settings |
| <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> | Hide or show Files, Diff, Commits, Terminal |
| <kbd>Ctrl+Shift+0</kbd> | Show all four panes again |
| <kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd> | Fill the window with that pane |
| <kbd>Ctrl+Tab</kbd> / <kbd>Ctrl+Shift+Tab</kbd> | Full screen moves to the next pane, or the previous |

## Platform notes

### Linux desktop integration

Both compromises below have the same cause — an Electron app that is *run*
rather than packaged — so both are gone in the `.deb`, and both remain on the
`setup.sh` route, which really is running an unpackaged Electron.

**Window class.** The desktop entry `setup.sh` writes carries
`StartupWMClass=electron`: that is what an unpackaged Electron reports whatever
the application calls itself, and it is what the window list and the dock match
a window against to find its icon. The side effect is that another unpackaged
Electron app in the same session borrows Gitty's icon. The packaged build has
its own executable, so its entry matches `gitty` and the collision cannot
happen.

**Sandbox.** `run.sh` and `cli.js` set `ELECTRON_DISABLE_SANDBOX=1`, because
`chrome-sandbox` cannot keep a root-owned setuid bit inside `node_modules`. The
`.deb` has nothing to work around: its `postinst` sets the helper 4755 on
kernels without unprivileged user namespaces, leaves it 0755 where the
namespace sandbox works, and installs the AppArmor profile Ubuntu 24.04 asks
for. So the sandbox is on for anything installed from the package.

The `.AppImage` is the weaker of the two: nothing about it can carry a setuid
bit, so it depends on unprivileged user namespaces — which Ubuntu 24.04's
AppArmor policy restricts by default. Expect to pass `--no-sandbox` there, or
to install an AppArmor profile of your own. Prefer the `.deb` where you can.

### Wayland and monitors scaled differently

A GNOME Wayland session driving two monitors at different scales can leave
Chromium unable to settle on one: it flips the window's scale factor between
the two several times a second, lays the page out again at each flip, and the
whole interface shakes by a pixel or two for as long as the window is open.
Full screen is where it shows worst. Nothing in Gitty causes it — an Electron
window with no content in it at all shakes the same way — and no window size
avoids it.

Gitty handles it for you: at startup it asks how the monitors are scaled, and
if two answers come back it starts itself again with Chromium's fractional
scaling switched off. That happens before any window exists, so there is
nothing to see but a slightly later start. The cost is that the desktop's
fractional scaling is then ignored — the interface renders at scale 1 and looks
smaller than the rest of the desktop. <kbd>Ctrl+=</kbd> zooms it back, and the
font sizes in **Settings** are the other way to make up the difference.

Two environment variables override the guess. `GITTY_DISABLE_FRACTIONAL_SCALE=1`
switches fractional scaling off whatever the monitors say — useful if the second
monitor is plugged in after Gitty has started, which is the one case the startup
check cannot catch. `GITTY_DISABLE_FRACTIONAL_SCALE=0` keeps it on and stops the
restart, shaking and all.

Setting both monitors to the same scale, in **Settings → Displays**, leaves
Chromium nothing to flip between — the same fix from the other end, where two
screens can share a scale.

One consequence of the restart: the process id `run.sh` prints belongs to the
process that stepped aside, so it names nothing a moment later.

### macOS app bundle

`Gitty.app` is a wrapper, not a package: `Contents/MacOS/Gitty` is a two-line
script that execs `run.sh --fg --any`. `--fg` matters — exec all the way down
means the Dock tile stays on the bundle instead of being orphaned by a process
that outlives it — and `--any` lets a launch from Finder, which has no working
directory to speak of, fall back to the repositories opened most recently.

The name is right in all three places it appears, and only one of them comes
from the bundle. Finder and the Dock read `CFBundleName` and `CFBundleIconFile`
out of `Info.plist`; the menu bar is `app.name`, which `app.setName('Gitty')`
sets before any window exists and `{ role: 'appMenu' }` uses as its label. So
unlike the Linux window-class problem above, nothing here is a compromise —
which is why packaging would buy nothing but signing, and why
`electron-builder.yml` configures Linux targets only.

A bundle launched from Finder inherits launchd's minimal `PATH`, with no nvm and
no Homebrew on it, and `run.sh` needs `node` and `npm` to rebuild when the
bundle is stale. `setup.sh` resolves them at install time and prepends them —
a prefix, so a terminal launch is unaffected. Switching Node versions later
leaves that path stale; re-run `setup.sh` to repoint it.

### Windows

Windows runs from a checkout, through the same `run.sh` and `setup.sh` as the
other platforms, executed by Git Bash, which comes with
[Git for Windows](https://gitforwindows.org/). The README lists the
[steps](../../README.md#on-windows). Nothing is packaged:
`electron-builder.yml` configures Linux targets only.

**What `setup.sh` installs.** A symlink is no use here, because Git Bash's
`ln -s` quietly makes a copy, and a copy of `run.sh` looks for the checkout
beside itself. So `%USERPROFILE%\.local\bin` gets two small wrappers instead:
`gitty`, a bash script for Git Bash, and `gitty.cmd` for cmd and PowerShell,
which hands its arguments to Git's `bash.exe -l`. The `-l` puts Git's own tools
on `PATH`; `CHERE_INVOKING=1` keeps the login profile from changing to your home
directory, so `gitty` still means the current one. Git Bash builds its `PATH`
from Windows', so a single entry for that directory serves every shell, and
`setup.sh` prints the PowerShell line that adds it when it is missing.

The Start Menu and desktop get a `Gitty.lnk` that runs `run.sh --any` in a
minimised Git Bash window. That window closes as soon as Electron has been
started. Its icon is `build/icon.png` wrapped in an `.ico` under
`%LOCALAPPDATA%\Gitty`. The log is `%USERPROFILE%\.local\state\gitty\gitty.log`,
the same path as elsewhere.

**No Visual Studio.** The terminal pane's `node-pty` ships prebuilt N-API
binaries for Windows that load under any Electron, so the `postinstall` step
skips the `electron-rebuild` it runs on Linux and macOS. That rebuild would
need Visual Studio's C++ tools, and fail without them.

**_not a valid Win32 application_ during `npm install`.** This means the 64-bit
Visual C++ runtime is missing, not that a download is broken. Without it,
Windows looks for `vcruntime140.dll` along `PATH`, and a 32-bit copy left there
by some other program (a 32-bit Python is the usual one) cannot load into
64-bit Node. Install the runtime with
`winget install Microsoft.VCRedist.2015+.x64` and run `npm install` again.

**_dubious ownership_.** On a drive that does not record file owners, such as
FAT/exFAT or some network shares, git refuses a repository it cannot prove you
own, and Gitty shows nothing for it. Trust the repository, or every repository
on that drive, in git's own configuration:

```bash
git config --global --add safe.directory D:/path/to/repo
git config --global --add safe.directory '*'   # every repository
```

**The terminal** starts `COMSPEC`, which is `cmd.exe`, unless **Settings →
Shell** picks PowerShell or another shell. **Login shell** does nothing here.

**Line endings.** Git for Windows checks text out with CRLF by default, and
bash reads a trailing CR as part of the command. `.gitattributes` keeps `*.sh`
at LF on every checkout. A checkout made before that file existed picks it up
once the two scripts are checked out again, with
`rm run.sh setup.sh && git checkout -- run.sh setup.sh`.

### When the window freezes

Gitty keeps a log of its own stalls: whenever the main process or the window
stops responding for half a second or more, one JSON line records how long,
and which git calls were running at the time. Run from a checkout, the log is
`logs/stalls/<date>.jsonl` inside it (ignored by git); packaged, it is
`~/.config/Gitty/logs/stalls/`. Attaching that day's file to a bug report
about a freeze says more than a description of it can. `GITTY_STALL_MS=200`
lowers the threshold.
