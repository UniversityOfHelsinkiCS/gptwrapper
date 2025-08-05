import { z } from 'zod/v4'

export const UserPreferencesSchema = z.object({
  chatVersion: z.number().min(1).max(2).default(1),
})

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
}
