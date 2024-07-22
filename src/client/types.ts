export type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export type Role = 'system' | 'assistant' | 'user'

export interface Message {
  role: Role
  content: string
}

export interface User {
  id: string
  username: string
  language?: string
  iamGroups: string[]
  email?: string
  isAdmin: boolean
  isPowerUser: boolean
  usage: number
  activeCourseIds: string[]
  ownCourses: string[]
  hasIamAccess?: boolean
}

export type Prompt = {
  id: string
  name: string
  chatInstanceId: string
  systemMessage: string
  messages: Message[]
  hidden: boolean
}

export interface ChatInstance {
  id: string
  name: Locales
  description: string
  model: string
  usageLimit: number
  resetCron?: string
  courseId?: string
  prompts: Prompt[]
}

export interface AccessGroup {
  id: string
  iamGroup: string
  model: string
  usageLimit: number | null
  resetCron: string | null
}

export type ActivityPeriod = {
  startDate: string
  endDate: string
}

export interface Course extends ChatInstance {
  activityPeriod: ActivityPeriod
  prompts: Prompt[]
}

export type ChatInstanceUsage = {
  id: string
  usageCount: number
  user: User
  chatInstance: ChatInstance
}

export type UserStatus = {
  model: string
  models: string[]
  usage: number
  limit: number
  isTike: boolean
}

export type InfoText = {
  id: string
  name: string
  text: Locales
}

export type Locales = {
  fi: string
  en: string
  sv: string
}

export interface Faculty {
  code: string
  name: Locales
  iams: string[]
}
