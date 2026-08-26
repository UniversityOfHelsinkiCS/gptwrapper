import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../../../util/apiClient', () => ({ default: { get: vi.fn() } }))

import apiClient from '../../../util/apiClient'
import useChatInstanceSearch, { CHAT_INSTANCE_SEARCH_MIN_LENGTH } from './useChatInstanceSearch'

const mockedGet = vi.mocked(apiClient.get)

const results = [{ id: 'cur-1', name: { en: 'Intro', fi: 'Intro', sv: 'Intro' }, codes: ['TKT10003'], terms: [] }]

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useChatInstanceSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGet.mockResolvedValue({ data: results } as any)
  })

  test('does not query for a search shorter than the minimum length', () => {
    const short = 'a'.repeat(CHAT_INSTANCE_SEARCH_MIN_LENGTH - 1)

    const { result } = renderHook(() => useChatInstanceSearch(short, 'en'), { wrapper: createWrapper() })

    expect(mockedGet).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  test('queries once the search reaches the minimum length', async () => {
    const { result } = renderHook(() => useChatInstanceSearch('testing', 'en'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(results)
    expect(mockedGet).toHaveBeenCalledWith('/admin/chatinstance-search?search=testing&language=en')
  })

  test('passes the language through', async () => {
    const { result } = renderHook(() => useChatInstanceSearch('testing', 'fi'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith('/admin/chatinstance-search?search=testing&language=fi')
  })

  test('url-encodes the search term', async () => {
    const { result } = renderHook(() => useChatInstanceSearch('a&b c', 'en'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith('/admin/chatinstance-search?search=a%26b%20c&language=en')
  })

  test('keeps the previous results visible while the next search loads', async () => {
    const wrapper = createWrapper()
    const { result, rerender } = renderHook(({ search }) => useChatInstanceSearch(search, 'en'), {
      wrapper,
      initialProps: { search: 'testing' },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    let resolveNext: (value: unknown) => void = () => {}
    mockedGet.mockReturnValue(new Promise((resolve) => (resolveNext = resolve)) as any)

    rerender({ search: 'testing more' })

    expect(result.current.data).toEqual(results)
    expect(result.current.isFetching).toBe(true)

    resolveNext({ data: [] })
    await waitFor(() => expect(result.current.data).toEqual([]))
  })

  test('refetches when only the language changes', async () => {
    const wrapper = createWrapper()
    const { result, rerender } = renderHook(({ language }) => useChatInstanceSearch('testing', language), {
      wrapper,
      initialProps: { language: 'en' },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ language: 'fi' })

    await waitFor(() => expect(mockedGet).toHaveBeenLastCalledWith('/admin/chatinstance-search?search=testing&language=fi'))
  })
})
