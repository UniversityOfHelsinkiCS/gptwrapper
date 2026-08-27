import { describe, expect, test } from 'vitest'
import { getChatStatus } from './activity'
import { ApplicationError } from 'src/server/util/ApplicationError'

const courseFixture = (overrides = {}) =>
  ({
    activated: true,
    activityPeriod: { startDate: '2020-01-01', endDate: '2099-01-01' },
    ...overrides,
  }) as any

describe('Course status', () => {
  test('is active', () => {
    const courseStatus = getChatStatus(courseFixture())
    expect(courseStatus).toEqual('ACTIVATED')
  })
  test('is not active', () => {
    const courseStatus = getChatStatus(courseFixture({ activated: false }))
    expect(courseStatus).toEqual('NOT_ACTIVATED')
  })
  test('is expired', () => {
    const courseStatus = getChatStatus(courseFixture({ activityPeriod: { startDate: '1744-01-01', endDate: '1818-12-31' } }))
    expect(courseStatus).toEqual('EXPIRED')
  })
  test('is expired for course that was never activated', () => {
    const courseStatus = getChatStatus(courseFixture({ activated: false, activityPeriod: { startDate: '1744-01-01', endDate: '1818-12-31' } }))
    expect(courseStatus).toEqual('EXPIRED')
  })
  test('is not started', () => {
    const courseStatus = getChatStatus(courseFixture({ activityPeriod: { startDate: '2094-01-01', endDate: '2102-12-31' } }))
    expect(courseStatus).toEqual('NOT_STARTED')
  })
  test('throws with an inproper date', () => {
    expect(() => getChatStatus(courseFixture({ activityPeriod: { startDate: '2094-01-01', endDate: 'not-a-date' } }))).toThrow(ApplicationError)
  })
})
