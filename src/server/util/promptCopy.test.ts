import { describe, expect, test } from 'vitest'

import { resolveCopyName, shouldKeepRagIndex } from './promptCopy'

describe('resolveCopyName', () => {
  test('keeps the name when the destination has no conflict', () => {
    expect(resolveCopyName(['Other prompt'], 'Essay helper')).toBe('Essay helper')
  })

  test('appends (2) when duplicating in place', () => {
    expect(resolveCopyName(['Essay helper'], 'Essay helper')).toBe('Essay helper (2)')
  })

  test('walks to the first free number', () => {
    expect(resolveCopyName(['Essay helper', 'Essay helper (2)', 'Essay helper (3)'], 'Essay helper')).toBe('Essay helper (4)')
  })

  test('continues the series instead of nesting suffixes', () => {
    expect(resolveCopyName(['Essay helper', 'Essay helper (2)'], 'Essay helper (2)')).toBe('Essay helper (3)')
  })

  test('fills a gap left by a deleted copy', () => {
    expect(resolveCopyName(['Essay helper', 'Essay helper (3)'], 'Essay helper')).toBe('Essay helper (2)')
  })

  test('keeps a name that merely looks like a copy when it is free', () => {
    expect(resolveCopyName(['Essay helper'], 'Essay helper (2)')).toBe('Essay helper (2)')
  })

  test('truncates an over-long name to the column length', () => {
    const name = 'a'.repeat(300)

    expect(resolveCopyName([], name)).toHaveLength(255)
  })

  test('makes room for the suffix when the name is at the column length', () => {
    const name = 'a'.repeat(255)
    const resolved = resolveCopyName([name], name)

    expect(resolved).toHaveLength(255)
    expect(resolved.endsWith(' (2)')).toBe(true)
  })
})

describe('shouldKeepRagIndex', () => {
  test('keeps the index when the copier owns it', () => {
    expect(shouldKeepRagIndex('user-1', 'user-1')).toBe(true)
  })

  test('drops the index when it belongs to someone else', () => {
    expect(shouldKeepRagIndex('user-2', 'user-1')).toBe(false)
  })

  test('drops the index when there is none', () => {
    expect(shouldKeepRagIndex(undefined, 'user-1')).toBe(false)
    expect(shouldKeepRagIndex(null, 'user-1')).toBe(false)
  })
})
