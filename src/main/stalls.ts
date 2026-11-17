import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { app, ipcMain, type BrowserWindow } from 'electron'
import type { RendererStall } from '../shared/types'
import { summarizeArgs } from './stallFormat'

/**
 * The stall log: every time a process of Gitty's stops answering for longer
 * than a threshold, one JSON line saying how long and what was going on.
 *
 * A freeze is invisible after the fact — the desktop's "not responding"
 * dialog names no culprit — and the cause is rarely where one would guess. What
 * found the last ones was knowing which IPC calls were running while the main
 * process stood still, so that is what each record carries: the calls in
 * flight across the stall and the ones that had just finished, with a short
 * summary of their arguments. The log is for reading later, by a person or an
 * agent, to decide what to make asynchronous, batched or capped next.
 */

/** Stalls shorter than this are not worth a line; `GITTY_STALL_MS` overrides. */
const THRESHOLD_MS =
  Number(process.env.GITTY_STALL_MS) > 0 ? Number(process.env.GITTY_STALL_MS) : 500

/** How often the main loop checks on itself; a stall is a tick that came late. */
const TICK_MS = 100

/** How far before a stall a finished call still counts as context. */
const CONTEXT_MS = 3000

/** A day's file stops growing here; a storm of stalls is one finding, not many. */
const MAX_FILE_BYTES = 5 * 1024 * 1024

interface Call {
  channel: string
  args: string
  start: number
  end?: number
}

const inFlight = new Set<Call>()
let finished: Call[] = []

/**
 * Where the log goes: `logs/stalls/` in the checkout when run from source —
 * `logs/*` is gitignored there — and Electron's logs directory once packaged,
 * where there is no checkout to write into.
 */
export function stallDir(): string {
  return app.isPackaged
    ? path.join(app.getPath('logs'), 'stalls')
    : path.join(checkoutRoot(), 'logs', 'stalls')
}

/**
 * The checkout an unpackaged run comes from. Not `app.getAppPath()` itself:
 * run.sh starts `electron out/main/index.js`, which makes the app path
 * `out/main` — a directory every build wipes, so the log would vanish with it.
 * The nearest directory up from there holding a package.json is the checkout.
 */
function checkoutRoot(): string {
  let dir = app.getAppPath()
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const up = path.dirname(dir)
    if (up === dir) return app.getAppPath()
    dir = up
  }
  return dir
}

function localDate(t: number): string {
  const d = new Date(t)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** What was running across [from, to], and what had finished just before. */
function context(from: number, to: number): Record<string, unknown> {
  return {
    inFlight: [...inFlight]
      .filter((c) => c.start <= to)
      .map((c) => ({ channel: c.channel, args: c.args, runningMs: to - c.start })),
    recent: finished
      .filter((c) => c.end! >= from - CONTEXT_MS && c.start <= to)
      .map((c) => ({
        channel: c.channel,
        args: c.args,
        ms: c.end! - c.start,
        endedBeforeStallEndMs: to - c.end!
      }))
  }
}

function record(entry: Record<string, unknown>, start: number, ms: number): void {
  const line = JSON.stringify({
    at: new Date(start).toISOString(),
    ms,
    uptimeMs: Math.round(process.uptime() * 1000) - ms,
    version: app.getVersion(),
    platform: `${process.platform} ${os.release()}`,
    ...entry,
    ...context(start, start + ms)
  })
  console.warn(`[stall] ${entry.process} ${ms}ms`)
  const dir = stallDir()
  const file = path.join(dir, `${localDate(start)}.jsonl`)
  // Asynchronous, so that recording a stall never adds to one.
  void fs.promises
    .mkdir(dir, { recursive: true })
    .then(() =>
      fs.promises.stat(file).then(
        (s) => s.size,
        () => 0
      )
    )
    .then((size) => (size < MAX_FILE_BYTES ? fs.promises.appendFile(file, line + '\n') : undefined))
    .catch(() => {
      /* the log is a diagnostic; failing to write it must not matter */
    })
}

/**
 * Wrap `ipcMain.handle` so every handler registered after this is timed. A
 * wrapper at the one registration point rather than a call at each of the
 * hundred-odd handlers — plugins' channel included — so a new handler cannot
 * be forgotten.
 */
function trackIpc(): void {
  const handle = ipcMain.handle.bind(ipcMain)
  ipcMain.handle = ((channel: string, listener: Parameters<typeof ipcMain.handle>[1]) =>
    handle(channel, async (event, ...args) => {
      const call: Call = { channel, args: summarizeArgs(args), start: Date.now() }
      inFlight.add(call)
      try {
        return await listener(event, ...args)
      } finally {
        call.end = Date.now()
        inFlight.delete(call)
        finished.push(call)
        const horizon = call.end - CONTEXT_MS - 60_000
        if (finished.length > 500 || finished[0].end! < horizon) {
          finished = finished.filter((c) => c.end! >= horizon).slice(-500)
        }
      }
    })) as typeof ipcMain.handle
}

/** A tick that arrives late is a main process that was busy for the difference. */
function watchMainLoop(): void {
  let last = Date.now()
  const timer = setInterval(() => {
    const now = Date.now()
    const late = now - last - TICK_MS
    last = now
    if (late >= THRESHOLD_MS) record({ process: 'main', kind: 'event-loop' }, now - late, late)
  }, TICK_MS)
  timer.unref()
}

/** Before any handler is registered: `registerIpc` must run after this. */
export function startStallLog(): void {
  trackIpc()
  watchMainLoop()
  ipcMain.on('stall:renderer', (_e, s: RendererStall) => {
    if (typeof s?.ms === 'number' && s.ms >= THRESHOLD_MS && typeof s.start === 'number') {
      record({ process: 'renderer', kind: 'longtask' }, Math.round(s.start), Math.round(s.ms))
    }
  })
}

/**
 * Chromium's own hang detector, for a renderer stuck so long that it cannot
 * report its long task itself. Logged when it recovers, with how long it took;
 * one that never does is logged as it starts, so a kill leaves a trace too.
 */
export function watchWindowStalls(win: BrowserWindow): void {
  let since: number | null = null
  win.on('unresponsive', () => {
    since = Date.now()
    record({ process: 'renderer', kind: 'unresponsive' }, since, 0)
  })
  win.on('responsive', () => {
    if (since === null) return
    record({ process: 'renderer', kind: 'recovered' }, since, Date.now() - since)
    since = null
  })
}
