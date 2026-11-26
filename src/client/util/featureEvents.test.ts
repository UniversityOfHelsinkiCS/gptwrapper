import { afterEach, describe, expect, test, vi } from 'vitest'
vi.mock('../../config', () => ({ PUBLIC_URL: '/chat' }))
import { trackFeatureEvent } from './featureEvents'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('trackFeatureEvent', () => {
  test('posts the event as JSON, kept alive, with the custom headers', () => {
    const fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetch)
    localStorage.setItem('adminLoggedInAs', 'user-2')
    trackFeatureEvent({ feature: 'my_files', action: 'attach_folder' })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/chat/api/analytics/events')
    expect(init.method).toBe('POST')
    expect(init.keepalive).toBe(true)
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', 'x-admin-logged-in-as': 'user-2' })
    expect(JSON.parse(init.body as string)).toEqual({ feature: 'my_files', action: 'attach_folder' })
  })

  test('never throws, also when fetch rejects', async () => {
    const rejected = Promise.reject(new Error('offline'))
    vi.stubGlobal(
      'fetch',
      vi.fn(() => rejected),
    )
    expect(trackFeatureEvent({ feature: 'my_files', action: 'attach_folder' })).toBeUndefined()
    await rejected.catch(() => {})
  })

  test('never throws when fetch throws synchronously', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new TypeError('bad request')
      }),
    )
    expect(() => trackFeatureEvent({ feature: 'my_files', action: 'attach_folder' })).not.toThrow()
  })
})
