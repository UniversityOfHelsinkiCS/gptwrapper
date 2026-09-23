// @vitest-environment node
import 'express-async-errors'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

vi.mock('../../config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config')>()),
  // The route serves fake releases in CI, these tests cover the real path.
  inCI: false,
}))

import axios from 'axios'
import changelogRouter, { CACHE_TTL_MS, FAILURE_COOLDOWN_MS, getPublicDescription, isInternalRelease, resetChangelogState } from './changelog'
import errorHandler from '../middleware/error'

/**
 * The route has no authorization logic, so the test app just mounts the router. The GitHub API is
 * mocked; this exercises the mapping to Release and the caching behaviour.
 */
let server: Server
let baseUrl: string

const githubRelease = {
  name: 'v4.7.13',
  tag_name: 'v4.7.13',
  published_at: '2026-09-01T10:00:00Z',
  body: '## Changes\n- Something new',
}

const expectedRelease = {
  title: 'v4.7.13',
  version: 'v4.7.13',
  time: '2026-09-01T10:00:00Z',
  description: '## Changes\n- Something new',
}

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/changelog', changelogRouter)
  app.use(errorHandler)

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve())
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  resetChangelogState()
})

const getChangelog = () => fetch(`${baseUrl}/changelog`)

describe('getPublicDescription', () => {
  test('drops the internal section and the separator above it', () => {
    const body = ['### Improvements', '', '- Something new', '', '---', '', '### Internal', '', '- Bumped a dependency'].join('\n')

    expect(getPublicDescription(body)).toBe('### Improvements\n\n- Something new')
  })

  test('keeps notes that have no internal section', () => {
    const body = '### Fixes\n\n- Fixed a bug'

    expect(getPublicDescription(body)).toBe(body)
  })
})

describe('isInternalRelease', () => {
  test('recognises a release titled as internal', () => {
    expect(isInternalRelease({ ...expectedRelease, title: 'Internal: dependency bumps' })).toBe(true)
    expect(isInternalRelease({ ...expectedRelease, title: 'internal release' })).toBe(true)
  })

  test('leaves normal releases alone', () => {
    expect(isInternalRelease(expectedRelease)).toBe(false)
  })
})

describe('GET /changelog', () => {
  test('maps GitHub releases to Release objects and skips internal ones', async () => {
    const internalRelease = { ...githubRelease, name: 'Internal: dependency bumps', tag_name: 'v4.7.12' }
    vi.mocked(axios.get).mockResolvedValue({ data: [githubRelease, internalRelease] })

    const response = await getChangelog()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([expectedRelease])
  })

  test('serves the cached releases without calling GitHub until the cache expires', async () => {
    const now = Date.now()
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(now)
    vi.mocked(axios.get).mockResolvedValue({ data: [githubRelease] })

    await getChangelog()
    const response = await getChangelog()

    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([expectedRelease])

    dateNow.mockReturnValue(now + CACHE_TTL_MS)
    await getChangelog()

    expect(axios.get).toHaveBeenCalledTimes(2)
  })

  test('falls back to the previously fetched releases when GitHub fails', async () => {
    const now = Date.now()
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(now)
    vi.mocked(axios.get).mockResolvedValueOnce({ data: [githubRelease] }).mockRejectedValueOnce(new Error('rate limited'))

    await getChangelog()
    dateNow.mockReturnValue(now + CACHE_TTL_MS)
    const response = await getChangelog()

    expect(axios.get).toHaveBeenCalledTimes(2)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([expectedRelease])
  })

  test('responds with 503 when GitHub fails and nothing has been fetched before', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('rate limited'))

    const response = await getChangelog()

    expect(response.status).toBe(503)
  })

  test('does not call GitHub again until the cooldown after a failure has passed', async () => {
    const now = Date.now()
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(now)
    vi.mocked(axios.get).mockRejectedValue(new Error('rate limited'))

    await getChangelog()
    const duringCooldown = await getChangelog()

    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(duringCooldown.status).toBe(503)

    dateNow.mockReturnValue(now + FAILURE_COOLDOWN_MS)
    await getChangelog()

    expect(axios.get).toHaveBeenCalledTimes(2)
  })

  test('skips pre-releases and drafts and sorts the rest newest first', async () => {
    const olderRelease = { ...githubRelease, name: 'v4.7.12', tag_name: 'v4.7.12', published_at: '2026-08-01T10:00:00Z' }
    const prerelease = { ...githubRelease, name: 'v4.8.0-rc1', tag_name: 'v4.8.0-rc1', prerelease: true }
    const draft = { ...githubRelease, name: 'v4.8.0', tag_name: 'v4.8.0', draft: true }
    vi.mocked(axios.get).mockResolvedValue({ data: [olderRelease, prerelease, draft, githubRelease] })

    const response = await getChangelog()

    expect((await response.json()).map((release: { version: string }) => release.version)).toEqual(['v4.7.13', 'v4.7.12'])
  })
})
