# Main process, git and the risky parts

## Staging, and the patch surgery

Gitty stages; it does not commit. The message is written by an agent, so a
subject/body box would solve a problem nobody has — what is missing is a place
to decide *which changes are one commit*, which is what the four panes are for.
**Send** types a command into the terminal pane and stops there: no model is
called from inside the app, which is what keeps "nothing leaves the machine"
true. It sits in the **terminal pane's** header, beside the splits, because the
shell it types into is the one thing it touches — the files it talks about are
elsewhere, but the effect is here. The command is picked from the dropdown
beside the button — remembered commands, plus a prompt for one not remembered
yet — and there is deliberately no settings row for it: it is answered once per hand-over, not once per install.
`prefs.ts` owns the list (`gitty.agentCommands`, most recently used first) and a
command joins it by having been run, never by having been typed. **The head of
that list is the current command** — there is no second stored answer to drift
out of it, which is what an earlier `gitty.agentCommand` was — so the picker
shows `agentCommands[0]`, and an empty list greys both controls out. Forgetting
one goes through the main process (`settings:confirmForget`), so the
confirmation is a native modal the window cannot be clicked past — the same
reason discarding a file asks there rather than in the renderer.

`src/main/patch.ts` is the whole of the risky part, and it is pure string work
over `git diff` output so `test/patch.test.ts` can hold it — a wrong patch does
not throw, it writes a wrong index silently. Four rules, and the first is the
one that is easy to get backwards:

- **The direction decides which unselected lines are dropped and which become
  context.** Staging applies to the index against the *a* side, so an
  unselected `-` line is still there (context) and an unselected `+` line never
  was (dropped). Unstaging applies the cached diff in reverse against the *b*
  side, so it is the other way round.
- Only the pre-image side's `@@` position is exact; the other one moves by the
  net line delta of the hunks emitted before it in the same patch.
- A `\ No newline at end of file` marker travels with the line it describes and
  is dropped when that line is.
- Hunk counts are recomputed from the lines that survived, never carried over.
- **A rename's header is rewritten to name one path.** The patch git writes for
  a rename moves the file as well as changing its lines, so applying part of it
  would carry the move along — unstaging one line of a staged rename would put
  the whole rename back. `retargetRename` drops the `rename from`/`rename to`
  and similarity lines and names both sides after the pre-image: the a path
  when staging, the b path when unstaging in reverse. A path git had to quote
  is left alone rather than guessed at.

`git.applyHunks` fetches the patch itself, with the **same context count and
the same pathspec the pane drew with**, or the hunk the user clicked is not the
hunk that gets staged.
`--unidiff-zero` is added only at context 0. Hunk staging is withdrawn entirely
while **Ignore whitespace** is on: that diff does not hold every change it would
apply. The UI offers it only for a single tracked file's diff, where the
displayed patch *is* `git diff -- <path>`; a whole-work-tree diff is against
HEAD and merges both sides.

**A renamed file is asked for by both of its names.** A pathspec is applied
before git pairs a deletion with an addition, so `diff -- <new path>` leaves
the old half filtered out and the file reads as wholly added — every line new,
however little of it changed. `pathArgs` therefore appends the previous path
whenever the file list says the change is a rename, and the renderer carries
that path from the row it drew (`origPath`, out of `--name-status`) into the
diff request and into `applyHunks`. It is the diff pane's answer to the file
pane's, which counts a rename's lines against the old file all along.

## Searching, and the graph

Three reads that share the log's machinery. The filter box has a
`LogFilterMode`: message/author as before, or git's pickaxe (`-S` literal,
`-G` regex) over the diffs. Every expression git is given is an extended one
(`--extended-regexp`), git's own default being POSIX basic, where `a|b` is
literal text — the box is typed in what the rest of the world calls a regular
expression. `shared/regex.ts` decides whether there is an expression there at
all; half of one goes to git as fixed strings (`-F`, or an escaped pattern for
`-G`, which `-F` does not reach), the rule the file tree's filter follows on
the other side of the boundary. Those walk the whole history, so `searchLog` keeps
one child process per root **per kind** — a grep must not cancel the log — and
kills the previous one instead of letting it finish for a reader who has moved
on. Every pattern is an array element, never text in a command line.

`git grep` and `git log -L` open as documents beside the diff (`FileDocState`
kinds `grep` and `lines`), so they inherit the find strip and the doc tabs. A
grep follows the revision on screen, which is the point of it: in a snapshot it
answers about the snapshot.

What the search box takes is a **query**, not a pattern: `foo in:*.py`, the
shape a mail client taught everyone. `src/shared/query.ts` parses it into terms
(`--and`-ed, `-foo` negated) and pathspecs (`-in:` becoming `:(exclude)`), and
is pure string work with no imports for the reason `patch.ts` is — a query read
wrongly searches the wrong thing silently, so `test/query.test.ts` holds it. It
is *shared* rather than main's because both sides read the box: main builds the
command line, the renderer asks whether there is a term in it at all and refuses
to run `in:*.py` alone. Two rules the parse is built around. **Quoting turns
every operator off**, which is the only way to search for `in:` or a leading
dash literally. And a bare `in` is the operator **only when a path follows**
(`looksLikePath`) — code is full of `for x in list`, and eating that word would
be a worse bug than not supporting the colon-less form at all.

The log is read in `--author-date-order`, because the author date is the date
in the column. git orders a log by the *commit* date, and the two part company
whenever a commit is replayed rather than made — a rebase, a cherry-pick, a
squashed pull request, an `am`'d patch. Merge such work from several people and
the dates on screen stop reading downwards. The flag also settles which lane
advances next where several are open, so the graph stays narrow; what it cannot
do is put a child below its parent, since ancestry outranks the clock — the
rows that leaves out of order are marked in `LogPane` rather than re-sorted. Every
pass that pages or shapes the log takes it, the filter's two rev-list passes
included, or a page boundary would fall in one order and its rows be shaped in
another. A file's history is read the same way, for the same reason: its rows
carry the same date column. Its churn pass is not, because that one is read
into a map from hash to numbers and has no order to be in.

That history's other column, how long the file was at each commit, is measured
rather than derived: one `git cat-file --batch` process is asked for every
`<rev>:<path>` at once and the objects come back in the order they were asked
for, so three hundred revisions cost one process rather than three hundred
`git show`s — and on a thousand-commit file the read is a fraction of the two
`--follow` passes that found the commits. The path travels with each revision
because a rename means an older one answers to an older name, which is what the
numstat records carry (a rename names both sides; the newer is that commit's).

Deriving them is what this used to do — count the newest revision, then walk
backwards subtracting each commit's churn — and it is exact only down a single
lineage. A file's history is not one whenever two branches both touched it: the
rows are a timeline, so the two lineages interleave, nothing in the list marks
the crossing, and every subtraction after the first one belongs to the wrong
branch. The walk survives as the fallback for rows past
`MAX_HISTORY_COUNT_BYTES`, where it is anchored at the last measured row rather
than only at the first.

A row that has no count says its size instead, so a binary file's history is a
column of sizes rather than a blank one, and every row has one: a second pass
asks `cat-file --batch-check` about the same `<rev>:<path>` list, which answers
in headers alone — no revision's contents are read, so the pass costs nothing
worth budgeting and reaches the rows the counting budget never did. The file
tree measures the same way for the same reason: `countFileLines` keeps the size
of a file it refuses to count, and returns both.

`src/renderer/src/lanes.ts` computes the commit graph — deliberately not by
parsing `git log --graph`, whose ASCII is typeset for a terminal. A lane holds
the hash it expects next; a commit takes the first lane expecting it or opens
one; its first parent stays, the others take lanes of their own. The layout is
recomputed over the whole loaded list rather than continued from a saved state
at the page boundary: it is a left-to-right fold, so the first 300 rows come
out identical when the next 300 arrive, which is the property paging needs and
is cheaper than keeping boundary state right. `test/lanes.test.ts` pins that.

## Git access

`src/main/git.ts` shells out to `git` via `execFile` — no git library. Parsing
relies on NUL-separated machine formats (`status --porcelain=v2 -z`,
`--name-status -z`, `ls-tree -z`) so paths with spaces and renames survive;
rename records carry an extra NUL field, which is why those loops advance the
index by hand. Diffs above 2 MB are truncated with a notice rather than sent
whole. Whatever `git` is on `PATH` is what the app shows.

`push` / `pull` go through `remoteOp`, which is deliberately non-interactive:
`GIT_TERMINAL_PROMPT=0`, empty `GIT_ASKPASS` / `SSH_ASKPASS`, `ssh -o
BatchMode=yes` and a two-minute timeout. There is no terminal behind an
`execFile`, so a credential or passphrase prompt would block forever with
nowhere to appear. For the same reason it returns `{ ok, output }` rather than
throwing — the pane shows git's own words, and anything needing an answer is
finished in the terminal pane. `pull` is `--ff-only`: a merge that needs a
decision or an editor is not something a button should start.

Diverged branches are the one pull failure that gets an offer rather than a
report. The `git:pull` handler matches git's own words with `pullNeedsRebase`
— `remoteOp` runs under `LC_ALL=C`, so they are in English — and asks natively
whether to rebase, the dialog modal to the window the way discarding's is. Yes
re-runs `pull --rebase`, which replays the local commits and, unlike a merge,
opens no editor; no returns the original failure, and the strip shows what git
first said. Everything else — credentials, the network, a dirty work tree the
rebase then refuses — stays a report.

`submodulePull` is the third caller of `remoteOp`: `submodule update --init
--remote -- <path>`. `--remote` is what makes the file tree's item a *pull* —
the submodule moves to the tip of the branch it tracks rather than to the
commit the superproject records, and the superproject is left pointing at the
old one, so the pull shows up in Changes and committing the new pointer stays
the user's decision. `--init` covers a submodule that was never checked out,
which is the other thing "get me this one" can mean. Which paths are submodules
is read by `submodules` from `.gitmodules` with one `git config -f .gitmodules
--get-regexp` — the alternative, `ls-files --stage`, names every file in the
repository to find the handful with mode 160000. No `.gitmodules` makes git
exit non-zero, which is the empty list rather than an error.

`fileAuthors` is the one walk over history rather than a read of a revision:
who last touched each path in a browsed tree. A `git log -1` per file is the
obvious implementation and the wrong one — a tree is thousands of rows, so it
would be thousands of processes. Instead one `git log -z --name-only` streams
backwards and every path is answered by the first commit that names it; the
child is killed the moment the last one is, so a shallow answer costs a shallow
walk. Twenty thousand commits is the ceiling, and a path the walk did not reach
is simply absent from the answer — as is one git has never seen, which is what
an untracked or ignored file is. `-z` is there for the reason every other
reader here uses it: git would otherwise quote a path that is not plain ASCII.
Merges name no files under the default diff, which is also what "who touched
it" means.

## Git LFS

An LFS-tracked file is a three-line text pointer in the repository, and the
media file lives in a store beside it. `git show <rev>:<path>` therefore hands
back the pointer, not the bytes — and so does the work tree, wherever git-lfs
is not installed or the objects were never fetched. A viewer handed those three
lines fails in whatever way its format fails: Chromium's PDF viewer says the
document could not be loaded, in its own language, and an `<img>` shows a
broken icon. Neither says what happened.

`src/main/lfs.ts` recognises the pointer — pure string work, and tested,
because a false positive would hide a real file whose first bytes happened to
look right. The format is taken exactly: LF endings, the keys in their fixed
order, `sha256` only, one trailing newline. A document *about* Git LFS is not a
pointer to one.

`throughLfs` in `git.ts` then reads the object out of the store directly —
`<git dir>/lfs/objects/ab/cd/<oid>`, which is what `git lfs smudge` would hand
back and works whether or not git-lfs is installed. The git dir comes from
`rev-parse --absolute-git-dir` rather than being assumed to be `<root>/.git`,
which it is not for a submodule or a linked work tree. A pointer whose object
is not in the store is the one case with something to *say* rather than
something to draw, and the pointer knows the real file's size, so the notice
appears where the picture would have been. The size ceilings are checked again
after the pointer is followed: the pointer is 131 bytes and the file it names
is not.

Only the viewers follow pointers. The tree's byte count is the blob's, which
for a tracked file is the pointer's — reading every blob in a tree to find out
otherwise is the walk `fileAuthors` exists to avoid.

## The local web server

`src/main/web.ts` serves commits as plain HTML, and binding `127.0.0.1` is not
on its own a boundary: it keeps other machines out, not other pages in this
machine's browser, any of which can fetch the port — and behind it is every
open repository's contents. So every URL carries a token minted at startup,
as a path prefix (`/t/<token>/…`) rather than a query string. A wrong token is
a **404, not a 403** — a 403 confirms the resource exists. The `Host` header
must be loopback, which makes DNS rebinding pointless. And `Referrer-Policy:
no-referrer` is required: the pages link outward, and one click would otherwise
put the token in a stranger's `Referer`.

## The remote's own pages

`src/main/remote.ts` turns a remote URL into two prefixes — one a commit hash
is appended to, one a revision and a path are — so the commit menu can offer
**Open Remote URL** beside the local server's page, <kbd>Ctrl/Cmd+Click</kbd>
on a commit row can open it without the menu, and the file tree's own menu can
offer the same item for one file. Both come back together (`RemoteBases`) and
are read once per root in `RepoTab`, so the click is local. It is inference and
says so: no protocol asks a remote where its pages are, so an address that
cannot be named comes back null and the menu item is simply absent — a
repository with no remote, a `file://` remote, a Windows drive letter mistaken
for a host, or Azure DevOps, whose pages are not derivable from the remote path.

Everything else is a two-branch rule: GitLab keeps its non-file routes under
`/-/`, Bitbucket says `commits` and `src`, and GitHub, Gitea, Forgejo, Codeberg
and Gogs all say `/commit/<hash>` and `/blob/<rev>/<path>` — which is what an
unrecognised host is given too, self-hosted Gitea and Forgejo being common and
carrying no name to match on. `git.ts` picks the remote the current branch
tracks, else `origin`, else the first one configured; the parsing is pure
string work with no repository behind it, and `test/remote.test.ts` is the list
of forms that must keep working.

Which revision a file's address names is the renderer's question, not git's:
the view's own revision where it has one — a commit, a snapshot, the newer end
of a range — and the checked-out branch in the two views that are the directory
on disk. A detached HEAD has no name the remote would know and an untracked
file has never been pushed, so neither gets the item; that a named branch and
its files actually reached the remote is a guess, the same kind of guess the
address itself is.

A hash is not a guess, though, which is why one the remote cannot have is left
out rather than linked to a 404: `unpushedCommits` is `rev-list --all --not
--remotes`, the work between the last push and now, and both a commit's remote
link (menu item and <kbd>Ctrl/Cmd+Click</kbd> alike) and a file's are withheld
at a revision in that set. It is re-read on every refresh, because a push is
what empties it, and it answers with the empty set where there are no
remote-tracking refs at all — a remote that has never been fetched would
otherwise make the whole history look unpushed. A branch name stays the guess
it was: it names a page that exists, whatever it holds.

A bare host (`git@github:user/repo.git`) is an ssh config alias: git stores it
verbatim, so `remote.ts` expands it through the user's `~/.ssh/config`
(`src/main/sshconfig.ts`, parsed at most once per file change) before the
layout branch, falling back to well-known names (`github` → `github.com`) when
there is no config. A `HostName` of `ssh.<domain>` is a transport endpoint, not
the site, and loses the `ssh.` prefix; a dotted host is never expanded, because
the remote keeps the real hostname in the common `Host github.com` → `HostName
ssh.github.com` SSH-over-443 setup. An internal host that merely contains a
well-known name is left alone.

The resolution is remembered per repository (`src/main/remoteCache.ts`,
`userData/remote-cache.json`), so reopening a repository reuses the answer
after one `git remote get-url` check plus a fingerprint that the ssh config has
not changed — the fingerprint is what makes an edited config invalidate the
remembered host, and a moved or renamed remote fails the URL check. Known
limits: a branch whose upstream moves to a different remote while the app is
open keeps the remembered base until a recompute is forced, and `Include`
directives are not followed.

## Gource

`src/main/gource.ts` is an *optional* companion, and the shape follows from
that: `available()` walks `PATH` once (cached — PATH does not change under a
running app) and the commits pane simply does not render the button when it
comes back false, rather than showing one that fails on click.

`play()` spawns it detached and resolves after a 2.5 s grace period: long
enough to catch the immediate failures (no display, no OpenGL, an unreadable
path) and report gource's own stderr through the same strip push and pull use,
short enough that the button does not feel stuck. If it is still alive when the
timer fires, its pipes are destroyed and it is `unref`'d — gource draws its own
window and is meant to outlive Gitty.

## Pasting files into the work tree

The file tree accepts a paste, which means answering "what did the desktop put
on the clipboard when the user pressed copy in a file manager?" — a question
with no single answer. `src/main/clipfiles.ts` parses the three shapes that
turn up, in the order of how much each says: `x-special/gnome-copied-files`
(and the KDE/MATE/Nautilus spellings of the same thing), which is the only one
carrying the copy/cut verb; `text/uri-list` and macOS's `public.file-url`,
which carry paths and nothing else; and plain text as absolute paths, which is
what copying a path out of a terminal leaves. It is pure string work with no
imports so `test/clipfiles.test.ts` can hold the shapes without a clipboard.

Two things about that list are load-bearing. The plain-text fallback is
deliberately all-or-nothing — one line that is not an absolute path disqualifies
the whole payload, and `index.ts` additionally requires every path to exist —
because otherwise ordinary copied prose would read as a file list. And the
formats are **read rather than looked up**: `clipboard.availableFormats()`
reports the MIME types Chromium knows and leaves the desktop's `x-special/*`
ones out entirely, while `clipboard.readBuffer` returns them perfectly well.
Measured on this Wayland session; asking first would find nothing.

`file:paste` resolves its target against the root like every other path the
renderer names, and the sources never cross IPC — they come from the clipboard
in the main process. A name the target already holds is the one question worth
asking, and it is asked once for the whole paste rather than per file: keep
both, which is `copyName`'s `notes (copy).md`, or replace. Pasting into the
directory a file came from skips that question, being a duplicate made on
purpose. A cut renames, falling back to copy-and-remove across filesystems, and
clears the clipboard afterwards — leaving it would move the same files again
from a source no longer there. The count that comes back only decides whether
the renderer refreshes early; the watcher would get there anyway.

Which views offer it is the renderer's business (`contextMenus.ts`): the
changes and the working tree are the working directory, and a commit, a range
or a revision's snapshot describes something that is not on disk to write into.

## Running a snapshot's programs

`snapshotFiles` reads `ls-tree -r -z` rather than `--name-only`, for the mode:
`100755` is what makes a file a program at that revision, and the file tree
carries it as `exec` so the context menu can offer **Run in the Terminal**.
Browsing the work tree answers the same question with `stat` — the same call
that already checked the file was still there.

`snapshotExport` checks the commit out into a temp directory with
`git worktree add --detach`. The whole tree because a script reads its
neighbours, and giving it only itself would run the old program against today's
everything else; a **linked work tree** rather than an unpacked `git archive`
because a program in a repository asks the repository questions — `rev-parse`,
`describe`, what branch this is — and inside an archive every one of them
fails. The linked tree is a real one, detached at that commit with an index and
a HEAD of its own, so nothing run inside it can reach the checkout the user is
working in.

A tree over `MAX_SNAPSHOT_EXPORT_BYTES` (256 MB, in `shared/types.ts` because
the renderer names the number when it reports the refusal) is not checked out
at all. The size comes from `ls-tree -r -l`, which is git's record of the blob
sizes rather than a byte read from disk, and it is asked *before* anything is
written — a repository that carries its binaries or its vendored dependencies
would otherwise put gigabytes into `/tmp` on a right-click. A submodule prints
`-` for its size and counts as nothing, which is right: a checkout brings none
of it in.

The price is that this writes to the repository: a registration under
`.git/worktrees`. `worktree prune` runs first, which is what clears
registrations whose directories `/tmp` has since been cleaned of — without it,
the same snapshot after a reboot would fail on a name that is taken but no
longer there. The export is keyed by the hash and reusable; the `.git` file
inside the directory is what "already checked out and still sound" is read
from.

Main writes no processes for this. The renderer types
`cd <tree> && ./<file>` into the terminal pane **without the Enter**
(`runInTerminal(root, command, false)`), which keeps the act of running an old
program the user's own, and gives it a real tty for whatever it prompts for.

## Recent repositories

`src/main/recent.ts` keeps the list in `app.getPath('userData')` — which is why
`app.setName('Gitty')` runs before anything else, or an unpackaged run would
scatter state into `~/.config/Electron`. Reads filter out paths that no longer
exist, so a deleted repository disappears from the menu on its own. Remembering
is best-effort and never blocks opening a repository.

It keeps a hundred entries. The renderer shows only the first twelve until
**More** or a search (`RepoMenu`, filtered by the pure `recentFilter.ts`), so
the length of the list is a matter of how far back a search can reach, not of
how tall the menu is.

A search that matches none of them falls back to the disk (`recent:guess`,
`guessRepos`). Where to look is decided by the pure `guess.ts` from the list's
own layout: each remembered repository's parent is searched one level down,
its grandparent two levels down — never home's parent or the filesystem root,
which hold users rather than projects — then a fixed set of usual places under
home. A directory reached several ways keeps its deepest search and the summed
weight. A name matches when every word is in it, ignoring case and `-_.`;
whole-name beats prefix beats substring, and a heavier base breaks ties. The
scan skips dot-directories and `node_modules`, does not descend into a
repository, and stops after four hundred directory reads. The menu offers the
results under a question and opens nothing on its own: picking one *is* the
confirmation, and opening it records it like any other.

## Asking before closing several repositories

The renderer reports its open tabs over `repo:open-set` whenever they change,
because by the time the window's `close` event fires there is no asking it. With
two or more open, `close` is cancelled, the native dialog is shown, and on
**Quit** the close is repeated with `closeConfirmed` set. `before-quit` marks a
close that Quit started, so the confirmed close is repeated as `app.quit()` —
on macOS closing the window alone would leave the app running. A cancelled
Quit clears that mark, or a later plain close would quit the app.

## One instance, or several

The window holds every repository as a tab, so the useful default is one
process per user: typing `gitty <repo>` in any directory should land a tab in
the window already open rather than start a second copy of the app. That is
Electron's single-instance lock. The launching process passes its repository as
the lock's `additionalData`, and the holder receives it on `second-instance`,
raises its window and forwards the path to the renderer, which opens it through
the same `openTab` the File menu uses — so an argument that is not a work tree
is reported the same way there too.

The lock is requested at module scope, before `ready`: Electron settles the
race between two launches at the moment the lock is taken, and everything after
it in startup must not run in a process that is about to quit — hence the
`quitting` flag the `whenReady` handler checks first. The Wayland scale
relaunch is safe alongside it because `app.relaunch` starts the new process
only after this one has exited, so the lock is free by then.

Which makes this the one preference the main process has to know before a
window exists, and so the one that cannot live in the renderer's
`localStorage`: `src/main/prefs.ts` keeps it in `settings.json` beside the
recent list. Changing it takes the lock or releases it there and then, so the
next `gitty` typed behaves as the setting now says. Taking it can fail — a
second window started while the setting was off still holds it — and then the
change waits for the next launch.

## Terminal

The pane splits, so ptys are kept in a `Map` keyed by a session id the renderer
mints (`src/main/index.ts`), and every `terminal:*` message names its session.
A disposed session goes silent so its exit notice cannot land in the terminal
that replaced it, and a reload disposes them all — the ids that could reach
them are gone with the old renderer.

`TerminalsPane` holds the split as a tree: a leaf is one shell, a branch shares
its area between children, and splitting the same way twice extends the branch
instead of nesting. Changing the set of children remounts its `Group` so the
panels share out evenly again, which is only affordable because **the xterm
instances live outside React** — the `sessions` registry in `terminals.ts` owns
the DOM node and the terminal (created by `ensureSession` in `TerminalPane.tsx`),
and the component merely re-parents that node. Unmounting a real xterm would
take the running shell with it, and every split moves terminals between panels.
Sessions therefore end only in `destroySession`: **Close**, a shell that exited,
or the tab's `TerminalsPane` unmounting (closing the repository tab).

## Refresh

`src/main/watcher.ts` watches the work tree recursively, filters `.git` down to
the few paths that matter (`HEAD`, `index`, `refs/`, …) plus build-output noise,
and debounces into a `repo:changed` event tagged with the root. The main process
keeps one watcher per open repository in a `Map`; closing a tab (`repo:close`)
stops that root's watcher. Each `RepoTab` reloads status and log only for its own
root. Watching is best-effort; the manual refresh path must keep working if it
fails.

On Linux it does **not** use `fs.watch(root, { recursive: true })`. Node
implements that option there in JavaScript: a synchronous walk of the whole
tree with `readdirSync` and `statSync`, and an inotify watch on every file —
`.git/objects` and `node_modules` included, since filtering only happens to
events. On the main process's thread that held a large work tree's window
for seconds per watch, long enough for the desktop to offer to kill it.
`watchDirs` instead puts one watch on each *directory* (inotify reports a
directory's children), walks asynchronously one `readdir` at a time, and does
not descend into what could never matter: `.git` beyond itself and `refs/`,
the build-output names in `NOISE`, and whatever `git ls-files --ignored
--directory` names. A directory created or moved in later is picked up from
its parent's `rename` event. It stops at 8192 directories — inotify watches
are a per-user kernel budget shared with every other program. macOS and
Windows keep the recursive option, which their kernels implement for one
handle.

The stall log (below) is how the next such case gets found.

The same lesson applies to anything that runs once per file of a commit:
never one process each. Spawning is synchronous on the main thread, so
`countFileLines` reads a commit's files through one `cat-file --batch-check`
(sizes) and one `cat-file --batch` (line counts), not a `git show` per file.

The debounce narrows the burst but does not serialise anything: a refresh and
the next event can both be waiting on `git`, and the replies come back in
whatever order git finishes. Both `refresh` and `loadDiff` therefore stamp each
call with a sequence number and drop a reply that a newer call has overtaken.
Without it the panes disagree — the diff pane re-runs git for every render and
so always shows the truth, while a stale `git status` landing last leaves the
Changes pane (and the title bar's count) listing changes already committed.

## The window, and Wayland's scale

The window is created hidden and shown at its first paint, with the fallback
off `did-finish-load` that the Wayland note in `CLAUDE.md` explains. What it
does *not* do is choose a size against the screen: no clamp to the work area
helps with the problem below, and one was measured and taken out again.

A GNOME Wayland session with two monitors at different scales can leave
Chromium flipping the window's scale factor between them — measured here at
about thirteen times a second, between a `devicePixelRatio` of 1.203125 (an
external monitor at scale 1) and 1.50390625 (a built-in one at 1.25), each
carrying the desktop's 1.2 text scaling. Every flip changes the viewport by a
pixel and lays the page out again, so the interface shakes. It is not ours: an
empty `BrowserWindow` loading a blank document does the same, and it reproduced
on three launches out of three.

What was tried, and what it did:

| | |
| --- | --- |
| `--force-device-scale-factor` | still flips |
| `--enable-features=WaylandFractionalScaleV1` | still flips |
| `--ozone-platform=x11` | steady, at a `devicePixelRatio` of 2.40625 — twice the size |
| a window small enough to fit the monitor | steady, but a clamped default still grew to fill it and flipped again |
| `--disable-features=WaylandFractionalScaleV1` | steady, windowed and full screen, at a `devicePixelRatio` of 1 |

So the last one is what the app sets — but not unconditionally: with it the
desktop's fractional scaling is ignored, which on a single fractionally scaled
monitor is a regression, the interface rendering smaller than everything around
it. It is worth having only where the flip can happen, which is where two
monitors are scaled differently.

That is knowable from `screen`, and `screen` needs `ready`; the switch is read
before Chromium starts, which is long before. The two cannot be reconciled in
one process, so `relaunchWithoutFractionalScale` starts a second one:
at `ready`, before the web server or any window, it compares the displays'
`scaleFactor`s and — finding more than one — calls `app.relaunch` with
`--disable-features=WaylandFractionalScaleV1` appended to `process.argv`, then
`app.exit(0)`. Nothing has been shown yet, so the restart costs a moment and
shows nothing. The repository argument survives because it is passed through
untouched, and `initialPath` skips `-` arguments anyway.

Three guards keep it from starting itself forever: the relaunched process finds
the switch already on its command line, `GITTY_SCALE_RELAUNCHED` is set in the
environment it inherits, and `GITTY_DISABLE_FRACTIONAL_SCALE` — `1` to switch
fractional scaling off whatever the monitors say, `0` to keep it on — takes the
decision away from the check entirely. The switch itself goes on
`app.commandLine` before `ready`, so it works for the packaged build as much as
for `run.sh`.

What it does not catch: a monitor plugged in after the app started. Relaunching
then would take the terminal panes' shells with it, so nothing happens
automatically and `GITTY_DISABLE_FRACTIONAL_SCALE=1` is the way to ask. And the
pid `run.sh` prints is the process that stepped aside, not the one now running.
Upstream: electron#35325, electron#46843.

## The stall log

`src/main/stalls.ts` records every stall of `THRESHOLD_MS` (500 ms,
`GITTY_STALL_MS` to change) or longer as one JSON line in
`logs/stalls/<local date>.jsonl` — inside the checkout when unpackaged, where
`logs/*` is gitignored; under `app.getPath('logs')` when packaged. Three
sources feed it:

- **main, `event-loop`** — a 100 ms interval that arrived late by the
  threshold. This is the stall the desktop answers with "not responding".
- **renderer, `longtask`** — a `PerformanceObserver` in the *preload*, which
  shares the page's thread, so the renderer itself has no code or API for it.
  It sends anything over 200 ms on `stall:renderer`; the main process applies
  the threshold.
- **renderer, `unresponsive` / `recovered`** — Chromium's hang detector, for a
  renderer too stuck to report its own long task. `unresponsive` is written as
  it starts, so a window that is killed still leaves a line.

Each record carries the IPC calls **in flight** across the stall and those
that **finished** within three seconds before it, with arguments summarised by
the pure `stallFormat.ts` (arrays as their length, objects as their fields,
strings cut at 120 characters). That is the context that identified both
causes above — a stall with `git:fileLines` over `[2000 items]` in flight
needs no profiler. It is collected by wrapping `ipcMain.handle` once, in
`startStallLog`, which therefore runs **before** `registerIpc`: a handler
registered earlier is not timed.

Writes are asynchronous, so recording a stall cannot extend one; a record made
in the last moments before quitting can be lost. A day's file stops at 5 MB.
