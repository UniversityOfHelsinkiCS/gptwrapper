import type { User } from '../types'

export type ContentView = 'loading' | 'error' | 'redirect' | 'nothing' | 'content'

const hasAccess = (user: User | null | undefined, courseId?: string) => {
  if (!user) return false
  if (user.isAdmin) return true
  if (courseId && !user.activeCourseIds.includes(courseId) && courseId !== 'general') {
    return false
  }

  if (!courseId && window.location.pathname.endsWith('/chats')) return true
  // All authenticated users now have access to general chat

  return true
}

export const getRedirect = (user: User | null | undefined) => {
  if (!user) return '/noaccess'
  // All authenticated users now have access to general chat
  return '/general'
}

export const resolveContentView = ({
  isLoading,
  isError,
  user,
  courseId,
  onNoAccessPage,
}: {
  isLoading: boolean
  isError: boolean
  user: User | null | undefined
  courseId?: string
  onNoAccessPage: boolean
}): ContentView => {
  if (onNoAccessPage) return 'content'
  if (isLoading) return 'loading'
  if (isError && !user) return 'error'
  if (!hasAccess(user, courseId)) return 'redirect'
  if (!user) return 'nothing'

  return 'content'
}
