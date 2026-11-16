import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { lfsObjectPath, parseLfsPointer } from '../src/main/lfs'

const OID = 'a26e0004e9ce82b10b92ab8b52c900a7de6ceba844ca897ced9b1e020506700e'
const POINTER = `version https://git-lfs.github.com/spec/v1\noid sha256:${OID}\nsize 595355\n`

const buf = (s: string): Buffer => Buffer.from(s, 'latin1')

describe('parseLfsPointer', () => {
  it('reads the oid and the real file size', () => {
    expect(parseLfsPointer(buf(POINTER))).toEqual({ oid: OID, size: 595355 })
  })

  it('says nothing about a file that is not a pointer', () => {
    expect(parseLfsPointer(buf('%PDF-1.7\n...'))).toBeNull()
    expect(parseLfsPointer(Buffer.alloc(0))).toBeNull()
    // Arbitrary bytes must not throw on the way to being rejected.
    expect(parseLfsPointer(Buffer.from([0xff, 0xfe, 0x00, 0x80]))).toBeNull()
  })

  it('does not take a document about Git LFS for a pointer to one', () => {
    expect(parseLfsPointer(buf(`# LFS\n${POINTER}`))).toBeNull()
    expect(parseLfsPointer(buf('See https://git-lfs.github.com/spec/v1 for the format.\n'))).toBeNull()
  })

  it('rejects a malformed pointer rather than guessing', () => {
    // CRLF is not the format; a short or non-hex oid is not one either.
    expect(parseLfsPointer(buf(POINTER.replace(/\n/g, '\r\n')))).toBeNull()
    expect(parseLfsPointer(buf(POINTER.replace(OID, OID.slice(0, 40))))).toBeNull()
    expect(parseLfsPointer(buf(POINTER.replace(OID, OID.toUpperCase())))).toBeNull()
    // Another hash algorithm is not sha256, whatever it says.
    expect(parseLfsPointer(buf(POINTER.replace('sha256', 'sha512')))).toBeNull()
    // The keys are ordered, and the trailing newline is part of the format.
    expect(parseLfsPointer(buf(POINTER.trimEnd()))).toBeNull()
    expect(parseLfsPointer(buf(`oid sha256:${OID}\nversion https://git-lfs.github.com/spec/v1\nsize 1\n`))).toBeNull()
  })

  it('rejects a size no file could have', () => {
    expect(parseLfsPointer(buf(POINTER.replace('595355', '9'.repeat(30))))).toBeNull()
    expect(parseLfsPointer(buf(POINTER.replace('595355', '-1')))).toBeNull()
  })

  it('leaves anything past the pointer ceiling alone', () => {
    expect(parseLfsPointer(buf(POINTER + ' '.repeat(1024)))).toBeNull()
  })

  it('accepts an empty file, which is a pointer to nothing stored', () => {
    expect(parseLfsPointer(buf(POINTER.replace('595355', '0')))).toEqual({ oid: OID, size: 0 })
  })
})

describe('lfsObjectPath', () => {
  it('fans out by the first four hex digits', () => {
    expect(lfsObjectPath('/repo/.git', OID)).toBe(path.join('/repo/.git', 'lfs', 'objects', 'a2', '6e', OID))
  })
})
