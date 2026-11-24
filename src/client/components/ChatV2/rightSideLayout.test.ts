import { describe, expect, test } from 'vitest'
import { rightSideLayout } from './rightSideLayout'

const wide = { isMobile: false, hasSources: false, sourcesExpanded: false, minimized: false }

describe('rightSideLayout', () => {
  test('an open file takes the slot, a minimized one goes to the rail', () => {
    expect(rightSideLayout({ ...wide, splitView: true })).toEqual({ slot: 'viewer', railFile: false, sourcesPanel: null })
    expect(rightSideLayout({ ...wide, splitView: true, minimized: true })).toEqual({ slot: null, railFile: true, sourcesPanel: null })
  })

  test('with a file and sources, one rail has both buttons and the expanded one takes the slot', () => {
    const both = { ...wide, splitView: true, hasSources: true }
    expect(rightSideLayout({ ...both, minimized: true })).toEqual({ slot: null, railFile: true, sourcesPanel: 'collapsed' })
    expect(rightSideLayout(both)).toEqual({ slot: 'viewer', railFile: false, sourcesPanel: 'collapsed' })
    expect(rightSideLayout({ ...both, sourcesExpanded: true })).toEqual({ slot: 'sources', railFile: true, sourcesPanel: null })
    expect(rightSideLayout({ ...both, sourcesExpanded: true, minimized: true })).toEqual({ slot: 'sources', railFile: true, sourcesPanel: null })
  })

  test('without a file, the sources have their own panel, and none on mobile', () => {
    expect(rightSideLayout({ ...wide, splitView: false, hasSources: true })).toEqual({ slot: null, railFile: false, sourcesPanel: 'collapsed' })
    expect(rightSideLayout({ ...wide, splitView: false, hasSources: true, sourcesExpanded: true })).toEqual({
      slot: null,
      railFile: false,
      sourcesPanel: 'expanded',
    })
    expect(rightSideLayout({ ...wide, splitView: false, hasSources: true, isMobile: true })).toEqual({ slot: null, railFile: false, sourcesPanel: null })
    expect(rightSideLayout({ ...wide, splitView: false })).toEqual({ slot: null, railFile: false, sourcesPanel: null })
  })
})
