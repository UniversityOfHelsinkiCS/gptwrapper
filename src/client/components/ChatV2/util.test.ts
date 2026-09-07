// @vitest-environment node
import { describe, test, expect } from 'vitest'

import { getGroupedCourses, filterUsages, formatDate } from './util'
import type { CoursesViewCourse } from '../../hooks/useUserCourses'
import type { ChatInstanceUsage } from '../../types'

const course = (overrides: Partial<CoursesViewCourse>): CoursesViewCourse =>
  ({
    id: 'c',
    activated: false,
    expired: false,
    ...overrides,
  }) as CoursesViewCourse

describe('getGroupedCourses', () => {
  test('splits courses into enabled / disabled / ended buckets', () => {
    const enabled = course({ id: 'enabled', activated: true, expired: false })
    const disabled = course({ id: 'disabled', activated: false, expired: false })
    const ended = course({ id: 'ended', activated: true, expired: true })

    const { curreEnabled, curreDisabled, ended: endedCourses } = getGroupedCourses([enabled, disabled, ended])

    expect(curreEnabled).toEqual([enabled])
    expect(curreDisabled).toEqual([disabled])
    expect(endedCourses).toEqual([ended])
  })

  test('returns empty buckets for no courses', () => {
    expect(getGroupedCourses()).toEqual({ curreEnabled: [], curreDisabled: [], ended: [] })
  })

  // Documents a real gap that is acually a feature: a course that is expired but never activated
  // matches none of the three buckets and disappears from every list.
  test('drops a course that is expired but not activated (no bucket matches)', () => {
    const orphan = course({ id: 'orphan', activated: false, expired: true })

    const { curreEnabled, curreDisabled, ended } = getGroupedCourses([orphan])

    expect(curreEnabled).not.toContain(orphan)
    expect(curreDisabled).not.toContain(orphan)
    expect(ended).not.toContain(orphan)
  })
})

describe('filterUsages', () => {
  const usage = (usageCount: number): ChatInstanceUsage => ({ usageCount }) as ChatInstanceUsage

  test('keeps usages at or above 90% of the limit', () => {
    const limit = 1000
    const usages = [usage(899), usage(900), usage(1000), usage(500)]

    const result = filterUsages(limit, usages)

    expect(result).toEqual([usage(900), usage(1000)])
  })

  test('returns empty when nobody is close to the limit', () => {
    expect(filterUsages(1000, [usage(0), usage(100)])).toEqual([])
  })
})

describe('formatDate', () => {
  test('returns empty string without an activity period', () => {
    expect(formatDate(undefined)).toBe('')
  })

  test('omits the start year when both dates share a year', () => {
    expect(formatDate({ startDate: '2024-09-01', endDate: '2024-12-31' })).toBe('01.09. – 31.12.2024')
  })

  test('shows both years when they differ', () => {
    expect(formatDate({ startDate: '2024-09-01', endDate: '2025-01-15' })).toBe('01.09.2024 – 15.01.2025')
  })
})
