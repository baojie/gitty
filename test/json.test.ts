import { describe, expect, it } from 'vitest'
// A renderer module, but a DOM-free one — hence the entry for it in
// tsconfig.node.json, which is the project the tests belong to.
import { formatJson, formatJsonDoc } from '../src/renderer/src/json'

describe('formatJson', () => {
  it('opens a minified document out into a tree', () => {
    expect(formatJson('{"a":1,"b":[2,3]}')).toBe(
      ['{', '  "a": 1,', '  "b": [', '    2,', '    3', '  ]', '}'].join('\n')
    )
  })

  it('keeps empty containers on their line', () => {
    expect(formatJson('{"a":{},"b":[ ]}')).toBe(
      ['{', '  "a": {},', '  "b": []', '}'].join('\n')
    )
  })

  it('re-indents a document that is already indented, its own way', () => {
    expect(formatJson('{\n\t"a": [\n\t\t1\n\t]\n}')).toBe(
      ['{', '  "a": [', '    1', '  ]', '}'].join('\n')
    )
  })

  it('takes a bare scalar, which is a whole JSON document', () => {
    expect(formatJson('  "hi"  ')).toBe('"hi"')
    expect(formatJson('42')).toBe('42')
    expect(formatJson('null')).toBe('null')
  })

  it('drops a byte order mark, which is not part of the document', () => {
    expect(formatJson('﻿[1]')).toBe('[\n  1\n]')
  })

  it('takes an indent width of its own', () => {
    expect(formatJson('[1]', 4)).toBe('[\n    1\n]')
  })

  // The whole reason this is not JSON.parse + JSON.stringify: a viewer must
  // show the number and the key order that are in the file.
  it('re-emits numbers as the file spells them', () => {
    const big = '{"n":12345678901234567890,"e":1e999,"z":-0.0,"s":1.500}'
    expect(formatJson(big)).toBe(
      ['{', '  "n": 12345678901234567890,', '  "e": 1e999,', '  "z": -0.0,', '  "s": 1.500', '}'].join(
        '\n'
      )
    )
  })

  it('keeps the keys in the order the file has them', () => {
    expect(formatJson('{"2":"b","1":"a"}')).toBe(['{', '  "2": "b",', '  "1": "a"', '}'].join('\n'))
  })

  it('keeps a duplicate key rather than dropping one', () => {
    expect(formatJson('{"a":1,"a":2}')).toBe(['{', '  "a": 1,', '  "a": 2', '}'].join('\n'))
  })

  it('leaves the escapes in a string exactly as written', () => {
    const s = '{"a":"line\\nbreak \\u00e9 \\" \\\\ /"}'
    expect(formatJson(s)).toBe(`{\n  "a": "line\\nbreak \\u00e9 \\" \\\\ /"\n}`)
  })

  it('reads a string holding what would otherwise be syntax', () => {
    expect(formatJson('["},{ \\" ]"]')).toBe('[\n  "},{ \\" ]"\n]')
  })

  describe('says no rather than guessing', () => {
    const bad: Record<string, string> = {
      empty: '',
      whitespace: '  \n ',
      'a trailing comma': '{"a":1,}',
      'an unclosed object': '{"a":1',
      'an unquoted key': '{a:1}',
      'single quotes': "{'a':1}",
      'a comment': '{"a":1} // note',
      'two documents': '{"a":1}{"b":2}',
      'a stray brace': '{"a":1}}',
      'a JavaScript literal': '{"a":undefined}',
      'a leading plus': '[+1]',
      'a leading zero': '[01]',
      'a hex number': '[0x10]',
      'an unterminated string': '["a]',
      'a bad escape': '["\\q"]',
      'a short unicode escape': '["\\u12"]',
      'a raw newline inside a string': '["a\nb"]'
    }
    for (const [what, text] of Object.entries(bad)) {
      it(`refuses ${what}`, () => expect(formatJson(text)).toBeNull())
    }
  })
})

describe('formatJsonDoc', () => {
  /** The folds as pairs, which reads better in an expectation than a Map. */
  const folds = (text: string): [number, number][] => [
    ...(formatJsonDoc(text)?.folds ?? new Map<number, number>())
  ]

  it('names the line each container opens and closes on', () => {
    // {           1
    //   "a": [    2
    //     1       3
    //   ],        4
    //   "b": 2    5
    // }           6
    expect(folds('{"a":[1],"b":2}')).toEqual([
      [2, 4],
      [1, 6]
    ])
  })

  it('has no fold for an empty container, which hides nothing', () => {
    expect(folds('{"a":{},"b":[]}')).toEqual([[1, 4]])
  })

  it('has none at all for a document that is a bare scalar', () => {
    expect(folds('42')).toEqual([])
  })

  it('counts the lines of a container nested in a container', () => {
    expect(folds('[[[1]]]')).toEqual([
      [3, 5],
      [2, 6],
      [1, 7]
    ])
  })

  // The reason the folds are recorded while emitting rather than found by
  // reading the result back: a brace in a string is not a brace.
  it('is not fooled by a bracket inside a string', () => {
    expect(folds('{"a":"{[","b":1}')).toEqual([[1, 4]])
  })

  it('answers null where the text is not one document, as the text does', () => {
    expect(formatJsonDoc('{"a":1}}')).toBeNull()
  })
})
