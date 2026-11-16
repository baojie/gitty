# File viewers

The panes that show a file rather than a diff — `CodePane`, `MarkdownPane`,
`ImagePane`, `PdfPane` — and the two outlines beside them.

## `fileView`

`fileView` swaps the diff for the file itself. It is deliberately **not**
persisted and is cleared whenever another file or commit is selected: a history
browser defaults to diffs, and viewing a file is an action (double-click, menu,
header toggle) rather than a mode to get stuck in. Snapshot mode forces it on —
a snapshot has no diff. Either way the source comes from `git.readWorking` in
the work tree and `git.snapshotFile` at a revision; `CodePane` renders it with
line numbers, and `MarkdownPane` takes over for `.md`.

## Highlighting

`highlight.ts` is shared by both. highlight.js is imported through `lib/core`
with languages registered one by one — the full bundle dwarfs the rest of the
renderer — and its token colours are mapped onto the app palette in CSS rather
than importing one of its themes. `highlightLines` exists because highlight.js
emits one blob whose spans run across newlines (block comments, template
literals): it walks the output keeping the stack of open spans, so each line can
be its own element without broken markup.

## Formatting JSON

`src/renderer/src/json.ts` re-indents a JSON document, and the **Format** button
in the diff header flips the same `preview` flag markdown's button flips — the
two never appear together, so one flag carries both meanings and the browsing
history records the choice for free.

It is a small parser rather than `JSON.stringify(JSON.parse(text), null, 2)`,
because that does not round-trip a file: `1e999` comes back `null`, a number
past a double's precision loses its last digits, numeric-looking keys come back
in numeric order and a duplicate key is dropped. A viewer must show what is in
the file, so every scalar is re-emitted as the source spelled it and only the
whitespace between tokens is the formatter's. `null` for anything that is not
one complete document is the same answer as *there is nothing to offer here*:
`RepoTab` calls it to decide whether the button exists at all, and `FileDoc`
falls back to the stored text if it ever disagrees. Pure string work with a
silent failure mode, so it is tested in `test/json.test.ts`.

`formatJsonDoc` is the same work with the fold ranges beside the text —
`formatJson` is the wrapper that drops them — and `CodePane` draws an arrow for
each. They are recorded **while emitting**, as the line the `{` or `[` was
written on paired with the line its closing bracket lands on, because the
scanner already knows a brace inside a string is not a brace; reading them back
off the formatted text would need that knowledge a second time. An empty
container is written `{}` on one line and records nothing, so every fold has
something to hide.

Folding is `CodePane`'s only optional behaviour and stays keyed to the `folds`
prop: a document that arrives without one — every source file, whose nesting
would be a guess — renders exactly as it did, arrows and all absent. Collapsed
lines are not rendered rather than hidden in CSS, which is what keeps Ctrl+F
honest (`useFind` searches the DOM, so its `contentKey` carries the folds as
well as the chunk count). Nothing stays folded across a new `folds` map: a
re-read work-tree file may have moved the line a fold named.

## The code outline

`src/renderer/src/symbols.ts` is the other outline — the declarations in a
source file, which `CodePane` draws beside it in the same `Group` shape
`MarkdownPane` uses for headings. It is pure string work over the text, for the
reason `main/patch.ts` is: a wrong outline does not throw, so
`test/symbols.test.ts` holds it. Comments and strings are blanked to spaces
first (columns preserved, or a `{` in a string moves the whole tree), nesting is
brace depth — indentation for the languages written that way — and a name
appears only where a keyword put it. Two conventions keep the loose patterns
honest: `member` rules match only inside a class, where a statement cannot
appear, and `guard` marks the rules with no declaring keyword in front of the
name, which are the ones `if (x) {` can fool. A language it cannot read
produces **no** outline rather than a guessed one.

It imports nothing, deliberately: `RepoTab` calls
`hasOutline(outlineLanguage(path))` to decide whether to draw the button, and
reaching into `highlight.ts` for that would drag highlight.js into the main
bundle — hence its own small extension table beside that module's.

Outline `Group`s follow the two rules every other `Group` follows (the id
carries the repository, and it is `disabled` while its tab is hidden). Sizes
live as long as the window — nothing in the app calls `useDefaultLayout`, which
is what react-resizable-panels v4 needs to persist them.

## MarkdownPane

markdown-it runs with `html: false` so raw HTML stays inert without a
sanitiser; heading ids are assigned on the token stream before rendering, so the
outline and the document cannot disagree; front matter is sliced off first,
since markdown-it would read `---` as a horizontal rule; and link clicks are
intercepted, because a plain `<a>` navigation would replace the whole app
window.

That interception is also where a link goes *somewhere*: an `http(s)` one to the
system browser, a `#` one to the heading, and — with Ctrl or Cmd held — a
relative one to the file it names, opened as a document beside the diff.
`resolveInRepo` decides what counts as in-repo (the same function the images
use, so a link and an image resolve alike, and anything climbing out past the
root resolves to nothing). The revision is the *document's*, not the view's: a
README read at a commit links to that commit's files. The `#fragment` rides
along in `FileDocState.anchor` and the opened pane scrolls to the heading whose
generated id matches it — once per document-and-anchor, or the images landing
later would drag the reader back up. A hover title says so, written onto the
token before rendering rather than onto the DOM after it — same reason as the
images — and never over a title the author wrote.

A plugin can mark the *text* of a document as well as its markup, through a
`text` render rule fed from `useDocumentMarks`. The pane knows nothing about
what is being marked: see the `marks` extension point in `ref/spec/plugins.md`,
and `ref/spec/semantic-reading.md` for the plugin that uses it.

## Table columns

A rendered table is a real `<table>` inside a `.md-table` block, and it is the
block that scrolls sideways: column widths mean nothing to a `display: block`
table, and the wrapper was already there for the source-line gutter, which a
scrolling table both clipped and pushed below the rows.

Untouched, the table is laid out by the browser, so the columns fit their
content — the point of the wrapping toggle being `overflow-wrap: break-word`
rather than the `anywhere` the fences use: `anywhere` lets a column's minimum
width fall to a single character, and one wide column then squeezes the rest
into vertical stacks of letters.

Dragging a boundary freezes the table at what it measures *then* — every column
at its current width, `table-layout: fixed`, `width: max-content` — so one
boundary moves and nothing else reflows. `max-content` rather than `auto`
because an auto table is never narrower than its container, which would make
the columns steal width from each other instead of the table growing and the
wrapper scrolling. Measured widths are rounded **up**: they are fractional, and
a column trimmed by half a pixel wraps the header it was fitted to.

The widths are then applied as a generated stylesheet, keyed by the table's
index in the document and scoped by the pane's own `useId` — `.md-body` is a
global class, and another tab's document must not be resized along with this
one. As CSS rather than as attributes on the cells, for the reason the images
and the marks are also done in the render pass: React rewrites that subtree
wholesale. The grips are rendered *into* the HTML for the same reason, empty so
they stay out of a find and out of a copied selection. Double-clicking one
drops the table's entry and hands it back to the browser; opening another
document drops them all, since the indices name this document's tables.

## Images

Images are the one thing the renderer cannot resolve for itself: a relative
`src` would be fetched against the bundle, and a revision's bytes were never on
disk at all. `git.readImageFile` returns them as a data: URL (`ImagePane` for a
file opened on its own, `MarkdownPane` for the ones inside a document), keyed by
the same `rev` as the document, so a commit renders with its own screenshots.
The substitution happens **in the render pass** — the image rule reads a map off
markdown-it's `env` and re-renders once the fetches land. Patching `src` onto
the rendered DOM instead is the obvious thing and does not work: React owns that
subtree through `dangerouslySetInnerHTML` and rewrites it wholesale, silently
discarding the patch.

## PDFs

A PDF is binary the way an image is, so it takes the same route: `FileDoc`
branches on `isPdfPath` **before** reading anything as text, and `readPdfFile`
returns the bytes from the work tree or from `git show`. What renders them is
the viewer Chromium already carries — pages, zoom, search, printing and a
thumbnail rail, none of it ours. Two things switch it on, and it is a blank
frame without either: `plugins: true` in the window's `webPreferences`, since
the viewer is a plugin and Electron leaves plugins off, and `frame-src 'self'
blob:` in the CSP, since `default-src 'self'` covers frames as well.

The bytes travel as a `Uint8Array` rather than as the data: URL an image uses:
a document is megabytes where an icon is kilobytes, base64 is a third larger
again, and it would sit in the DOM as an attribute. The renderer wraps them in
a blob and revokes the URL when the pane lets go — an object URL keeps its blob
alive for the life of the window otherwise. The cost is the name in the
viewer's own toolbar, which is the object URL: a blob has no path to take a
name from, and a `File` does not lend the viewer its name either — measured.
The pane header and the document tab both name the file, so nothing is lost
but the repetition.

A PDF is also refused a line count, which it would otherwise get: it is mostly
text, so a small one has no NUL byte to mark it binary, and "33 lines" says
nothing about a file measured in pages. The row shows its size instead.

## The `dangerouslySetInnerHTML` subtree

Two consequences worth knowing before touching it.

**Memoise the prop object, not just the string.** React sets innerHTML whenever
the `dangerouslySetInnerHTML` prop is a different object, so a fresh `{__html}`
literal per render rebuilds the nodes on every state change — the scroll handler
that tracks the outline was enough to do it continuously. The same applies per
line in `CodePane` and `BlamePane`, which is why both build their `{__html}`
objects in a `useMemo` beside the highlighted lines.

**Anything anchored into the document must survive that rewrite anyway** — which
is why find matches are painted with the CSS Custom Highlight API rather than
with `<mark>` elements — see *Finding text* in `renderer.md`.
