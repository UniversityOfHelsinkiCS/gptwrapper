import express from 'express'
import axios from 'axios'

import type { Release } from '@shared/changelog'
import { inCI } from '../../config'
import logger from '../util/logger'

const changelogRouter = express.Router()

const RELEASES_URL = 'https://api.github.com/repos/UniversityOfHelsinkiCS/gptwrapper/releases?per_page=20'
// 1 hour
export const CACHE_TTL_MS = 60 * 60 * 1000
// 15 minutes
export const FAILURE_COOLDOWN_MS = 15 * 60 * 1000

let cache: { releases: Release[]; fetchedAt: number } | null = null
let pendingFetch: Promise<Release[]> | null = null
let retryAfter = 0

export const resetChangelogState = () => {
  cache = null
  pendingFetch = null
  retryAfter = 0
}

const fakeReleases: Release[] = [
  {
    title: 'v0.0.2',
    version: 'v0.0.2',
    time: new Date().toISOString(),
    description: '**Feature 1**\n- Added a fancy new feature\n\n**Feature 2**\n- Fixed a bug\n- Fixed another bug',
  },
  {
    title: 'v0.0.1',
    version: 'v0.0.1',
    time: new Date().toISOString(),
    description: 'The first release ever.',
  },
]

export const getPublicDescription = (description: string) => {
  const lines = description.split('\n')
  const internalIndex = lines.findIndex((line) => line.toLowerCase().includes('internal'))

  const publicLines = internalIndex === -1 ? lines : lines.slice(0, internalIndex)

  // Drop trailing blank lines and the --- separator above the internal section
  return publicLines.join('\n').replace(/[\s-]*$/, '')
}

export const isInternalRelease = (release: Release) => release.title.trim().toLowerCase().startsWith('internal')

const fetchReleases = async (): Promise<Release[]> => {
  const { data } = await axios.get<Record<string, any>[]>(RELEASES_URL)

  return data
    .filter((release) => !release.prerelease && !release.draft)
    .map((release) => ({
      title: release.name || release.tag_name,
      version: release.tag_name,
      time: release.published_at,
      description: getPublicDescription(release.body ?? ''),
    }))
    .filter((release) => !isInternalRelease(release))
    .sort((a, b) => b.time.localeCompare(a.time))
}

// Serves stale releases when GitHub can't be reached
const sendFallback = (res: express.Response) => {
  if (cache) {
    res.send(cache.releases)
    return
  }

  res.status(503).send({ message: 'Changelog is temporarily unavailable' })
}

changelogRouter.get('/', async (_req, res) => {
  if (inCI) {
    res.send(fakeReleases)
    return
  }

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    res.send(cache.releases)
    return
  }

  if (Date.now() < retryAfter) {
    sendFallback(res)
    return
  }

  try {
    pendingFetch ??= fetchReleases().finally(() => {
      pendingFetch = null
    })
    const releases = await pendingFetch

    cache = { releases, fetchedAt: Date.now() }

    res.send(releases)
  } catch (err) {
    logger.error('Failed to fetch releases from GitHub', { err })
    retryAfter = Date.now() + FAILURE_COOLDOWN_MS

    sendFallback(res)
  }
})

export default changelogRouter
