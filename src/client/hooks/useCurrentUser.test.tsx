import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/react', () => ({ setUser: vi.fn() }))
vi.mock('../util/apiClient', () => ({ default: { get: vi.fn() } }))

import apiClient from '../util/apiClient'
import useCurrentUser from './useCurrentUser'

const mockedGet = vi.mocked(apiClient.get)

const response = (status: number, data?: unknown) => ({ status, data }) as any

const axiosError = (status: number) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status },
  })

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns the user on 200', async () => {
    mockedGet.mockResolvedValue(response(200, { id: 'u1', username: 'testuser' }))

    const { result } = renderHook(() => useCurrentUser(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.user?.id).toBe('u1')
  })

  test('returns null rather than erroring on 401', async () => {
    mockedGet.mockResolvedValue(response(401))

    const { result } = renderHook(() => useCurrentUser(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.user).toBeNull()
    expect(result.current.isError).toBe(false)
  })

  test('does not retry 4xx errors', async () => {
    mockedGet.mockRejectedValue(axiosError(403))

    const { result } = renderHook(() => useCurrentUser(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockedGet).toHaveBeenCalledTimes(1)
  })
})
