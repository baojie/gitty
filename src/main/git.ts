import fs from 'node:fs'
import os from 'node:os'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import type {
  BlameLine,
  Branch,
  Commit,
  CommitDetail,
  ChurnSpec,
  CommitFile,
  CommitMeta,
  FileChurn,
  FileHistoryEntry,
  FileMeasure,
  DiffOptions,
  DiffRequest,
  DiffResult,
  GitOpResult,
  GrepResult,
  ImageFileContent,
  LogFilterMode,
  PathKind,
  PdfFileContent,
  RemoteBases,
  RepoStatus,
  SnapshotEntry,
  SnapshotExport,
  SnapshotFileContent,
  WorktreeFile
} from '../shared/types'
import { DEFAULT_DIFF_OPTIONS, MAX_SNAPSHOT_EXPORT_BYTES } from '../shared/types'
import { isExpression, literalPattern } from '../shared/regex'
import { lfsObjectPath, parseLfsPointer } from './lfs'
import {
  parseBlame,
  parseBranches,
  parseLog,
  parseCommitNumstat,
  parseBatchCheck,
  readBatchObjects,
  type CommitNumstat,
  parseNameStatus,
  parseGrep,
  parseNumstat,
  parseStatus,
  RS,
  US
} from './parse'
import { buildPatch, parseFilePatch, type ApplyDirection, type HunkPick } from './patch'
import { urlBases } from './remote'
import { sshConfig } from './sshconfig'
import { readRemoteCache, writeRemoteCache } from './remoteCache'
import { grepExpr, grepPathspecs, parseQuery } from '../shared/query'
import { msg } from './messages'

const exec = promisify(execFile)

/** Diffs larger than this are not sent to the renderer; it would just lock up the pane. */
const MAX_PATCH_BYTES = 2 * 1024 * 1024

/** How many bytes to read when counting lines; skip files larger than this. */
const MAX_LINE_COUNT_BYTES = 8 * 1024 * 1024

/**
 * How much of a file's past to read when counting the lines of every revision
 * in its history. One pass over a source file's revisions is nothing; a large
 * file with a long history is not, so the read stops here and the rest of the
 * rows are derived rather than measured.
 */
const MAX_HISTORY_COUNT_BYTES = 64 * 1024 * 1024

/**
 * How far back to walk when naming the last author of every file in a tree.
 * A repository older than this leaves the rows it did not reach blank rather
 * than reading a decade of history for a column beside a file name.
 */
const MAX_AUTHOR_SCAN_COMMITS = 20000

/** Opens a commit's header in that walk; no path can begin with it. */
const AUTHOR_MARK = '\x01'

/** Untracked files inlined into the whole-work-tree diff before giving up. */
const MAX_UNTRACKED_IN_DIFF = 50

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await exec('git', args, {
    cwd,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
  })
  return stdout
}

/** Resolve the repository root for any path inside a work tree. */
export async function resolveRepo(cwd: string): Promise<string> {
  const out = await git(cwd, ['rev-parse', '--show-toplevel'])
  return out.trim()
}

export async function status(root: string): Promise<RepoStatus> {
  const raw = await git(root, [
    'status',
    '--porcelain=v2',
    '-z',
    '--branch',
    '--untracked-files=all'
  ])
  const p = parseStatus(raw)
  return {
    root,
    branch: p.branch,
    upstream: p.upstream,
    ahead: p.ahead,
    behind: p.behind,
    files: p.files.map((f) => ({ ...f, absPath: path.join(root, f.path) }))
  }
}

/**
 * Every local and remote-tracking branch, newest commit first. `origin/HEAD`
 * and friends are symbolic refs pointing at a branch that is already listed,
 * so they are dropped rather than shown twice.
 */
export async function branches(root: string): Promise<Branch[]> {
  const fmt =
    ['%(refname)', '%(refname:short)', '%(HEAD)', '%(committerdate:iso-strict)', '%(subject)'].join(
      US
    ) + RS
  let raw: string
  try {
    raw = await git(root, [
      'for-each-ref',
      `--format=${fmt}`,
      '--sort=-committerdate',
      'refs/heads',
      'refs/remotes'
    ])
  } catch {
    return []
  }
  return parseBranches(raw)
}

/**
 * Where this repository can be read on the web, as the prefixes a commit page
 * and a file page are built from — or null when there is no remote, or its
 * host is not one whose page layout we can infer (see `remote.ts`).
 *
 * The remote is whichever one the current branch tracks, else `origin`, else
 * the first one configured: the same order a reader would use when asking
 * "where does this repository live".
 *
 * The answer is remembered per repository (`remoteCache.ts`), so reopening a
 * repository does not re-derive it: a remembered entry is trusted after one
 * cheap check — the remote it names still resolves to the same URL — plus a
 * fingerprint that the ssh config has not changed. Remote moved or renamed,
 * config edited, or no entry: recompute and re-remember.
 */
export async function remoteBases(root: string): Promise<RemoteBases | null> {
  const cached = readRemoteCache(root)
  if (cached && (await remoteUnchanged(root, cached.name, cached.url)) && sshConfig().fp === cached.sshFp) {
    return cached.bases
  }
  return computeRemoteBases(root)
}

/** Whether the remote the entry was derived from still resolves to that URL. */
async function remoteUnchanged(root: string, name: string, url: string): Promise<boolean> {
  try {
    return (await git(root, ['remote', 'get-url', name])).trim() === url
  } catch {
    return false
  }
}

async function computeRemoteBases(root: string): Promise<RemoteBases | null> {
  let names: string[]
  try {
    names = (await git(root, ['remote'])).split('\n').map((n) => n.trim()).filter(Boolean)
  } catch {
    return null
  }
  if (names.length === 0) return null
  let tracked = ''
  try {
    const branch = (await git(root, ['symbolic-ref', '--short', 'HEAD'])).trim()
    tracked = (await git(root, ['config', '--get', `branch.${branch}.remote`])).trim()
  } catch {
    // Detached HEAD, or a branch with no upstream: fall through to origin.
  }
  const name = names.includes(tracked) ? tracked : names.includes('origin') ? 'origin' : names[0]
  try {
    const url = (await git(root, ['remote', 'get-url', name])).trim()
    const cfg = sshConfig()
    const bases = urlBases(url, cfg.hosts)
    writeRemoteCache(root, { name, url, bases, sshFp: cfg.fp })
    return bases
  } catch {
    return null
  }
}

/**
 * A `git log` that can be abandoned.
 *
 * Pickaxe searches walk the whole history and open every diff on the way, so
 * on a large repository they take seconds — long enough that the reader has
 * typed another character. Each root keeps at most one of these in flight and
 * the previous one is killed, rather than left to finish a query nobody is
 * waiting for. A killed search resolves empty; the call that killed it is the
 * one that will answer.
 */
const searches = new Map<string, ReturnType<typeof execFile>>()

/**
 * `kind` keeps the two kinds of search out of each other's way: a grep must not
 * cancel the log the pane is waiting for, and the log must not cancel a grep.
 */
function searchLog(root: string, args: string[], kind = 'log'): Promise<string> {
  const key = `${kind}:${root}`
  searches.get(key)?.kill()
  return new Promise((resolve) => {
    const child = execFile(
      'git',
      args,
      {
        cwd: root,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
      },
      (err, stdout) => {
        if (searches.get(key) === child) searches.delete(key)
        resolve(err ? '' : stdout)
      }
    )
    searches.set(key, child)
  })
}

/**
 * `ref` points the log at another branch; undefined means HEAD. `filter`, when
 * set, narrows it — by message and author, or through git's pickaxe over the
 * diffs themselves, depending on `mode`.
 *
 * Every filter is an expression, and an extended one: git's own default is
 * POSIX basic, where `a|b` and `x+` are literal text and the grouping has to
 * be backslashed. `--extended-regexp` is what everyone else calls a regular
 * expression, so what the box is typed with is what it searches for. Text that
 * is not an expression yet — `(fix`, on the way to `(fix|revert)` — is
 * searched for literally instead, the file tree's rule for its own filter: the
 * box is read on every keystroke, and half a query is not an error to show as
 * an empty log.
 *
 * Every part of the query is an argument in the array, never text spliced into
 * a command line: a regular expression is made almost entirely of characters a
 * shell would take for itself.
 */
export async function log(
  root: string,
  limit: number,
  skip = 0,
  ref?: string | null,
  filter?: string,
  mode: LogFilterMode = 'text',
  all = false
): Promise<Commit[]> {
  const fmt = ['%H', '%h', '%an', '%ae', '%aI', '%s', '%D', '%P'].join(US) + RS
  /**
   * Author date, because that is the date in the column. git orders a log by
   * the *commit* date, and the two part company whenever a commit is replayed
   * rather than made — a rebase, a cherry-pick, a squashed pull request, an
   * `am`'d patch. Merge such work from several people and the dates on screen
   * stop reading downwards, which is the one thing a log is for.
   *
   * `--author-date-order` also settles which lane advances next where several
   * are open, so the graph stays narrow. What it cannot do is put a child below
   * its parent: ancestry outranks the clock, and a commit authored before the
   * one it was written on top of still comes first.
   */
  const order = '--author-date-order'
  // Every branch at once, which is how two branches can be seen relating to
  // each other; it replaces a named ref rather than narrowing it.
  const scope = all ? [order, '--all'] : ref ? [order, ref] : [order]
  const expr = filter === undefined || isExpression(filter)
  let raw: string
  try {
    if (filter && mode !== 'text') {
      // The pickaxe pages like an ordinary log, so no union pass is needed —
      // only the patience to let it run, and the ability to give up on it.
      raw = await searchLog(root, [
        'log',
        `--max-count=${limit}`,
        `--skip=${skip}`,
        `--pretty=format:${fmt}`,
        // -S is literal text and needs nothing; -G is always an expression,
        // and git's -F does not reach it, so the escaping is ours.
        ...(mode === 'content'
          ? [`-S${filter}`]
          : ['--extended-regexp', `-G${expr ? filter : literalPattern(filter)}`]),
        ...scope,
        '--'
      ])
    } else if (filter) {
      // A filter is a union of two greps: one over the message, one over the
      // author. git ANDs --grep with --author, so a single command cannot
      // express the OR — hence a rev-list pass per side, merged by hash, then
      // one --no-walk pass (date-ordered) to shape and page the result.
      const base = scope
      // One switch for both passes: an expression, or fixed strings, which is
      // git's own way of saying the pattern means itself.
      const syntax = expr ? '--extended-regexp' : '--fixed-strings'
      const byMsg = await git(root, [
        'log',
        '--format=%H',
        '--regexp-ignore-case',
        syntax,
        `--grep=${filter}`,
        ...base,
        '--'
      ]).catch(() => '')
      const byAuthor = await git(root, [
        'log',
        '--format=%H',
        '--regexp-ignore-case',
        syntax,
        `--author=${filter}`,
        ...base,
        '--'
      ]).catch(() => '')
      const union = [
        ...new Set([
          ...byMsg.trim().split('\n').filter(Boolean),
          ...byAuthor.trim().split('\n').filter(Boolean)
        ])
      ]
      const paged = union.slice(skip, skip + limit)
      if (paged.length === 0) return []
      raw = await git(root, [
        'log',
        '--no-walk',
        order,
        `--pretty=format:${fmt}`,
        ...paged,
        '--'
      ])
    } else {
      raw = await git(root, [
        'log',
        `--max-count=${limit}`,
        `--skip=${skip}`,
        `--pretty=format:${fmt}`,
        ...scope,
        // Nothing after this is a path, so a branch cannot be read as one.
        '--'
      ])
    }
  } catch {
    return [] // fresh repo with no commits yet
  }
  return parseLog(raw)
}

/**
 * Which commit last touched each line of a file. A null `rev` blames the work
 * tree — lines not committed yet come back with an all-zero sha.
 */
export async function blame(
  root: string,
  rev: string | null,
  filePath: string
): Promise<BlameLine[]> {
  const args = ['blame', '--line-porcelain']
  // The `--` keeps the path from being read as a revision when it is empty
  // or shadows a ref name.
  if (rev) args.push(rev)
  args.push('--', filePath)
  const raw = await git(root, args)
  return parseBlame(raw)
}

/**
 * Every commit that touched this file, newest first, following renames, each
 * with the file's length at that point.
 */
export async function fileHistory(
  root: string,
  rev: string | null,
  filePath: string
): Promise<FileHistoryEntry[]> {
  const fmt = ['%H', '%h', '%an', '%ae', '%aI', '%s', '%D', '%P'].join(US) + RS
  // Ordered by the date the rows show, as the log pane is. The churn pass below
  // needs no such thing: it is read into a map from hash to numbers.
  const args = ['log', '--follow', '--author-date-order', `--pretty=format:${fmt}`]
  if (rev) args.push(rev)
  args.push('--', filePath)
  const [raw, churnRaw] = await Promise.all([
    git(root, args),
    git(root, [
      'log',
      '--follow',
      '--format=%H',
      '--numstat',
      '-z',
      ...(rev ? [rev] : []),
      '--',
      filePath
    ])
  ])
  return withLineCounts(root, filePath, parseLog(raw), parseCommitNumstat(churnRaw))
}

/**
 * How many bytes each revision of a file is, in one `cat-file --batch-check`
 * pass. Headers only: no revision's contents are read, so this answers for
 * every row of a history however long it is, including the ones the counting
 * budget below never reached and the binary ones it refuses to count.
 */
async function sizeAtRevs(
  root: string,
  pairs: Array<{ rev: string; filePath: string }>
): Promise<Array<number | null>> {
  if (pairs.length === 0) return []
  try {
    const { stdout } = await run(
      root,
      ['cat-file', '--batch-check'],
      pairs.map((p) => `${p.rev}:${p.filePath}\n`).join('')
    )
    return parseBatchCheck(stdout)
  } catch {
    return []
  }
}

/**
 * Count the lines of many revisions of a file in **one** git process, by asking
 * `cat-file --batch` for `<rev>:<path>` and reading the objects back in the
 * order they were asked for. A `git show` per revision is what this replaces:
 * a file with three hundred commits behind it would be three hundred processes.
 *
 * Each pair carries its own path, because a rename means older revisions of the
 * same file answer to an older name. A revision that is binary, oversized or
 * simply not there comes back null.
 */
async function countLinesAtRevs(
  root: string,
  pairs: Array<{ rev: string; filePath: string }>,
  budget = MAX_HISTORY_COUNT_BYTES
): Promise<Array<number | null>> {
  if (pairs.length === 0) return []
  return new Promise((resolve) => {
    const out: Array<number | null> = []
    let buf: Buffer = Buffer.alloc(0)
    let read = 0
    let done = false
    const child = spawn('git', ['cat-file', '--batch'], {
      cwd: root,
      windowsHide: true,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
    })
    // Whatever has been counted stands; the rows past it are the caller's to
    // derive. Killing the child is how the budget is enforced, since the stream
    // would otherwise go on arriving long after the answer stopped being read.
    const finish = (): void => {
      if (done) return
      done = true
      child.kill()
      resolve(out)
    }
    child.on('error', finish)
    child.on('close', finish)
    child.stdout.on('data', (chunk: Buffer) => {
      read += chunk.length
      buf = buf.length === 0 ? chunk : Buffer.concat([buf, chunk])
      const { objects, rest } = readBatchObjects(buf)
      buf = rest
      for (const o of objects) {
        const body = o.body
        out.push(
          body === null || body.length > MAX_LINE_COUNT_BYTES || body.includes(0x00)
            ? null
            : countNewlines(body)
        )
      }
      if (out.length >= pairs.length || read > budget) finish()
    })
    // stdin is closed at once: git answers a whole batch without being paced,
    // and nothing here reads its answers before it has asked everything.
    child.stdin.on('error', () => {
      /* a killed child's pipe; the objects already counted are the answer */
    })
    child.stdin.end(pairs.map((p) => `${p.rev}:${p.filePath}\n`).join(''))
  })
}

/**
 * How long the file was at each of its commits — measured, one revision at a
 * time, in a single `cat-file` pass.
 *
 * Deriving them instead is what this used to do: count the newest revision and
 * walk backwards through the churn, since what the file was before a commit is
 * what it was after it, less the lines that commit added, plus the ones it
 * deleted. That is exact only down a single lineage, and a file's history is
 * not one whenever two branches both touched it: the rows are a timeline, so
 * two lineages interleave, and every subtraction after the first crossing
 * belongs to the wrong branch. Nothing marks the crossing in the list.
 *
 * The walk survives as the fallback for what the budget did not reach, anchored
 * at the last measured row rather than only at the first. A revision whose
 * churn is not in lines ends it: nothing older than a binary revision can be
 * derived.
 *
 * Every row also carries its size in bytes, which is measured for all of them
 * however long the history is — `--batch-check` reads no contents — and is what
 * a row shows where there is no count to show.
 */
async function withLineCounts(
  root: string,
  filePath: string,
  commits: Commit[],
  numstat: Map<string, CommitNumstat>
): Promise<FileHistoryEntry[]> {
  if (commits.length === 0) return []
  // The path each revision answers to. A commit git listed without a numstat
  // record of its own — a merge — is read at whatever name its neighbours use.
  let name = filePath
  const pairs = commits.map((c) => {
    name = numstat.get(c.hash)?.path ?? name
    return { rev: c.hash, filePath: name }
  })
  const [measured, sizes] = await Promise.all([
    countLinesAtRevs(root, pairs),
    sizeAtRevs(root, pairs)
  ])
  let lines: number | null = null
  return commits.map((commit, i) => {
    if (i < measured.length) lines = measured[i]
    const entry = { commit, lines, bytes: sizes[i] ?? null }
    const c = numstat.get(commit.hash)
    // A merge git kept in the history has no numstat of its own; it changed
    // nothing about this file, so the count carries over untouched.
    if (lines !== null && c !== undefined) {
      lines = c.churn === null ? null : lines - c.churn.added + c.churn.deleted
      if (lines !== null && lines < 0) lines = null // the walk lost the thread
    }
    return entry
  })
}

/** Files touched by a commit, plus its message body. */
export async function commitDetail(root: string, hash: string): Promise<CommitDetail> {
  const [meta, body, files] = await Promise.all([
    one(root, hash),
    git(root, ['show', '-s', '--format=%b', hash]).then((s) => s.trimEnd()),
    nameStatus(root, ['show', '--name-status', '-z', '--format=', hash])
  ])
  return { commit: meta, body, files: files.map((f) => ({ ...f, absPath: path.join(root, f.path) })) }
}

/** A commit's author, date and full message, without touching its files. */
export async function commitMeta(root: string, hash: string): Promise<CommitMeta> {
  const fmt = ['%an', '%ae', '%aI', '%s', '%b'].join(US) + RS
  const raw = await git(root, ['show', '-s', `--format=${fmt}`, hash])
  const [author, email, date, subject, ...bodyParts] = raw.trimEnd().split(US)
  return { author, email, date, subject, body: bodyParts.join(US).trimEnd() }
}

async function one(root: string, hash: string): Promise<Commit> {
  const fmt = ['%H', '%h', '%an', '%ae', '%aI', '%s', '%D', '%P'].join(US)
  const rec = await git(root, ['show', '-s', `--format=${fmt}`, hash])
  const [h, short, author, email, date, subject, refs, parents] = rec.trimEnd().split(US)
  return {
    hash: h,
    short,
    author,
    email,
    date,
    subject,
    refs: refs ?? '',
    parents: (parents ?? '').split(' ').filter(Boolean)
  }
}

/**
 * How one range of lines got to be the way it is: `git log -L a,b:file`, whose
 * output is a commit header and that range's diff, repeated back through the
 * history. Returned raw — the renderer draws it — because git formats it as a
 * log and a patch together and re-deriving one from the other would only lose
 * the connection between them.
 *
 * `-L` cannot be combined with `--follow`, and does not need to be: it tracks
 * the range across renames by itself.
 */
export async function lineHistory(
  root: string,
  rev: string | null,
  filePath: string,
  start: number,
  end: number
): Promise<string> {
  const a = Math.max(1, Math.floor(start))
  const b = Math.max(a, Math.floor(end))
  const args = ['log', '--no-color', `-L${a},${b}:${filePath}`]
  if (rev) args.push(rev)
  try {
    return await git(root, args)
  } catch (e) {
    const err = e as { stderr?: string; message?: string }
    return err.stderr || err.message || ''
  }
}

/** Above this many hits the search stops and says so, like an oversized diff. */
const MAX_GREP_HITS = 2000

/**
 * Search the repository's contents. With no revision it searches the work tree
 * — what is on disk, uncommitted work included — and with one it searches that
 * revision, so a grep started while browsing a commit answers about the commit
 * rather than about today.
 *
 * What was typed is a query rather than a bare pattern (`query.ts`), so the
 * terms and the path limits come out separated here. Every term is one
 * argument, never spliced into a command line, and `-e` keeps a term that
 * begins with a dash from being read as an option.
 *
 * A query with nothing to look *for* — `in:*.py` on its own — searches
 * nothing: `git grep` needs a pattern, and "every line of every Python file"
 * is not what the box was asked for.
 */
export async function grep(
  root: string,
  pattern: string,
  rev: string | null
): Promise<GrepResult> {
  if (!pattern) return { hits: [], truncated: false }
  const query = parseQuery(pattern)
  if (query.include.length === 0) return { hits: [], truncated: false }
  const args = ['grep', '-n', '-z', '-I', '--no-color', ...grepExpr(query)]
  if (rev) args.push(rev)
  args.push('--', ...grepPathspecs(query))
  let raw: string
  try {
    raw = await searchLog(root, args, 'grep')
  } catch {
    // git grep exits 1 when nothing matched, which is not an error here.
    return { hits: [], truncated: false }
  }
  const all = parseGrep(raw, rev)
  return { hits: all.slice(0, MAX_GREP_HITS), truncated: all.length > MAX_GREP_HITS }
}

/** Files changed between two commits. */
export async function rangeFiles(
  root: string,
  from: string,
  to: string
): Promise<CommitFile[]> {
  const files = await nameStatus(root, ['diff', '--name-status', '-z', `${from}..${to}`])
  return files.map((f) => ({ ...f, absPath: path.join(root, f.path) }))
}

/**
 * Lines added and removed per file, for the same change the file list shows.
 * Keyed by path; a file missing from the map has no countable churn (binary,
 * or a merge commit, whose combined diff `--numstat` reports nothing for).
 */
export async function fileChurn(
  root: string,
  spec: ChurnSpec,
  opts: DiffOptions = DEFAULT_DIFF_OPTIONS
): Promise<Record<string, FileChurn>> {
  // Whitespace is ignored here too when the diff ignores it, or the file list
  // would count lines the diff beside it then refuses to show. Context lines
  // do not enter into a --numstat count.
  const ws = diffFlags(opts).filter((f) => f.startsWith('--ignore'))
  const args =
    spec.kind === 'commit'
      ? ['show', '--numstat', '-z', '--format=', ...ws, spec.hash]
      : spec.kind === 'range'
        ? ['diff', '--numstat', '-z', ...ws, `${spec.from}..${spec.to}`]
        : // Staged and unstaged together, which is what the Changes list shows.
          ['diff', '--numstat', '-z', ...ws, 'HEAD']
  try {
    return Object.fromEntries(parseNumstat(await git(root, args)))
  } catch {
    // An empty repository has no HEAD to diff against; churn is simply unknown.
    return {}
  }
}

/** Shared `--name-status -z` reader; rename entries carry two path fields. */
async function nameStatus(
  root: string,
  args: string[]
): Promise<Array<Omit<CommitFile, 'absPath'>>> {
  const raw = await git(root, args)
  return parseNameStatus(raw)
}

function clip(patch: string, title: string): DiffResult {
  if (Buffer.byteLength(patch) > MAX_PATCH_BYTES) {
    return {
      patch: patch.slice(0, MAX_PATCH_BYTES),
      title,
      notice: msg.git.diffTruncated
    }
  }
  return { patch, title }
}

/**
 * The renderer's diff preferences as git flags. The context count is clamped
 * here rather than trusted: it arrives over IPC, and a huge -U on a large
 * repository is a way to make git chew for minutes.
 */
function diffFlags(o: DiffOptions): string[] {
  const flags = [`-U${Math.min(100, Math.max(0, Math.round(o.context)))}`]
  if (o.ignoreWhitespace === 'change') flags.push('--ignore-space-change')
  else if (o.ignoreWhitespace === 'all') flags.push('--ignore-all-space')
  return flags
}

/**
 * The pathspec for one file. A rename needs both of its names: git applies the
 * pathspec before it pairs a deletion with an addition, so the new path alone
 * leaves the old half filtered out and the file reads as wholly added.
 */
function pathArgs(req: { path?: string; origPath?: string }): string[] {
  if (!req.path) return []
  return req.origPath && req.origPath !== req.path
    ? ['--', req.path, req.origPath]
    : ['--', req.path]
}

export async function diff(
  root: string,
  req: DiffRequest,
  opts: DiffOptions = DEFAULT_DIFF_OPTIONS
): Promise<DiffResult> {
  const common = ['--no-color', '--no-ext-diff', ...diffFlags(opts)]

  if (req.kind === 'working') {
    if (!req.path) {
      // Everything uncommitted at once. Against HEAD rather than the index, so
      // one diff covers both staged and unstaged work.
      const tracked = await git(root, ['diff', ...common, 'HEAD']).catch(() =>
        // A repository without commits yet has no HEAD to diff against.
        git(root, ['diff', ...common, '--cached'])
      )
      // Untracked files have no blob for git to diff, so each is compared
      // against the empty file — otherwise "every change" would silently omit
      // exactly the files the status column marks as new.
      const untracked = (await status(root)).files.filter((f) => f.untracked)
      const shown = untracked.slice(0, MAX_UNTRACKED_IN_DIFF)
      const parts = [tracked]
      for (const f of shown) {
        const one = await git(root, [
          'diff',
          ...common,
          '--no-index',
          '--',
          '/dev/null',
          f.path
        ]).catch((e: { stdout?: string }) => e.stdout ?? '')
        if (one) parts.push(one)
      }
      const result = clip(parts.filter(Boolean).join(''), msg.git.workingTree)
      const omitted = untracked.length - shown.length
      if (omitted > 0) {
        result.notice = [result.notice, msg.git.untrackedOmitted(omitted)]
          .filter(Boolean)
          .join(' ')
      }
      return result
    }
    if (req.untracked) {
      // Untracked files have no index entry; compare against the empty tree.
      const patch = await git(root, [
        'diff',
        ...common,
        '--no-index',
        '--',
        '/dev/null',
        req.path
      ]).catch((e: { stdout?: string }) => e.stdout ?? '')
      return clip(patch, `${req.path} (${msg.git.untrackedLabel})`)
    }
    const args = ['diff', ...common]
    if (req.side === 'index') args.push('--cached')
    args.push(...pathArgs(req))
    const patch = await git(root, args)
    return clip(
      patch,
      `${req.path} (${req.side === 'index' ? msg.git.stagedLabel : msg.git.unstagedLabel})`
    )
  }

  if (req.kind === 'commit') {
    const args = ['show', ...common, '--format=', req.hash, ...pathArgs(req)]
    const patch = await git(root, args)
    return clip(patch, req.path ? `${req.path} @ ${req.hash.slice(0, 8)}` : req.hash.slice(0, 8))
  }

  const args = ['diff', ...common, `${req.from}..${req.to}`, ...pathArgs(req)]
  const patch = await git(root, args)
  const label = `${req.from.slice(0, 8)} → ${req.to.slice(0, 8)}`
  return clip(patch, req.path ? `${req.path} @ ${label}` : label)
}

/** File contents at a revision, used by the diff pane for added/removed files. */
export async function showFile(root: string, rev: string, filePath: string): Promise<string> {
  return git(root, ['show', `${rev}:${filePath}`])
}

/**
 * Contents of a file in the work tree, for previewing what is on disk rather
 * than what is committed. Shares the snapshot result shape.
 */
export async function readWorkingFile(
  root: string,
  filePath: string
): Promise<SnapshotFileContent> {
  const abs = path.resolve(root, filePath)
  // Never read outside the repository, whatever the renderer asks for.
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error(msg.git.pathEscapesRepo)
  }
  const stat = await fs.promises.stat(abs)
  if (stat.size > MAX_PATCH_BYTES) return { content: '', binary: true }
  const content = await fs.promises.readFile(abs, 'utf8')
  return content.includes('\0') ? { content: '', binary: true } : { content, binary: false }
}

/**
 * Whether a path is a file or a directory, at the revision the asker is reading
 * — the work tree when `rev` is null, that commit's tree otherwise. A link in a
 * rendered document can name either; which it is decides how Gitty follows it.
 */
export async function pathKind(
  root: string,
  rev: string | null,
  filePath: string
): Promise<PathKind> {
  if (rev === null) {
    const abs = path.resolve(root, filePath)
    // Never read outside the repository, whatever the renderer asks for.
    if (abs !== root && !abs.startsWith(root + path.sep)) {
      throw new Error(msg.git.pathEscapesRepo)
    }
    try {
      const s = await fs.promises.stat(abs)
      return s.isDirectory() ? 'dir' : 'file'
    } catch {
      return 'missing'
    }
  }
  // `-d` matches a directory itself (or a submodule) without listing its
  // children; a plain `ls-tree -- <path>` then distinguishes a file from a miss.
  try {
    const dirs = await git(root, ['ls-tree', '-d', '-z', rev, '--', filePath])
    if (dirs.length > 0) return 'dir'
  } catch {
    return 'missing'
  }
  try {
    const files = await git(root, ['ls-tree', '-z', rev, '--', filePath])
    return files.length > 0 ? 'file' : 'missing'
  } catch {
    return 'missing'
  }
}

/**
 * Images travel to the renderer as base64 inside a data: URL, which costs a
 * third more than the file — hence a limit of its own, larger than the diff
 * one (photographs in a repository are routinely past 2 MB) but still bounded.
 */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024

/** The same ceiling for a PDF, which is a document rather than an icon: the
 *  bytes cross one IPC message, and a scan of a book is not worth blocking the
 *  renderer's thread for. */
const MAX_PDF_BYTES = 64 * 1024 * 1024

/** Extensions a `<img>` can render. Anything else stays a binary file. */
const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  // SVG is text, but showing its markup is not what "preview" means for it.
  '.svg': 'image/svg+xml'
}

export function imageMime(filePath: string): string | null {
  return IMAGE_MIME[path.extname(filePath).toLowerCase()] ?? null
}

/** `git show` returning raw bytes — a file's contents are not always text. */
async function gitBytes(cwd: string, args: string[]): Promise<Buffer> {
  const { stdout } = await exec('git', args, {
    cwd,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    encoding: 'buffer',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
  })
  return stdout as unknown as Buffer
}

/**
 * The bytes a file really has, following a Git LFS pointer to the media file
 * it stands for. An LFS-tracked file is three lines of metadata both in a
 * revision and — where git-lfs is not installed, or the objects were never
 * fetched — on disk, so every viewer has to follow it or show nonsense.
 *
 * `{ buf }` is the content to show, whether or not a pointer was involved;
 * `{ missing }` is a pointer whose object is not in the local store, which is
 * the one case with something to say rather than something to draw. The store
 * is read directly, which is what `git lfs smudge` would do and works whether
 * or not git-lfs is installed.
 */
async function throughLfs(
  root: string,
  buf: Buffer
): Promise<{ buf: Buffer; missing?: undefined } | { buf?: undefined; missing: number }> {
  const ptr = parseLfsPointer(buf)
  if (!ptr) return { buf }
  try {
    const dir = (await git(root, ['rev-parse', '--absolute-git-dir'])).trim()
    return { buf: await fs.promises.readFile(lfsObjectPath(dir, ptr.oid)) }
  } catch {
    // Not fetched, or no store at all. Either way the file is not here, and
    // the pointer knows how big the thing it names is.
    return { missing: ptr.size }
  }
}

/**
 * One image's bytes as a data: URL — from the work tree when `rev` is null,
 * from that revision otherwise.
 */
export async function readImageFile(
  root: string,
  rev: string | null,
  filePath: string
): Promise<ImageFileContent> {
  const mime = imageMime(filePath)
  if (!mime) return { dataUrl: null, notice: msg.git.notAnImage, bytes: 0 }

  let buf: Buffer
  if (rev === null) {
    const abs = path.resolve(root, filePath)
    // Never read outside the repository, whatever the renderer asks for.
    if (abs !== root && !abs.startsWith(root + path.sep)) {
      throw new Error(msg.git.pathEscapesRepo)
    }
    const stat = await fs.promises.stat(abs)
    if (stat.size > MAX_IMAGE_BYTES) {
      return { dataUrl: null, notice: msg.git.imageTooLarge, bytes: stat.size }
    }
    buf = await fs.promises.readFile(abs)
  } else {
    buf = await gitBytes(root, ['show', `${rev}:${filePath}`])
    if (buf.length > MAX_IMAGE_BYTES) {
      return { dataUrl: null, notice: msg.git.imageTooLarge, bytes: buf.length }
    }
  }

  const real = await throughLfs(root, buf)
  if (real.missing !== undefined) {
    return { dataUrl: null, notice: msg.git.lfsNotFetched, bytes: real.missing }
  }
  buf = real.buf
  if (buf.length > MAX_IMAGE_BYTES) {
    return { dataUrl: null, notice: msg.git.imageTooLarge, bytes: buf.length }
  }

  return {
    dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
    notice: null,
    bytes: buf.length
  }
}

/**
 * One PDF's bytes — from the work tree when `rev` is null, from the object
 * store otherwise, exactly like an image. The renderer has no disk access and
 * a revision's copy was never on disk, so the file travels whole; Chromium's
 * own viewer is what renders it at the other end.
 */
export async function readPdfFile(
  root: string,
  rev: string | null,
  filePath: string
): Promise<PdfFileContent> {
  let buf: Buffer
  if (rev === null) {
    const abs = path.resolve(root, filePath)
    // Never read outside the repository, whatever the renderer asks for.
    if (abs !== root && !abs.startsWith(root + path.sep)) {
      throw new Error(msg.git.pathEscapesRepo)
    }
    const stat = await fs.promises.stat(abs)
    if (stat.size > MAX_PDF_BYTES) {
      return { data: null, notice: msg.git.pdfTooLarge, bytes: stat.size }
    }
    buf = await fs.promises.readFile(abs)
  } else {
    buf = await gitBytes(root, ['show', `${rev}:${filePath}`])
    if (buf.length > MAX_PDF_BYTES) {
      return { data: null, notice: msg.git.pdfTooLarge, bytes: buf.length }
    }
  }
  const real = await throughLfs(root, buf)
  if (real.missing !== undefined) {
    return { data: null, notice: msg.git.lfsNotFetched, bytes: real.missing }
  }
  buf = real.buf
  if (buf.length > MAX_PDF_BYTES) {
    return { data: null, notice: msg.git.pdfTooLarge, bytes: buf.length }
  }
  return { data: new Uint8Array(buf), notice: null, bytes: buf.length }
}

/**
 * Full file list of a commit — the tree as it was at that moment, each entry
 * carrying git's mode for it. `-z` prints `<mode> <type> <sha>\t<path>` per
 * record, which is the long form of `--name-only`: the mode is why it is read
 * here rather than the shorter one. `100755` is the executable bit, `120000` a
 * symlink — a link is not a program of its own, so only the first counts.
 */
export async function snapshotFiles(root: string, hash: string): Promise<SnapshotEntry[]> {
  const raw = await git(root, ['ls-tree', '-r', '-z', hash])
  return raw
    .split('\0')
    .filter((r) => r.length > 0)
    .map((record) => {
      const tab = record.indexOf('\t')
      return { path: record.slice(tab + 1), exec: record.startsWith('100755 ') }
    })
}

/**
 * Every file in the work tree as it is on disk right now, for "browse working
 * tree" — tracked, untracked, and the ignored ones too, which are as much part
 * of the directory in front of you as the rest and are marked rather than
 * withheld. A file deleted on disk is gone, so it is not listed; `ls-files -c`
 * still names files the index has but the disk has lost, which is what the
 * access check drops. `.git` itself is never listed: git does not report its
 * own store as content.
 */
export async function worktreeFiles(root: string): Promise<WorktreeFile[]> {
  const [raw, rawIgnored] = await Promise.all([
    git(root, ['ls-files', '-c', '-o', '--exclude-standard', '-z']),
    // Files only, not `--directory`: the tree lists paths, and a bare
    // `node_modules/` row would be a folder that never opens.
    git(root, ['ls-files', '-o', '-i', '--exclude-standard', '-z'])
  ])
  // A path in conflict has three index entries — one per merge stage — and
  // `-c` prints one line each, so a Set is what makes it one file again. The
  // tree keys its rows by path; three rows would share a key.
  const ignored = new Set(rawIgnored.split('\0').filter((p) => p.length > 0))
  const paths = [...new Set(raw.split('\0').filter((p) => p.length > 0)), ...ignored]
  // `stat` rather than `access`: the same one call answers both "is it still
  // there" and "is it a program", and the tree wants the second to offer to
  // run it. A directory's own executable bit means something else entirely,
  // so only regular files are ever marked.
  const existing = await Promise.all(
    paths.map((p) =>
      fs.promises
        .stat(path.join(root, p))
        .then<WorktreeFile | null>((st) => ({
          path: p,
          ignored: ignored.has(p),
          exec: st.isFile() && (st.mode & 0o111) !== 0
        }))
        .catch(() => null)
    )
  )
  return existing
    .filter((f): f is WorktreeFile => f !== null)
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/** Contents of one file at a revision; binary files report rather than dump. */
export async function snapshotFile(
  root: string,
  hash: string,
  filePath: string
): Promise<SnapshotFileContent> {
  const content = await git(root, ['show', `${hash}:${filePath}`])
  if (content.includes('\0')) return { content: '', binary: true }
  if (Buffer.byteLength(content) > MAX_PATCH_BYTES) {
    return { content: '', binary: true }
  }
  return { content, binary: false }
}

/**
 * Write one file's contents at a revision to a temp file so the system default
 * application can open it. The temp name is derived from hash + path, so
 * opening the same snapshot file twice reuses (overwrites) the same file.
 */
export async function snapshotWriteTemp(
  root: string,
  hash: string,
  filePath: string
): Promise<string> {
  const content = await git(root, ['show', `${hash}:${filePath}`])
  const name = `gitty-${hash.slice(0, 8)}-${filePath.replace(/[\\/]/g, '_').slice(0, 80)}`
  const tmp = path.join(os.tmpdir(), name)
  await fs.promises.writeFile(tmp, content)
  return tmp
}

/**
 * Check a whole commit out into a temp directory, so a program that was
 * committed at that revision can be run as it was then.
 *
 * The whole tree rather than the one file: a script reads its neighbours —
 * sources a library beside it, opens a config, calls another script in the
 * same directory — and giving it only itself would run the old program against
 * today's everything else, which is the one thing this is meant not to do.
 *
 * A linked work tree (`git worktree add --detach`) rather than an unpacked
 * `git archive`, because a program in a repository usually asks the repository
 * questions: `git rev-parse`, `git describe`, the branch it is on. An archive
 * is only files, and anything that shells out to git inside one fails at the
 * first line. A linked work tree is a real one — detached at that commit, with
 * an index and a HEAD of its own, so nothing done inside it can reach the
 * checkout the user is working in.
 *
 * The price is that this writes to the repository: a registration under
 * `.git/worktrees`. `worktree prune` runs first, which is what clears the
 * registrations whose directories the system has since cleaned out of `/tmp`;
 * without it, adding the same snapshot again after a reboot would fail on a
 * name that is taken but no longer there.
 *
 * Keyed by hash and therefore reusable: a commit's tree cannot change, so the
 * second run of anything in it is immediate. A tree over
 * `MAX_SNAPSHOT_EXPORT_BYTES` is refused before anything is written, and a
 * checkout that failed answers with no directory at all — the caller says so
 * rather than running something out of half a tree.
 */
export async function snapshotExport(root: string, hash: string): Promise<SnapshotExport> {
  const dir = path.join(os.tmpdir(), `gitty-snapshot-${hash.slice(0, 12)}`)
  // `.git` here is the file pointing back at the repository, which is what
  // makes this a work tree rather than a directory of files; its presence is
  // the whole of "already checked out and still sound".
  try {
    await fs.promises.access(path.join(dir, '.git'))
    return { dir, tooLarge: false }
  } catch {
    // Never made, or made and since damaged: below, both are made again.
  }
  // Asked before anything is written, and of git rather than of the disk: the
  // tree is not on disk yet, and this is the moment to decide it never will be.
  if ((await treeBytes(root, hash)) > MAX_SNAPSHOT_EXPORT_BYTES) {
    return { dir: null, tooLarge: true }
  }
  try {
    await git(root, ['worktree', 'prune'])
    // A directory left from a failed attempt would make `add` refuse.
    await fs.promises.rm(dir, { recursive: true, force: true })
    await git(root, ['worktree', 'add', '--detach', '--force', dir, hash])
    return { dir, tooLarge: false }
  } catch {
    await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {})
    await git(root, ['worktree', 'prune']).catch(() => {})
    return { dir: null, tooLarge: false }
  }
}

/**
 * What a commit's tree weighs, from `ls-tree -l`: the blob sizes as git has
 * them, without reading a byte of the objects themselves. A submodule prints
 * `-` for its size — it is a commit, not content, and a checkout brings none
 * of it in — so anything that is not a number counts as nothing.
 */
async function treeBytes(root: string, hash: string): Promise<number> {
  const raw = await git(root, ['ls-tree', '-r', '-l', '-z', hash])
  let total = 0
  for (const record of raw.split('\0')) {
    if (!record) continue
    // `<mode> <type> <sha> <size>\t<path>`, the size right-aligned in a field
    // wide enough for the largest of them, hence the split on whitespace.
    const size = Number(record.slice(0, record.indexOf('\t')).split(/\s+/)[3])
    if (Number.isFinite(size)) total += size
  }
  return total
}

/**
 * Run a git command that talks to a remote.
 *
 * There is no terminal behind these: a credential or passphrase prompt would
 * block forever with nowhere to appear, so prompting is turned off and the
 * command is given a deadline. Anything that genuinely needs to be answered
 * belongs in the terminal pane, which is why failures come back as text rather
 * than as a thrown error — the pane shows git's own words.
 */
async function remoteOp(root: string, args: string[]): Promise<GitOpResult> {
  const env = {
    ...process.env,
    GIT_OPTIONAL_LOCKS: '0',
    LC_ALL: 'C',
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: '',
    SSH_ASKPASS: '',
    // An agent still answers; only the interactive prompt is refused.
    GIT_SSH_COMMAND: 'ssh -o BatchMode=yes'
  }
  try {
    const { stdout, stderr } = await exec('git', args, {
      cwd: root,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
      timeout: 120_000,
      env
    })
    return { ok: true, output: `${stdout}\n${stderr}`.trim() || msg.git.done }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    const said = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.trim()
    return { ok: false, output: said || err.message || msg.git.gitFailed }
  }
}

/** Push the checked-out branch. `branch` is set only when it has no upstream. */
export function push(root: string, branch?: string): Promise<GitOpResult> {
  return remoteOp(root, branch ? ['push', '--set-upstream', 'origin', branch] : ['push'])
}

/**
 * Pull. Fast-forward only by default: a merge that cannot be resolved without
 * a decision (or an editor) is not something a button should start. `rebase`
 * is the one alternative worth offering when that fails — it replays the local
 * commits and, unlike a merge, never opens an editor of its own.
 */
export function pull(root: string, rebase = false): Promise<GitOpResult> {
  return remoteOp(root, ['pull', rebase ? '--rebase' : '--ff-only'])
}

/**
 * Did a fast-forward-only pull fail because the branches have diverged, as
 * opposed to the network or the credentials failing? Matched on git's own
 * words, which `remoteOp` keeps in English by running under `LC_ALL=C`.
 */
export function pullNeedsRebase(output: string): boolean {
  return /not possible to fast-forward|diverging branches|need to specify how to reconcile/i.test(
    output
  )
}

/**
 * The commits this repository has that no remote does — what "not pushed yet"
 * means, and the answer to whether the hosting site would know a hash.
 *
 * `rev-list --all --not --remotes` is one call and the set is normally tiny:
 * it is the work between the last push and now, not the history. A repository
 * whose remote has never been fetched has no remote-tracking refs, and then
 * every commit would be listed — which says nothing, so it answers with the
 * empty set rather than declaring the whole history unpushed.
 */
export async function unpushedCommits(root: string): Promise<string[]> {
  try {
    const refs = await git(root, ['for-each-ref', '--count=1', '--format=%(refname)', 'refs/remotes/'])
    if (refs.trim() === '') return []
    const raw = await git(root, ['rev-list', '--all', '--not', '--remotes'])
    return raw.split('\n').filter((h) => h.length > 0)
  } catch {
    // A repository with no commits yet has nothing to list either way.
    return []
  }
}

/**
 * Which paths in the work tree are submodules, read from `.gitmodules` — the
 * file git itself treats as the list of them. One `git config` call, no walk
 * of the tree: `ls-files --stage` would name every file in the repository to
 * find the handful with mode 160000. A repository with no `.gitmodules` makes
 * git exit non-zero, which is the empty list rather than an error.
 */
export async function submodules(root: string): Promise<string[]> {
  let raw: string
  try {
    raw = await git(root, ['config', '-f', '.gitmodules', '-z', '--get-regexp', '\\.path$'])
  } catch {
    return []
  }
  // `-z` prints `<key>\n<value>\0` per entry: the newline is inside the
  // record, which is what lets a value hold one.
  return raw
    .split('\0')
    .filter((r) => r.length > 0)
    .map((r) => r.slice(r.indexOf('\n') + 1))
    .filter((p) => p.length > 0)
}

/**
 * Pull one submodule: fetch its own remote and move it to the tip of the
 * branch it tracks. `--remote` is what makes this a pull rather than a
 * checkout of the commit the superproject records — the superproject is left
 * pointing at the old commit, so the submodule shows up in Changes afterwards
 * and committing that pointer stays the user's decision. `--init` because a
 * submodule that was never checked out is the other half of "get me this".
 * It talks to a remote, so it runs under `remoteOp`'s no-prompt deadline.
 */
export function submodulePull(root: string, subPath: string): Promise<GitOpResult> {
  return remoteOp(root, ['submodule', 'update', '--init', '--remote', '--', subPath])
}

/* ---------- staging ---------- */

/**
 * Run a git command that changes the repository and report what it said.
 *
 * Same shape as `remoteOp` and for the same reason: the pane shows git's own
 * words rather than a sentence of ours. Nothing here talks to a remote, so
 * there is no prompt to refuse and no deadline to keep.
 */
async function localOp(root: string, args: string[], input?: string): Promise<GitOpResult> {
  try {
    const { stdout, stderr } = await run(root, args, input)
    return { ok: true, output: `${stdout}\n${stderr}`.trim() || msg.git.done }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    const said = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.trim()
    return { ok: false, output: said || err.message || msg.git.gitFailed }
  }
}

/**
 * `execFile`, plus the ability to feed the command something on stdin —
 * `git apply` reads its patch from there, and a patch written to a temp file
 * would be one more thing to clean up after a crash.
 */
function run(
  root: string,
  args: string[],
  input?: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'git',
      args,
      {
        cwd: root,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
      },
      (err, stdout, stderr) => {
        if (err) reject(Object.assign(err, { stdout, stderr }))
        else resolve({ stdout, stderr })
      }
    )
    if (input !== undefined) {
      child.stdin?.end(input)
    }
  })
}

/** Put a whole file into the index — new, modified or deleted alike. */
export function stageFile(root: string, filePath: string): Promise<GitOpResult> {
  return localOp(root, ['add', '--', filePath])
}

/**
 * Take a whole file back out of the index, leaving the work tree alone.
 * `restore --staged` needs a HEAD to restore from; in a repository whose first
 * commit has not happened yet there is none, and removing the index entry is
 * what "unstage" means there.
 */
export async function unstageFile(root: string, filePath: string): Promise<GitOpResult> {
  const restored = await localOp(root, ['restore', '--staged', '--', filePath])
  if (restored.ok) return restored
  return localOp(root, ['rm', '--cached', '--quiet', '--', filePath])
}

/** Throw away a tracked file's uncommitted changes. There is no undo. */
export function discardFile(root: string, filePath: string): Promise<GitOpResult> {
  return localOp(root, ['restore', '--', filePath])
}

/** The whole index as a patch, for handing to something outside Gitty. */
export async function stagedDiff(root: string): Promise<string> {
  try {
    return await git(root, ['diff', '--cached', '--no-color', '--no-ext-diff'])
  } catch {
    return ''
  }
}

/**
 * Stage or unstage part of a file.
 *
 * The patch is fetched here rather than taken from the renderer, and it is the
 * right one for the direction: staging works from `git diff` — the work tree
 * against the index — because the diff the pane shows for a whole work tree is
 * against HEAD, which merges staged and unstaged work and would stage things
 * twice. Unstaging works from `git diff --cached` and is applied in reverse.
 *
 * The context count, and the pathspec, have to match the ones the pane drew with, or the hunk the user
 * clicked is not the hunk that gets staged. At zero context git needs
 * `--unidiff-zero` to apply the result — and only there: given unconditionally
 * it also turns off the check that keeps an ambiguous hunk from landing in the
 * wrong place.
 */
export async function applyHunks(
  root: string,
  filePath: string,
  picks: HunkPick[],
  direction: ApplyDirection,
  opts: DiffOptions = DEFAULT_DIFF_OPTIONS,
  origPath?: string
): Promise<GitOpResult> {
  const context = Math.min(100, Math.max(0, Math.round(opts.context)))
  const args = ['diff', '--no-color', '--no-ext-diff', `-U${context}`]
  if (direction === 'unstage') args.push('--cached')
  // The same pathspec the pane's diff used, renamed half included: a rename
  // asked for by one name reads as a whole new file, and its one giant hunk is
  // not the hunk the user clicked.
  args.push(...pathArgs({ path: filePath, origPath }))

  const patch = buildPatch(parseFilePatch(await git(root, args)), picks, direction)
  if (!patch) return { ok: false, output: msg.git.nothingToApply }

  const apply = ['apply', '--cached', '--whitespace=nowarn']
  if (direction === 'unstage') apply.push('-R')
  if (context === 0) apply.push('--unidiff-zero')
  apply.push('-')
  return localOp(root, apply, patch)
}

/**
 * Who last touched each of `paths`, as of `rev`. One `git log` walk over the
 * whole tree, stopped the moment every path has an answer — a `log -1` per
 * file would be one process per row, and a browsed tree is thousands of rows.
 *
 * `-z` for the reason every other reader here uses it: a path with a space or
 * a non-ASCII byte survives it, and git would otherwise quote it. Between a
 * commit's header and its file list git writes a newline, so a token is
 * trimmed of one before being read; a token opening with `AUTHOR_MARK` is the
 * next commit's author rather than a path. Merges name no files by default,
 * which is what "who touched it" means anyway.
 *
 * A path with no answer is simply absent: it is younger than the walk reached,
 * or it was never committed at all. Ignored and untracked files are both.
 */
async function lastAuthors(
  root: string,
  rev: string | null,
  paths: string[]
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (paths.length === 0) return out
  const wanted = new Set(paths)
  return new Promise((resolve) => {
    let tail = ''
    let author = ''
    let commits = 0
    let done = false
    const child = spawn(
      'git',
      ['log', '-z', '--name-only', `--format=${AUTHOR_MARK}%an`, rev ?? 'HEAD'],
      {
        cwd: root,
        windowsHide: true,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
      }
    )
    // Whatever the walk answered stands. Killing the child is how the budget is
    // enforced: a deep history goes on arriving long after the last row was
    // named, and an empty repository has no HEAD to walk at all.
    const finish = (): void => {
      if (done) return
      done = true
      child.kill()
      resolve(out)
    }
    child.on('error', finish)
    child.on('close', finish)
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      const parts = (tail + chunk).split('\0')
      tail = parts.pop() ?? ''
      for (const raw of parts) {
        const token = raw.startsWith('\n') ? raw.slice(1) : raw
        if (token.startsWith(AUTHOR_MARK)) {
          author = token.slice(AUTHOR_MARK.length)
          commits++
          continue
        }
        if (wanted.delete(token)) out[token] = author
      }
      if (wanted.size === 0 || commits > MAX_AUTHOR_SCAN_COMMITS) finish()
    })
  })
}

/**
 * The last author of each path, batched. Exported as its own call rather than
 * folded into `countFileLines`: the count is what every view wants and this is
 * what one of them does, and the walk is the expensive half.
 */
export async function fileAuthors(
  root: string,
  rev: string | null,
  paths: string[]
): Promise<Record<string, string>> {
  try {
    return await lastAuthors(root, rev, paths)
  } catch {
    return {}
  }
}

/**
 * A PDF is a document format that happens to be mostly text, so a small one
 * has no NUL byte to give it away and would otherwise be counted in lines —
 * a number that means nothing about a file measured in pages. The row shows
 * its size instead, the way it does for anything else it cannot count.
 */
function isPdf(filePath: string): boolean {
  return /\.pdf$/i.test(filePath)
}

/** Count the number of newlines in a buffer. The last line is counted even when
 *  it doesn't end with a newline — a non-empty file always has >=1 line. */
function countNewlines(buf: Buffer): number {
  let n = 0
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0a) n++
  }
  // A non-empty file whose last byte is not a newline has one trailing line.
  if (buf.length > 0 && buf[buf.length - 1] !== 0x0a) n++
  return n
}

/**
 * Measure working-tree and committed files in one batch. Each pair names a
 * revision (null for the work tree) and a repo-relative path; the measurements
 * come back in the same order.
 *
 * The size is kept even where the count is refused — a binary or oversized
 * file has no line count but is still a file of some size, which is what the
 * row shows instead — and both are null only where the file could not be read.
 */
export async function countFileLines(
  root: string,
  pairs: Array<{ rev: string | null; filePath: string }>
): Promise<FileMeasure[]> {
  const unreadable: FileMeasure = { lines: null, bytes: null }
  return Promise.all(
    pairs.map(async ({ rev, filePath }) => {
      try {
        if (rev === null) {
          const abs = path.resolve(root, filePath)
          if (abs !== root && !abs.startsWith(root + path.sep)) return unreadable
          const stat = await fs.promises.stat(abs)
          if (stat.size > MAX_LINE_COUNT_BYTES) return { lines: null, bytes: stat.size }
          const buf = await fs.promises.readFile(abs)
          const bytes = buf.length
          if (buf.includes(0x00)) return { lines: null, bytes } // binary
          if (isPdf(filePath)) return { lines: null, bytes }
          return { lines: countNewlines(buf), bytes }
        }
        // Committed file via git show, read as a buffer to stay binary-safe.
        const { stdout } = await exec('git', ['show', `${rev}:${filePath}`], {
          cwd: root,
          maxBuffer: MAX_LINE_COUNT_BYTES + 1024 * 1024,
          windowsHide: true,
          encoding: 'buffer',
          env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
        })
        const buf = stdout as unknown as Buffer
        const bytes = buf.length
        if (bytes > MAX_LINE_COUNT_BYTES) return { lines: null, bytes }
        if (buf.includes(0x00)) return { lines: null, bytes } // binary
        if (isPdf(filePath)) return { lines: null, bytes }
        return { lines: countNewlines(buf), bytes }
      } catch {
        return unreadable
      }
    })
  )
}
