import type { User } from '../types'

export type ContentView = 'loading' | 'error' | 'redirect' | 'content'

export const getRedirect = (user: User | null | undefined) => {
  if (!user) return '/noaccess'
  // All authenticated users now have access to general chat
  return '/general'
}

export const resolveContentView = ({
  isLoading,
  isError,
  user,
  onNoAccessPage,
}: {
  isLoading: boolean
  isError: boolean
  user: User | null | undefined
  onNoAccessPage: boolean
}): ContentView => {
  if (onNoAccessPage) return 'content'
  if (isLoading) return 'loading'
  if (isError && !user) return 'error'
  if (!user) return 'redirect'

  return 'content'
}
