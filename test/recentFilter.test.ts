import { describe, expect, it } from 'vitest'
import { filterRecent } from '../src/renderer/src/recentFilter'

const base = (p: string): string => p.slice(p.lastIndexOf('/') + 1)
const list = ['/work/web/app', '/work/gitty', '/src/app-tools', '/apps/notes']

describe('filterRecent', () => {
  it('keeps everything, in order, for an empty query', () => {
    expect(filterRecent(list, base, '  ')).toEqual(list)
  })

  it('matches case-insensitively against the label and the path', () => {
    expect(filterRecent(list, base, 'GITTY')).toEqual(['/work/gitty'])
    expect(filterRecent(list, base, 'web')).toEqual(['/work/web/app'])
  })

  it('needs every term to match', () => {
    expect(filterRecent(list, base, 'work app')).toEqual(['/work/web/app'])
    expect(filterRecent(list, base, 'work zzz')).toEqual([])
  })

  it('puts label matches ahead of path-only ones, each in recency order', () => {
    expect(filterRecent(list, base, 'app')).toEqual([
      '/work/web/app',
      '/src/app-tools',
      '/apps/notes'
    ])
  })

  it('uses the label it is given, so a renamed tab is found by its name', () => {
    const names: Record<string, string> = { '/apps/notes': 'Journal' }
    const label = (p: string): string => names[p] ?? base(p)
    expect(filterRecent(list, label, 'journal')).toEqual(['/apps/notes'])
  })

  it('matches the path as pathOf shows it', () => {
    const home = (p: string): string => p.replace(/^\/work/, '~')
    expect(filterRecent(list, base, 'work', home)).toEqual([])
    expect(filterRecent(list, base, 'web', home)).toEqual(['/work/web/app'])
  })
})
