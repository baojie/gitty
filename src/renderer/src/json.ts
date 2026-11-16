/**
 * Re-indenting JSON for the file viewer: one long line becomes a readable
 * tree, and the button offering it appears only where this module says the
 * text is JSON at all.
 *
 * A leaf module — it imports nothing, so the header can ask "is this
 * formattable?" without dragging a viewer chunk along.
 *
 * `JSON.stringify(JSON.parse(text), null, 2)` is the one-liner this is not,
 * because it does not round-trip a file: `1e999` comes back `null`,
 * `12345678901234567890` loses its last digits, an object with the keys `"2"`
 * and `"1"` comes back in numeric order, and a duplicate key is dropped. A
 * viewer must show what is in the file, so every scalar is re-emitted as the
 * source spelled it and only the whitespace between tokens is ours.
 */

/** Whitespace as JSON defines it — not `\s`, which also takes NBSP and more. */
function isSpace(c: string): boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r'
}

const NUMBER = /-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?/y

/** The escapes a backslash may introduce, beside `\uXXXX`. */
const ESCAPES = '"\\/bfnrt'
const HEX4 = /^[0-9a-fA-F]{4}$/

/**
 * A formatted document: the text, and where every container it opened begins
 * and ends. The lines are 1-based, and the pair is the line the `{` or `[` sits
 * at and the line its `}` or `]` sits at — which is what a viewer needs to fold
 * one away. Recorded while emitting rather than found by re-reading the result:
 * the scanner already knows a brace inside a string is not a brace.
 */
export interface JsonDoc {
  text: string
  /** Opening line → closing line, for every container with something in it. */
  folds: ReadonlyMap<number, number>
}

/**
 * `text` re-indented, or `null` when it is not one complete JSON document —
 * which is the same answer as "there is nothing to offer here", so callers use
 * it to decide whether the button exists.
 */
export function formatJson(text: string, indent = 2): string | null {
  return formatJsonDoc(text, indent)?.text ?? null
}

/** The same work, with the fold ranges the viewer needs beside the text. */
export function formatJsonDoc(text: string, indent = 2): JsonDoc | null {
  // A file written by an editor that marks its encoding starts with a BOM; it
  // is not part of the document, and the viewer has already read the text as
  // characters, so it goes.
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  let i = 0
  const out: string[] = []
  // The line the next token will be written on, and what the folds are keyed
  // by. Only `nl` moves it, so the count cannot drift from the text.
  let line = 1
  const folds = new Map<number, number>()

  const skipSpace = (): void => {
    while (i < s.length && isSpace(s[i])) i++
  }

  const pad = (depth: number): string => ' '.repeat(indent * depth)

  /** Break, and indent to `depth`. The one place a line is ever started. */
  const nl = (depth: number): void => {
    out.push('\n', pad(depth))
    line++
  }

  /** A string token, emitted exactly as written; `false` if it is malformed. */
  const string = (): boolean => {
    if (s[i] !== '"') return false
    const start = i
    i++
    for (;;) {
      const c = s[i]
      if (c === undefined) return false
      // Every character below the space is a control character, which JSON
      // says must be escaped rather than written raw.
      if (c < ' ') return false
      if (c === '"') {
        i++
        out.push(s.slice(start, i))
        return true
      }
      if (c === '\\') {
        const e = s[i + 1]
        if (e !== undefined && ESCAPES.includes(e)) i += 2
        else if (e === 'u' && HEX4.test(s.slice(i + 2, i + 6))) i += 6
        else return false
        continue
      }
      i++
    }
  }

  const value = (depth: number): boolean => {
    const c = s[i]
    if (c === '"') return string()
    if (c === '{' || c === '[') return container(depth, c)
    for (const lit of ['true', 'false', 'null']) {
      if (s.startsWith(lit, i)) {
        i += lit.length
        out.push(lit)
        return true
      }
    }
    NUMBER.lastIndex = i
    const m = NUMBER.exec(s)
    if (!m || m[0].length === 0) return false
    i = NUMBER.lastIndex
    out.push(m[0])
    return true
  }

  const container = (depth: number, open: '{' | '['): boolean => {
    const close = open === '{' ? '}' : ']'
    // Read before anything is emitted: nested containers move the counter on,
    // so the opening line has to be remembered rather than worked out after.
    const openLine = line
    i++
    skipSpace()
    // An empty container stays on its line: `{}` opened over three lines is
    // noise, and every formatter a reader has met writes it this way.
    if (s[i] === close) {
      i++
      out.push(open + close)
      return true
    }
    out.push(open)
    for (;;) {
      nl(depth + 1)
      if (open === '{') {
        if (!string()) return false
        skipSpace()
        if (s[i] !== ':') return false
        i++
        out.push(': ')
        skipSpace()
      }
      if (!value(depth + 1)) return false
      skipSpace()
      if (s[i] === ',') {
        i++
        out.push(',')
        skipSpace()
        continue
      }
      if (s[i] !== close) return false
      i++
      nl(depth)
      out.push(close)
      // An empty container never reaches here, so every recorded fold has at
      // least one line to hide.
      folds.set(openLine, line)
      return true
    }
  }

  skipSpace()
  if (!value(0)) return null
  skipSpace()
  // Anything after the document — a second value, a stray brace — means this
  // is not the JSON file it looked like, and formatting the part that parsed
  // would show the reader a silently truncated file.
  if (i !== s.length) return null
  return { text: out.join(''), folds }
}
