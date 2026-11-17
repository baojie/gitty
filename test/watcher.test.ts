import { describe, expect, it } from 'vitest'
import { isRelevantChange, isWatchedDir } from '../src/main/watcher'

describe('isRelevantChange', () => {
  it('keeps only the parts of .git that change what is shown', () => {
    expect(isRelevantChange('.git/HEAD')).toBe(true)
    expect(isRelevantChange('.git/index')).toBe(true)
    expect(isRelevantChange('.git/refs/heads/main')).toBe(true)
    expect(isRelevantChange('.git/objects/ab/cdef')).toBe(false)
  })

  it('treats .gitignore and .github as work-tree files', () => {
    expect(isRelevantChange('.gitignore')).toBe(true)
    expect(isRelevantChange('.github/workflows/ci.yml')).toBe(true)
  })

  it('ignores build output', () => {
    expect(isRelevantChange('src/app.ts')).toBe(true)
    expect(isRelevantChange('node_modules/x/index.js')).toBe(false)
    expect(isRelevantChange('web/dist/bundle.js')).toBe(false)
  })
})

describe('isWatchedDir', () => {
  it('watches .git and its refs, nothing else inside it', () => {
    expect(isWatchedDir('.git')).toBe(true)
    expect(isWatchedDir('.git/refs')).toBe(true)
    expect(isWatchedDir('.git/refs/heads/feature')).toBe(true)
    expect(isWatchedDir('.git/objects')).toBe(false)
    expect(isWatchedDir('.git/logs')).toBe(false)
  })

  it('skips build-output directories but not look-alikes', () => {
    expect(isWatchedDir('src')).toBe(true)
    expect(isWatchedDir('.github')).toBe(true)
    expect(isWatchedDir('node_modules')).toBe(false)
    expect(isWatchedDir('pkg/target')).toBe(false)
    expect(isWatchedDir('outline')).toBe(true)
  })
})
