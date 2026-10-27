// @vitest-environment node
import { describe, test, expect } from 'vitest'

import { getGroupedCourses, filterUsages, formatDate, preprocessMath } from './util'
import type { CoursesViewCourse } from '../../hooks/useUserCourses'
import type { ChatInstanceUsage } from '../../types'

const course = (overrides: Partial<CoursesViewCourse>): CoursesViewCourse =>
  ({
    id: 'c',
    status: 'NOT_ACTIVATED',
    ...overrides,
  }) as CoursesViewCourse

describe('getGroupedCourses', () => {
  test('puts each status in its bucket, and a course that has not started under disabled', () => {
    const enabled = course({ id: 'enabled', status: 'ACTIVATED' })
    const disabled = course({ id: 'disabled', status: 'NOT_ACTIVATED' })
    const notStarted = course({ id: 'not-started', status: 'NOT_STARTED' })
    const ended = course({ id: 'ended', status: 'EXPIRED' })

    const { curreEnabled, curreDisabled, ended: endedCourses } = getGroupedCourses([enabled, disabled, notStarted, ended])

    expect(curreEnabled).toEqual([enabled])
    expect(curreDisabled).toEqual([disabled, notStarted])
    expect(endedCourses).toEqual([ended])
  })

  test('returns empty buckets for no courses', () => {
    expect(getGroupedCourses()).toEqual({ curreEnabled: [], curreDisabled: [], ended: [] })
  })

  test('puts every course in exactly one bucket', () => {
    const courses = (['ACTIVATED', 'NOT_ACTIVATED', 'NOT_STARTED', 'EXPIRED'] as const).map((status) => course({ id: status, status }))

    const { curreEnabled, curreDisabled, ended } = getGroupedCourses(courses)

    expect([...curreEnabled, ...curreDisabled, ...ended].map((c) => c.id).sort()).toEqual(courses.map((c) => c.id).sort())
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

describe('preprocessMath', () => {
  test('converts latex delimiters outside code', () => {
    expect(preprocessMath('Let \\(x\\) be')).toBe('Let $$ x $$ be')
  })

  test('restores code blocks verbatim, including $ replacement patterns', () => {
    const code = "```bash\n# Print newline\necho $'\\n' $& $` $$\n```"
    const content = `Let \\(x\\) be\n\n${code}\n\nAfter\n\n\`$'\``

    expect(preprocessMath(content)).toBe(`Let $$ x $$ be\n\n${code}\n\nAfter\n\n\`$'\``)
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
