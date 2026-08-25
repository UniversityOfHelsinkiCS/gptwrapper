import { afterEach, describe, expect, test, vi } from 'vitest'

import { generateTerms } from './util'

const at = (isoDate: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(isoDate))
  return generateTerms()
}

afterEach(() => {
  vi.useRealTimers()
})

describe('generateTerms', () => {
  test('newest term is the one running today, mid-spring', () => {
    expect(at('2026-03-15T12:00:00Z')[0].label.en).toBe('spring 2026')
  })

  test('newest term is the one running today, on the last day of spring', () => {
    expect(at('2026-07-31T12:00:00Z')[0].label.en).toBe('spring 2026')
  })

  // the bug: August is month index 7, so the old `monthNow > 7` check missed it and the fall term
  // that had just started was chopped off, hiding courses beginning in it
  test('includes the fall term from its first day', () => {
    expect(at('2026-08-01T12:00:00Z')[0].label.en).toBe('fall 2026')
  })

  test('includes the fall term later in August', () => {
    expect(at('2026-08-25T12:00:00Z')[0].label.en).toBe('fall 2026')
  })

  // the mirror-image bug: from September the old loop ran a year ahead and only trimmed one term,
  // leaving a spring term that had not started yet
  test('does not expose a term that has not started', () => {
    expect(at('2026-12-20T12:00:00Z')[0].label.en).toBe('fall 2026')
  })

  test('rolls over to the new spring term in January', () => {
    expect(at('2027-01-05T12:00:00Z')[0].label.en).toBe('spring 2027')
  })

  test('ids are stable and sequential from spring 2023, newest first', () => {
    const terms = at('2026-08-25T12:00:00Z')

    expect(terms[0]).toMatchObject({ id: 8, startDate: '2026-08-01', endDate: '2026-12-31' })
    expect(terms.at(-1)).toMatchObject({ id: 1, startDate: '2023-01-01', endDate: '2023-07-31' })
    expect(terms.map((term) => term.id)).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
  })

  test('every returned term has already begun', () => {
    const now = new Date('2026-08-25T12:00:00Z')

    for (const term of at('2026-08-25T12:00:00Z')) {
      expect(new Date(term.startDate) <= now).toBe(true)
    }
  })
})
