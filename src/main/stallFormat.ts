/**
 * A short, bounded description of an IPC call's arguments, for the stall log.
 * Enough to tell a call over three files from one over three thousand — which
 * is usually the whole story — without copying a patch or a file list into
 * the log: arrays become their length, objects their fields, long strings
 * their head.
 */

const MAX_STRING = 120
const MAX_TOTAL = 400

function brief(v: unknown, depth: number): string {
  if (v === null || v === undefined) return String(v)
  if (typeof v === 'string') {
    return JSON.stringify(v.length > MAX_STRING ? `${v.slice(0, MAX_STRING)}…(${v.length})` : v)
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]'
    return depth > 0
      ? `[${v.length} items]`
      : `[${v.length} items, first ${brief(v[0], depth + 1)}]`
  }
  if (typeof v === 'object') {
    if (depth > 0) return `{${Object.keys(v).join(',')}}`
    const fields = Object.entries(v as Record<string, unknown>).map(
      ([k, x]) => `${k}: ${brief(x, depth + 1)}`
    )
    return `{${fields.join(', ')}}`
  }
  return typeof v
}

export function summarizeArgs(args: readonly unknown[]): string {
  const s = args.map((a) => brief(a, 0)).join(', ')
  return s.length > MAX_TOTAL ? `${s.slice(0, MAX_TOTAL)}…` : s
}
