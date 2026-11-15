/**
 * Shared interfaces for the i18n message tables.
 *
 * Both `MainMessages` and `RendererMessages` are plain objects whose leaves are
 * either static strings or arrow functions that take typed parameters and return
 * a string. There is no runtime interpolation — the compiler checks every call
 * site, so a missing key or a wrong parameter type is a typecheck error.
 */

// ── Main process ────────────────────────────────────────────────────────────

/**
 * The languages the interface is translated into. It lives here rather than
 * beside the renderer's locale plumbing because both processes and every
 * plugin name it: a plugin holds its own strings as `Record<Locale, …>`, and
 * that record is what says a language is missing.
 */
export type Locale = 'en' | 'zh' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru' | 'pt'

export interface MainMessages {
  readonly menu: {
    readonly file: string
    readonly openRepo: string
    readonly closeRepo: string
    readonly settings: string
    /** Label for the last File item: "Close Window" on macOS, "Quit" elsewhere. */
    readonly closeWindow: string
    readonly quit: string
    readonly edit: string
    readonly undo: string
    readonly redo: string
    readonly cut: string
    readonly copy: string
    readonly paste: string
    readonly delete: string
    readonly selectAll: string
    readonly view: string
    /** Gitty's own refresh — reloading status and log, not the page. */
    readonly refresh: string
    readonly reload: string
    readonly devTools: string
    readonly actualSize: string
    readonly zoomIn: string
    readonly zoomOut: string
    readonly fullscreen: string
    readonly help: string
    readonly about: string
    /** Help ▸ Keyboard Shortcuts — opens the same sheet F1 does. */
    readonly shortcuts: string
    readonly github: string
  }
  readonly dialog: {
    readonly openRepoTitle: string
    readonly notARepo: string
    readonly notInsideWorkTree: (path: string) => string
    /** Confirming a deletion from the work tree, and reporting a failed one. */
    readonly deleteTitle: string
    readonly deleteConfirm: (name: string) => string
    readonly deleteDetail: string
    readonly deleteButton: string
    readonly cancelButton: string
    readonly deleteFailed: string
    /** Second ask, where the system has no trash to move the file to. */
    readonly deletePermanentConfirm: (name: string) => string
    readonly deletePermanentDetail: string
    readonly deletePermanentButton: string
    /** Confirming that a file's uncommitted changes are to be thrown away. */
    readonly discardTitle: string
    readonly discardConfirm: (name: string) => string
    readonly discardDetail: string
    readonly discardButton: string
    /** Pasting the clipboard's files into the work tree: the one question is
     *  what to do about a name the target directory already holds. */
    readonly pasteTitle: string
    readonly pasteConflict: (n: number) => string
    readonly pasteConflictDetail: string
    readonly pasteKeepBothButton: string
    readonly pasteReplaceButton: string
    readonly pasteFailed: string
    /** Confirming that a remembered agent command is to be forgotten. */
    readonly forgetTitle: string
    readonly forgetConfirm: (command: string) => string
    readonly forgetDetail: string
    readonly forgetButton: string
    /** A pull that could not fast-forward: the one offer worth making is to
     *  replay the local commits on top of what was fetched. */
    readonly rebaseTitle: string
    readonly rebaseConfirm: string
    readonly rebaseDetail: string
    readonly rebaseButton: string
    /** Closing the window with more than one repository open: asked so a
     *  stray Ctrl+Q does not take the whole set of tabs with it. */
    readonly quitTitle: string
    readonly quitConfirm: (n: number) => string
    readonly quitDetail: string
    readonly quitButton: string
  }
  readonly window: {
    readonly title: string
  }
  readonly git: {
    /** Title for a whole-work-tree diff when it is truncated — everything
     *  uncommitted at once. Reads as "Changes"; the key keeps the internal
     *  "worktree" name of the view it belongs to. */
    readonly workingTree: string
    readonly diffTruncated: string
    readonly untrackedOmitted: (n: number) => string
    readonly notAnImage: string
    readonly imageTooLarge: string
    readonly pdfTooLarge: string
    readonly lfsNotFetched: string
    readonly done: string
    readonly gitFailed: string
    /** A hunk selection that came out empty — nothing was left to stage. */
    readonly nothingToApply: string
    readonly pathEscapesRepo: string
    readonly changesCount: (n: number) => string
    /** Parenthetical labels used in diff titles. */
    readonly untrackedLabel: string
    readonly stagedLabel: string
    readonly unstagedLabel: string
  }
  /** The optional gource companion; only ever seen when it goes wrong. */
  readonly gource: {
    readonly failed: string
    readonly notInstalled: string
  }
}

// ── Renderer process ────────────────────────────────────────────────────────

export interface RendererMessages {
  readonly app: {
    readonly title: string
    /** The About dialog, opened from the title-bar brand. */
    readonly about: {
      /** The brand's tooltip, and the dialog's heading. */
      readonly title: string
      readonly version: (v: string) => string
      readonly author: (name: string) => string
      /** `when` is the build time, already formatted in the active locale. */
      readonly builtAt: (when: string) => string
      readonly electron: (v: string) => string
      readonly chromium: (v: string) => string
      readonly node: (v: string) => string
      /** The label on the link to the project's home page; the URL is not
       *  translated. */
      readonly github: string
      /** The link that leaves for the shortcut sheet, beside the GitHub one. */
      readonly shortcuts: string
      readonly close: string
    }
    /** The keyboard shortcut sheet, opened with F1 or from the Help menu.
     *  The key names themselves are not translated — they are what is printed
     *  on the keyboard — so only the section headings and the actions are. */
    readonly help: {
      readonly title: string
      readonly close: string
      /** Section headings, in the order the sheet lists them. */
      readonly sectionCommits: string
      readonly sectionViews: string
      readonly sectionPanes: string
      readonly sectionApp: string
      readonly moveSelection: string
      readonly showCommit: string
      readonly markSecond: string
      readonly openCommitPage: string
      readonly openFileTab: string
      readonly find: string
      readonly copy: string
      readonly paste: string
      readonly backToChanges: string
      readonly browse: string
      readonly changesAllPanes: string
      readonly navHistory: string
      readonly togglePanes: string
      readonly allPanes: string
      readonly fillWindow: string
      readonly cyclePane: string
      readonly shortcuts: string
      readonly refresh: string
      readonly openRepo: string
      readonly quickOpen: string
      readonly settings: string
      readonly menuBar: string
    }
    readonly settings: string
    readonly openRepository: string
    readonly refresh: string
    /** Hover tip for the Refresh button, naming the keys that refresh. */
    readonly refreshTitle: (accel: string) => string
    /** Hover tip for the title bar: Alt toggles the hidden menu bar. */
    readonly menuTitle: (accel: string) => string
    readonly panes: string
    readonly noRepo: string
    readonly noReposOpen: string
    readonly recentlyOpened: string
    readonly showHidePanes: string
    readonly changesCount: (n: number) => string
    readonly notInWorkTree: (path: string) => string
    readonly notInWorkTreeHint: (path: string) => string
  }
  readonly tab: {
    readonly uncommittedChanges: (path: string) => string
    readonly closeRepository: string
    readonly openAnotherRepo: string
    /** The tab's right-click menu; renames what the tab shows. */
    readonly rename: string
    readonly renameTitle: string
    readonly renamePlaceholder: string
    readonly renameSubmit: string
    readonly renameCancel: string
  }
  readonly recent: {
    readonly noOtherRepos: string
    readonly openRepoEllipsis: string
    readonly clearRecent: string
    /** Hover tip for a recent-repo entry. */
    readonly tooltip: string
    /** The × at the right of one, which takes it out of the list. */
    readonly forget: string
    readonly accelOpen: string
    /** The filter box at the top of the menu, which searches the whole list. */
    readonly searchPlaceholder: string
    /** The last row while only the most recent few are shown. */
    readonly more: (n: number) => string
    readonly moreTitle: string
    readonly noMatch: string
  }
  /** The back / forward buttons and the browsing-history menu. */
  readonly nav: {
    readonly backTitle: string
    readonly forwardTitle: string
    readonly historyTitle: string
    readonly noHistory: string
    /** A place, as the menu lists it. The `worktree` view shows the uncommitted
     *  changes and reads "Changes"; the key keeps the internal View-mode name. */
    readonly changes: string
    /** The same view but browsing the whole working directory (a snapshot with
     *  a null hash): the "work tree" concept, as opposed to `changes` above. */
    readonly worktree: string
    readonly worktreeFile: (path: string) => string
    readonly commit: (short: string, subject: string) => string
    readonly commitFile: (path: string, short: string) => string
    readonly snapshot: (short: string, subject: string) => string
    readonly snapshotFile: (path: string, short: string) => string
    readonly range: (from: string, to: string) => string
    readonly rangeFile: (path: string, from: string, to: string) => string
    /** Wrappers for a blame or file-history document. */
    readonly blame: (label: string) => string
    readonly fileHistory: (label: string) => string
    /** The history of a line range, and a repository-wide search. */
    readonly lineHistory: (path: string, start: number, end: number) => string
    readonly search: (pattern: string) => string
  }
  readonly branch: {
    readonly noBranchesYet: string
    readonly backTo: (branch: string) => string
    readonly browseHint: string
    /** The two names in the title bar: what git is on, what the log shows. */
    readonly checkedOutHint: (branch: string) => string
    readonly browsingHint: (branch: string) => string
    readonly headLabel: string
  }
  readonly files: {
    /** The file pane's title in the `worktree` view — the uncommitted changes. */
    readonly changesTitle: string
    /** The file pane's title while browsing the whole working directory
     *  (a snapshot with a null hash). */
    readonly workingTreeTitle: string
    readonly commitTitle: (short: string, subject: string) => string
    readonly snapshotTitle: (short: string, subject: string) => string
    readonly rangeTitle: (from: string, to: string) => string
    /** Takes the file pane back to the `worktree` view, shown as "Changes". */
    readonly backToWorkTree: string
    /** The title itself is a picker: it switches between what is uncommitted
     *  and the whole directory on disk. */
    readonly viewPickTitle: string
    readonly changesHint: string
    readonly workingTreeHint: string
    /** Tooltip lines for the two keys that switch view and layout together. */
    readonly keyBrowse: string
    readonly keyChanges: string
    readonly ignoredFile: string
    /** The empty text of the `worktree` view — "No changes." */
    readonly emptyChanges: string
    /** The empty text while browsing the whole working directory. */
    readonly emptyWorktree: string
    readonly emptySnapshot: string
    readonly emptyDiff: string
    /** A line count written out, e.g. "142 lines". Tooltips, where there is
     *  room for the word and nothing else says what the number counts. */
    readonly lines: (n: number) => string
    /** The same count as a file row's suffix, where the column is narrow and
     *  the unit is the same on every row. English drops the word for that
     *  reason; a language whose unit is one character need not. */
    readonly lineCount: (n: number) => string
    /** Tooltip of the name beside it while browsing a tree: who committed the
     *  file last. */
    readonly lastAuthor: (name: string) => string
    /** Clicking a file's status marks moves it in or out of the index. */
    readonly toggleStage: (staged: boolean) => string
    /** Searching the repository from the file pane's header. */
    readonly search: string
    readonly searchTitle: string
    readonly searchPlaceholder: string
    readonly searchInRevision: (short: string) => string
    readonly searchInWorktree: string
    /** A query with path limits but no term: there is nothing to search for. */
    readonly searchNeedsTerm: string
    /** The × that puts the search box away. */
    readonly searchClear: string
    /** The arrow beside that button, which picks what it opens. */
    readonly findModeTitle: string
    /** Ctrl+F over the listed tree: show only the paths that match. */
    readonly filter: string
    readonly filterTitle: string
    readonly filterPlaceholder: string
    readonly filterCount: (shown: number, total: number) => string
    readonly filterNone: string
    readonly filterClear: string
  }
  readonly quickOpen: {
    /** The one field of the quick-open box, which is the whole dialog. */
    readonly placeholder: string
    readonly title: string
    /** While `ls-files` is still answering. */
    readonly loading: string
    readonly noMatch: string
    /** The footer: how many rows are shown out of the whole working tree. */
    readonly count: (shown: number, total: number) => string
  }
  readonly diff: {
    readonly titleFallback: string
    readonly errorTitle: string
    /** The empty text of the `worktree` view — "No changes."; the key keeps
     *  the internal name of the view. */
    readonly emptyWorktree: string
    readonly emptySnapshot: string
    readonly emptyDiff: string
    /** The empty text shown while browsing the working tree, no file picked. */
    readonly emptyBrowseWorktree: string
    /** The empty text shown when blame has no lines to attribute. */
    readonly emptyBlame: string
    /** The empty text shown when a file has no commit history. */
    readonly emptyHistory: string
    /** Appended to a file-history row's tooltip: what the clicks do there. */
    readonly historyRowHint: string
    /** The button that widens back to every file of a commit or a range. Kept
     *  to a word: it sits in a crowded header, and the four titles below say
     *  what it does. */
    readonly showWholeDiff: string
    readonly allShown: string
    readonly allCommitShown: string
    readonly widenWorktree: string
    readonly widenCommit: string
    readonly preview: string
    readonly viewImage: string
    readonly viewFile: string
    readonly previewTitle: string
    readonly viewImageTitle: string
    readonly viewFileTitle: string
    /** Hover title on a rendered link that points into the repository. */
    readonly openLinkHint: string
    readonly markdownSourceTitle: string
    readonly renderMarkdownTitle: string
    readonly htmlPreviewTitle: string
    readonly htmlSourceTitle: string
    /** The JSON re-indent button, and its two faces. A minified file is one
     *  unreadable line; the button only appears where the text parses. */
    readonly formatJson: string
    readonly formatJsonTitle: string
    readonly jsonSourceTitle: string
    readonly expandAll: string
    readonly collapseAll: string
    readonly expandAllTitle: string
    readonly collapseAllTitle: string
    readonly wrap: string
    readonly wrapLong: string
    readonly wrapCode: string
    readonly outline: string
    readonly showOutline: string
    readonly showSymbols: string
    /** One switch: pressed is inline, raised is side by side. Its tip names
     *  what a click would give, not the switch in the abstract. */
    readonly inline: string
    readonly showSideBySide: string
    readonly showInline: string
    readonly docTabDiff: string
    readonly docTabDiffTitle: string
    readonly docTabClose: string
    /** Small labels on the doc tabs for blame / file-history documents. */
    readonly docTabBlame: string
    readonly docTabHistory: string
    readonly docTabLines: string
    readonly docTabSearch: string
    /** The line-range history and the repository search, as documents. */
    readonly emptyLineHistory: string
    readonly emptySearch: string
    readonly searchHits: (n: number, files: number) => string
    /** The ceiling a search stops at, so a huge one cannot fill the pane. */
    readonly searchTruncated: (n: number) => string
    readonly dblClickFullScreen: string
    /** File heading tooltip in a collapsed multi-file diff. */
    readonly fileHeadingTooltip: (collapsed: boolean) => string
    /** "N more lines — scroll or click to load". */
    readonly loadMoreLines: (n: number) => string
    /** Staging from the diff: a whole hunk, or the lines under the selection. */
    readonly stageHunk: string
    readonly unstageHunk: string
    readonly stageHunkTitle: string
    readonly unstageHunkTitle: string
    readonly stageSelection: (n: number) => string
    readonly unstageSelection: (n: number) => string
    readonly stageSelectionTitle: string
    readonly unstageSelectionTitle: string
    /** The unstaged / staged switch over a work-tree file's diff. */
    readonly sideUnstaged: string
    readonly sideStaged: string
    readonly sideUnstagedTitle: string
    readonly sideStagedTitle: string
  }
  readonly log: {
    readonly commits: string
    /** The pseudo-commit for the work tree, shown as "Changes"; the key keeps
     *  the internal name. */
    readonly worktreeRow: string
    readonly worktreeRowTitle: string
    readonly worktreeClean: string
    readonly worktreeUncommitted: (n: number) => string
    readonly noCommitsYet: string
    /** Hover text on a date that is later than the row above it, which
     *  ancestry rather than the clock put there. */
    readonly dateOutOfOrder: string
    /** The header button that opens and closes the filter strip. */
    readonly filter: string
    readonly filterTitle: string
    /** Filter box above the commit list. */
    readonly filterPlaceholder: string
    /** Shown when a filter matches nothing. */
    readonly noMatches: string
    /** Title of the button that clears the filter. */
    readonly clearFilter: string
    /** What the filter box searches: the message, or the diffs themselves. */
    readonly filterModeText: string
    readonly filterModeContent: string
    readonly filterModeRegex: string
    readonly filterModeTitle: string
    /** A pickaxe search reads every diff in the history; it takes a while. */
    readonly searching: string
    /** The lane graph, and the switch that shows every branch at once. */
    readonly graph: string
    readonly graphTitle: string
    readonly allBranches: string
    readonly allBranchesTitle: string
    readonly browsingAnother: string
    readonly comparing2: string
    readonly openInBrowser: string
    readonly openRepoCommitsTitle: string
    /** The gource button, shown only where gource is installed. */
    readonly gource: string
    readonly gourceStarting: string
    readonly gourceTitle: string
    readonly clickToDismiss: string
    readonly now: string
    readonly placeholder: string
    /** Tooltip hint for navigation keys. */
    readonly keyMove: string
    readonly keyShow: string
    readonly keyCompare: string
    /** Esc returns to the uncommitted-changes row, shown as "changes". */
    readonly keyWorktree: string
    /** Tooltip for the button that folds the commit-message body away. */
    readonly messageToggle: (collapsed: boolean) => string
    /** The suffix "views" paired with "dbl-click" key in FilesPane tooltip. */
    readonly tooltipViews: string
    readonly tooltipMore: string
    /** Tooltip for the "⋯" button that holds the uncommon log actions. */
    readonly moreTitle: string
  }
  readonly pushPull: {
    readonly push: string
    readonly pull: string
    readonly pushing: string
    readonly pulling: string
    readonly pushCount: (n: number) => string
    readonly pullCount: (n: number) => string
    readonly publishTitle: (branch: string) => string
    readonly pushAhead: (ahead: number, branch: string, upstream: string) => string
    readonly nothingToPush: (branch: string, upstream: string) => string
    readonly pullNoUpstream: (branch: string) => string
    readonly pullBehind: (branch: string, upstream: string, behind: number) => string
    readonly pullFastForward: (branch: string, upstream: string) => string
  }
  readonly settings: {
    readonly title: string
    readonly close: string
    readonly appearance: string
    readonly view: string
    readonly theme: string
    readonly dark: string
    readonly light: string
    readonly fontSize: string
    readonly rowHeight: string
    readonly diffLayout: string
    readonly inline: string
    readonly sideBySide: string
    readonly wordWrap: string
    readonly wordHighlight: string
    /** Draw the lane graph beside the commit hashes. */
    readonly commitGraph: string
    readonly documentOutline: string
    /** Number each markdown block with the source line it starts on. */
    readonly markdownLineNumbers: string
    /** How the file tree orders names. */
    readonly fileSort: string
    readonly sortNatural: string
    readonly sortByte: string
    readonly language: string
    /** The zone every date and time in the interface is shown in. */
    readonly timeZone: string
    /** The entry standing for the machine's own zone, which it names. */
    readonly systemTimeZone: (zone: string) => string
    /** Whether a stamp is a clock time or a distance from now. */
    readonly timeFormat: string
    readonly absolute: string
    readonly relative: string
    /** The font the panes and the terminal are drawn in. */
    readonly monoFont: string
    /** Placeholder for a free-text setting left empty. */
    readonly systemDefault: string
    /** Lines of context git puts around each hunk. */
    readonly contextLines: string
    /** How much whitespace a diff is allowed to ignore. */
    readonly ignoreWhitespace: string
    readonly whitespaceNone: string
    readonly whitespaceChange: string
    readonly whitespaceAll: string
    /** Third group: what happens outside the panes. */
    readonly session: string
    /** The settings tab the plugins live in — see `ref/spec/plugins.md`. */
    readonly plugins: string
    readonly restoreTabs: string
    /** One Gitty process per user, or one per launch. */
    readonly instances: string
    readonly singleInstance: string
    readonly multipleInstances: string
    readonly shell: string
    readonly loginShell: string
    readonly restoreDefaults: string
    readonly done: string
  }
  readonly contextMenu: {
    // diff area
    readonly copySelection: string
    readonly copySelectionAccel: string
    readonly copyMarkdownSource: string
    readonly copyFileContents: string
    readonly copyWholeDiff: string
    readonly enableWordWrap: string
    readonly disableWordWrap: string
    readonly enableWordHighlight: string
    readonly disableWordHighlight: string
    readonly showOutline: string
    readonly hideOutline: string
    readonly showDiffInstead: string
    readonly inlineView: string
    readonly sideBySideView: string
    readonly previewMarkdown: string
    readonly viewFile: string
    // file heading inside a diff
    readonly openInNewTab: (name: string) => string
    readonly openInNewTabAccel: string
    readonly selectInFileList: string
    readonly copyRelativePath: string
    readonly copyAbsolutePath: string
    readonly copyFileName: string
    readonly openInSystemApp: string
    readonly revealInFileManager: string
    // a directory row in the file tree
    readonly copyFolderName: string
    /** The folder as a `file://` listing in the system browser. */
    readonly openFolderInBrowser: string
    readonly openFolderInFileManager: string
    /** Changes view only: sends the file to the system trash. */
    readonly deleteFile: string
    /** Changes view only: the index. */
    readonly stageFile: string
    readonly unstageFile: string
    readonly discardChanges: string
    readonly copyStagedDiff: string
    // file tree
    readonly viewFileAccel: string
    // commit log
    readonly showCommitDiff: string
    readonly showCommitDiffAccel: string
    readonly copyCommitHash: string
    readonly copyShortHash: string
    readonly copySubject: string
    readonly openInBrowser: string
    readonly copyCommitUrl: string
    readonly openRemoteUrl: string
    readonly browseSnapshot: string
    /** Snapshot only: type a command running this file into the terminal. */
    readonly runFile: string
    /**
     * On a submodule's row in the work tree: fetch its own remote and move it
     * to the tip it tracks. `pullingSubmodule` names it while that runs.
     */
    readonly pullSubmodule: string
    readonly pullingSubmodule: (path: string) => string
    readonly diffAgainstSelected: string
    readonly diffAgainstAccel: string
    // file tree — per-file questions, both open a document in the diff pane
    readonly blameFile: string
    readonly fileHistory: string
    /** On a blame row: what happened to the lines under the selection. */
    readonly lineHistory: string
    // the Changes row in the commit log
    readonly browseWorktree: string
    /** Pasting the clipboard's files into the tree; `pasteInto` names the
     *  directory a row's paste would write to. */
    readonly paste: string
    readonly pasteInto: (dir: string) => string
  }
  readonly paneChrome: {
    /** The four pane names used as labels throughout the UI. */
    readonly paneLabelFiles: string
    readonly paneLabelDiff: string
    readonly restoreLayout: (fullAccel: string) => string
    readonly fillWindow: (fullAccel: string) => string
    readonly hidePane: (accel: string) => string
    readonly hidePaneTerminal: (accel: string) => string
    /** The Panes menu entries. */
    readonly showPane: (label: string) => string
    readonly hidePaneMenu: (label: string) => string
    readonly showAllPanes: string
    /** The tooltip line descriptions for pane controls. */
    readonly hidesThisPane: string
    readonly fillsTheWindow: string
    readonly cyclesWhileFull: string
    readonly dblClickToggles: string
  }
  readonly terminal: {
    readonly title: string
    readonly starting: string
    readonly shellExited: (exitCode: number) => string
    readonly closeTerminal: string
    readonly splitRight: string
    readonly splitRightTitle: string
    readonly splitDown: string
    readonly splitDownTitle: string
    readonly shellsKeepRunning: string
    /** Hands the curated index to whatever agent the user picks. */
    readonly sendToAgent: string
    readonly sendToAgentTitle: (command: string) => string
    /** The dropdown of remembered commands beside that button. */
    readonly agentCommandsTitle: string
    /** Appended to a command in that dropdown, saying what a click does. */
    readonly agentCommandTooltip: string
    /** The × beside a command there, which takes it out of the list. */
    readonly agentForget: string
    /** Its last entry, and the one-line dialog that entry opens. */
    readonly agentNewCommand: string
    readonly agentPromptTitle: string
    readonly agentPromptRun: string
    readonly agentPromptCancel: string
    readonly agentCommandPlaceholder: string
    /** The picker's label when nothing is remembered to run. */
    readonly agentNone: string
    /** Why nothing happened: there is nowhere to run the command. */
    readonly agentNoTerminal: string
    readonly runExportFailed: string
    readonly runTooLarge: (mb: number) => string
  }
  readonly common: {
    readonly loading: string
    readonly binaryOrOversized: string
  }
  /** The find strip over a rendered document. */
  readonly find: {
    readonly placeholder: string
    /** "3 / 12" — which match, and how many there are. */
    readonly count: (i: number, n: number) => string
    readonly noMatches: string
    readonly next: string
    readonly previous: string
    readonly close: string
  }
  readonly time: {
    readonly today: string
    readonly yesterday: string
    /** Relative stamps, finer-grained than the branch menu's ladder. */
    readonly justNow: string
    readonly minutesAgo: (n: number) => string
    readonly hoursAgo: (n: number) => string
    readonly daysAgo: (n: number) => string
    readonly monthsAgo: (n: number) => string
    readonly yearsAgo: (n: number) => string
  }
  readonly image: {
    readonly loading: string
    readonly clickToFit: string
    readonly clickForActualSize: string
  }
}
