import { z } from 'zod/v4'

export const UserPreferencesSchema = z
  .object({
    sendShortcutMode: z.enum(['shift+enter', 'enter']).default('shift+enter'),
    skipNewConversationConfirm: z.boolean().default(false),
  })
  .partial()

export type UserPreferences = z.infer<typeof UserPreferencesSchema>

export interface User {
  id: string
  username: string
  language?: string
  iamGroups: string[]
  email?: string
  isAdmin: boolean
  isPowerUser: boolean
  activeCourseIds?: string[]
  ownCourses?: string[]
  usage?: number
  isStatsViewer: boolean
  preferences?: UserPreferences
  lastLoggedInAt?: Date
  serverVersion?: string
}
