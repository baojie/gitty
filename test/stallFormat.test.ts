import { describe, expect, it } from 'vitest'
import { summarizeArgs } from '../src/main/stallFormat'

describe('summarizeArgs', () => {
  it('keeps short scalars as they are', () => {
    expect(summarizeArgs(['/tmp/repo', 3, true, null])).toBe('"/tmp/repo", 3, true, null')
  })

  it('reduces an array to its length and first item', () => {
    const pairs = Array.from({ length: 2000 }, (_, i) => ({ rev: 'abc', filePath: `f${i}` }))
    expect(summarizeArgs(['/tmp/repo', pairs])).toBe(
      '"/tmp/repo", [2000 items, first {rev,filePath}]'
    )
  })

  it('shows an object’s fields one level deep', () => {
    expect(summarizeArgs([{ mode: 'commit', hash: 'abc', paths: ['a', 'b'] }])).toBe(
      '{mode: "commit", hash: "abc", paths: [2 items]}'
    )
  })

  it('cuts long strings and the whole line', () => {
    const s = summarizeArgs(['x'.repeat(500)])
    expect(s).toContain('…(500)')
    expect(s.length).toBeLessThan(140)
    expect(summarizeArgs(Array.from({ length: 50 }, () => 'y'.repeat(100))).length).toBe(401)
  })
})
