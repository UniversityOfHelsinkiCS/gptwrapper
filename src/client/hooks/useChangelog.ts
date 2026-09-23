import type { Release } from '@shared/changelog'
import { useGetQuery } from './apiHooks'
import useCurrentUser from './useCurrentUser'

export const changelogQueryKey = ['changelog']

export const useChangelog = () => {
  const { data: releases, ...rest } = useGetQuery<Release[]>({
    queryKey: changelogQueryKey,
    url: '/changelog',
    // 1 hour
    staleTime: 60 * 60 * 1000,
  })

  return { releases: releases || [], ...rest }
}

export const useHasUnseenReleases = () => {
  const { releases } = useChangelog()
  const { user } = useCurrentUser()

  const latestRelease = releases[0]
  if (!latestRelease) return false

  const lastSeenChangelogAt = user?.preferences?.lastSeenChangelogAt
  if (!lastSeenChangelogAt) return true

  return new Date(latestRelease.time) > new Date(lastSeenChangelogAt)
}