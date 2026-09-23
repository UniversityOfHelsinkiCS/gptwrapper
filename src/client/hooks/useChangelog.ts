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

export const useUnseenReleasesCount = () => {
  const { releases } = useChangelog()
  const { user } = useCurrentUser()

  const lastSeenChangelogAt = user?.preferences?.lastSeenChangelogAt
  // if user has never seen changelog display 1 unseen release.
  if (!lastSeenChangelogAt) return 1

  const lastSeen = new Date(lastSeenChangelogAt)
  return releases.filter((release) => new Date(release.time) > lastSeen).length
}

export const useHasUnseenReleases = () => useUnseenReleasesCount() > 0