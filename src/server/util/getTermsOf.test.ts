import { describe, expect, test } from 'vitest'

import type { Term } from '../../shared/types'
import { getTermsOf } from './util'

const term = (id: number, startDate: string, endDate: string): Term => ({
  id,
  startDate,
  endDate,
  label: { en: `term ${id}`, fi: `term ${id}`, sv: `term ${id}` },
})

const spring2025 = term(1, '2025-01-01', '2025-07-31')
const fall2025 = term(2, '2025-08-01', '2025-12-31')
const spring2026 = term(3, '2026-01-01', '2026-07-31')

const terms = [spring2026, fall2025, spring2025]

const idsOf = (activityPeriod: any) => getTermsOf(activityPeriod, terms).map((t) => t.id)

describe('getTermsOf', () => {
  test('returns nothing when the course has no activity period', () => {
    expect(getTermsOf(null, terms)).toEqual([])
    expect(getTermsOf(undefined, terms)).toEqual([])
  })

  test('returns the single term a short course falls inside', () => {
    expect(idsOf({ startDate: '2025-09-01', endDate: '2025-10-01' })).toEqual([2])
  })

  test('returns every term a long course overlaps', () => {
    expect(idsOf({ startDate: '2025-03-01', endDate: '2026-03-01' })).toEqual([3, 2, 1])
  })

  test('preserves the ordering of the given terms', () => {
    expect(getTermsOf({ startDate: '2025-01-01', endDate: '2026-07-31' } as any, terms)).toEqual([spring2026, fall2025, spring2025])
  })

  test('overlap is inclusive at both boundaries', () => {
    // course ends exactly on the first day of fall
    expect(idsOf({ startDate: '2025-07-01', endDate: '2025-08-01' })).toEqual([2, 1])
    // course starts exactly on the last day of spring
    expect(idsOf({ startDate: '2025-07-31', endDate: '2025-09-01' })).toEqual([2, 1])
  })

  test('a course with no end date is treated as ongoing forever', () => {
    expect(idsOf({ startDate: '2025-02-01', endDate: null })).toEqual([3, 2, 1])
    expect(idsOf({ startDate: '2025-02-01' })).toEqual([3, 2, 1])
  })

  test('returns nothing for a course entirely after all known terms', () => {
    expect(idsOf({ startDate: '2027-01-01', endDate: '2027-05-01' })).toEqual([])
  })

  test('returns nothing for a course entirely before all known terms', () => {
    expect(idsOf({ startDate: '2020-01-01', endDate: '2020-05-01' })).toEqual([])
  })

  test('returns nothing when no terms are given', () => {
    expect(getTermsOf({ startDate: '2025-09-01', endDate: '2025-10-01' } as any, [])).toEqual([])
  })
})
