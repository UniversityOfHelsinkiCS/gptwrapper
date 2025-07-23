import axios from 'axios'
import { type Request, type Response, Router } from 'express'
import { inDevelopment } from '../../config'
import type { Release } from '../../shared/types'

const router = Router()

const changelog: { data?: Release[] } = {}

let isApiError = false

export type ChangelogResBody = Release[]

router.get('/', async (_req: Request, res: Response) => {
  if (changelog.data) {
    res.status(200).send(changelog.data)
    return
  }
  if (inDevelopment) {
    const fakeRelease: Release[] = [
      {
        description: '**Feature 1**\n- Added a fancy new feature \n\n**Feature 2**\n- Fixed a bug\n- Fixed another bug',
        title: 'Release 3',
        time: new Date().toISOString(),
        version: '0.0.3',
      },
      {
        description: "Let's not spam the GitHub API in development!",
        title: 'Release 2',
        time: new Date().toISOString(),
        version: '0.0.2',
      },
      {
        description: 'This release should not be visible on the frontpage',
        title: 'Release 1',
        time: new Date().toISOString(),
        version: '0.0.1',
      },
    ]
    res.status(200).json(fakeRelease)
    return
  }

  try {
    // If github api is erroring, do not try again.
    if (isApiError) {
      res.status(200).json([])
      return
    }

    const response = await axios.get('https://api.github.com/repos/UniversityOfHelsinkiCS/gptwrapper/releases')
    const releasesFromAPI: Release[] = response.data.map((release: Record<string, any>) => ({
      description: release.body,
      time: release.published_at,
      title: release.name,
      version: release.tag_name,
    }))
    changelog.data = releasesFromAPI
    res.status(200).json(releasesFromAPI)
  } catch (error) {
    console.error(error)
    isApiError = true
    res.status(200).json([])
  }
})

export default router
