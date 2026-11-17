import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { COMMON_DIRS, guessBases, rankFound, scoreName } from '../src/main/guess'

const home = '/home/alice'
const p = path.posix

describe('guessBases', () => {
  it('searches where the remembered repositories live, heaviest first', () => {
    const bases = guessBases(
      ['/home/alice/work/team/api', '/home/alice/work/team/web', '/home/alice/oss/lib'],
      home,
      p
    )
    expect(bases[0]).toEqual({ dir: '/home/alice/work/team', depth: 1, weight: 4 })
    // The directory above a parent is searched two levels down.
    expect(bases.find((b) => b.dir === '/home/alice/work')).toMatchObject({ depth: 2 })
    expect(bases.find((b) => b.dir === '/home/alice/oss')).toMatchObject({ depth: 1, weight: 2 })
  })

  it('never climbs to home’s parent or the filesystem root', () => {
    const dirs = guessBases(['/home/alice/app', '/srv/app'], home, p).map((b) => b.dir)
    expect(dirs).not.toContain('/home')
    expect(dirs).not.toContain('/')
    // A repository right under home weighs home up, one level down only.
    expect(guessBases(['/home/alice/app'], home, p)[0]).toEqual({
      dir: home,
      depth: 1,
      weight: 2.5
    })
  })

  it('falls back to the common places with no history at all', () => {
    const dirs = guessBases([], home, p).map((b) => b.dir)
    expect(dirs[0]).toBe(home)
    expect(dirs).toContain('/home/alice/work')
    expect(dirs).toHaveLength(COMMON_DIRS.length)
  })

  it('merges a directory reached twice and keeps the deeper search', () => {
    const bases = guessBases(['/home/alice/work/a', '/home/alice/work/g/b'], home, p)
    const work = bases.find((b) => b.dir === '/home/alice/work')
    // parent of a (2) + grandparent of b (1) + a common place (0.5)
    expect(work).toEqual({ dir: '/home/alice/work', depth: 2, weight: 3.5 })
  })
})

describe('scoreName', () => {
  it('ranks a whole name over a prefix over a match anywhere', () => {
    expect(scoreName('gitty', 'gitty')).toBe(3)
    expect(scoreName('gitty-desktop', 'gitty')).toBe(2)
    expect(scoreName('my-gitty', 'gitty')).toBe(1)
    expect(scoreName('notes', 'gitty')).toBe(0)
  })

  it('ignores case and the separators people disagree about', () => {
    expect(scoreName('My_App', 'myapp')).toBe(3)
    expect(scoreName('my-app', 'MyApp')).toBe(3)
  })

  it('needs every word', () => {
    expect(scoreName('web-admin-panel', 'admin web')).toBe(1)
    expect(scoreName('web-admin-panel', 'admin api')).toBe(0)
    expect(scoreName('anything', '   ')).toBe(0)
  })
})

describe('rankFound', () => {
  it('orders by score, then base weight, then path length, without duplicates', () => {
    const ranked = rankFound(
      [
        { path: '/a/x/my-tool', score: 1, weight: 9 },
        { path: '/b/tool', score: 3, weight: 0.5 },
        { path: '/c/deep/tool', score: 3, weight: 0.5 },
        { path: '/d/tool', score: 3, weight: 2 },
        { path: '/d/tool', score: 3, weight: 2 }
      ],
      3
    )
    expect(ranked).toEqual(['/d/tool', '/b/tool', '/c/deep/tool'])
  })
})
