import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

// The real config parses DEFAULT_MODEL, which the test environment may set to a model it does not know.
vi.hoisted(() => {
  delete process.env.DEFAULT_MODEL
})

import { FREE_MODEL } from '../../../config'
import type { UserStatus } from '../../types'
import { useUsageLimit } from './useUsageLimit'

afterEach(cleanup)

const costStatus = (usage: number): UserStatus => ({
  mode: 'cost',
  usage,
  limit: 2.5,
  budget: { limit: 2.5, base: 2.5, bonuses: [] },
  resetsAt: '2026-11-23T00:01:00.000Z',
})

describe('useUsageLimit', () => {
  test('under cost, at the budget limit, blocks sending until the reset and keeps the model', () => {
    const setModel = vi.fn()

    const { result } = renderHook(() => useUsageLimit(costStatus(2.5), setModel))

    expect(result.current).toEqual({ tokenLimitExceeded: false, budgetResetsAt: '2026-11-23T00:01:00.000Z' })
    expect(setModel).not.toHaveBeenCalled()
  })

  test('under cost, below the budget limit, nothing is blocked', () => {
    const setModel = vi.fn()

    const { result } = renderHook(() => useUsageLimit(costStatus(2.4), setModel))

    expect(result.current).toEqual({ tokenLimitExceeded: false, budgetResetsAt: null })
    expect(setModel).not.toHaveBeenCalled()
  })

  test('under tokens, at the token limit, switches to the free model without blocking', () => {
    const setModel = vi.fn()

    const { result } = renderHook(() => useUsageLimit({ mode: 'tokens', usage: 100, limit: 100 }, setModel))

    expect(result.current).toEqual({ tokenLimitExceeded: true, budgetResetsAt: null })
    expect(setModel).toHaveBeenCalledWith(FREE_MODEL)
  })

  test('before the status has loaded, nothing is blocked', () => {
    const setModel = vi.fn()

    const { result } = renderHook(() => useUsageLimit(undefined, setModel))

    expect(result.current).toEqual({ tokenLimitExceeded: false, budgetResetsAt: null })
    expect(setModel).not.toHaveBeenCalled()
  })
})
