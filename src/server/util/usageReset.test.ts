// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { nextUsageReset } from './usageReset'

// Local times, like node-cron's schedule. 2026-11-23 is a Monday.
describe('nextUsageReset', () => {
  test('is the coming Monday at 00:01 during the week', () => {
    expect(nextUsageReset(new Date(2026, 10, 19, 15, 30))).toEqual(new Date(2026, 10, 23, 0, 1))
    expect(nextUsageReset(new Date(2026, 10, 22, 23, 59))).toEqual(new Date(2026, 10, 23, 0, 1))
  })

  test('is the same Monday before 00:01 and the next one after it', () => {
    expect(nextUsageReset(new Date(2026, 10, 23, 0, 0))).toEqual(new Date(2026, 10, 23, 0, 1))
    expect(nextUsageReset(new Date(2026, 10, 23, 0, 1))).toEqual(new Date(2026, 10, 30, 0, 1))
    expect(nextUsageReset(new Date(2026, 10, 23, 12, 0))).toEqual(new Date(2026, 10, 30, 0, 1))
  })

  test('crosses month and year ends', () => {
    expect(nextUsageReset(new Date(2026, 11, 31, 10, 0))).toEqual(new Date(2027, 0, 4, 0, 1))
  })
})
