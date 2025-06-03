import { FileSearchResult } from "../shared/types"

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export type Role = 'system' | 'assistant' | 'user'

export interface Message {
  role: Role
  content: string
  fileSearchResult?: FileSearchResult
}

interface Term {
  label: Locales[]
  id: number
}
export interface Statistic {
  startDate: string
  endDate: string
  terms: Term[]
  id: string
  name: Locales
  codes: string[]
  programmes: string[]
  students: number
  usedTokens: number
  promptCount: number
}

export interface StatisticResponse {
  data: Statistic[]
  terms: Term[]
}

export interface User {
  id: string
  username: string
  language?: string
  iamGroups: string[]
  email?: string
  firstNames: string
  lastName: string
  primaryEmail: string
  studentNumber: string
  isAdmin: boolean
  isPowerUser: boolean
  usage: number
  activeCourseIds: string[]
  ownCourses: string[]
  hasIamAccess?: boolean
  lastRestart: string
  enrolledCourses: ChatInstance[]
  isStatsViewer: boolean
}

export type Prompt = {
  id: string
  name: string
  chatInstanceId: string
  systemMessage: string
  messages: Message[]
  hidden: boolean
  mandatory: boolean
}

export interface ChatInstance {
  promptCount?: number
  id: string
  name: Locales
  description: string
  model: string
  usageLimit: number
  resetCron?: string
  courseId?: string
  prompts: Prompt[]
  courseUnitRealisationTypeUrn?: string
  activityPeriod: ActivityPeriod
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

export interface Enrolment {
  id: string
  user: {
    id: string
    username: string
    last_name: string
    first_names: string
    student_number: string
  }
}

interface Responsebility {
  id: string
  user: {
    id: string
    username: string
    last_name: string
    first_names: string
  }
}

export interface CourseUnit {
  id: string
  name: Locales
  code: string
}

export interface Course extends ChatInstance {
  activityPeriod: ActivityPeriod
  prompts: Prompt[]
  enrolments: Enrolment[]
  responsibilities: Responsebility[]
  courseUnits: CourseUnit[]
  saveDiscussions: boolean
  notOptoutSaving: boolean
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

export interface CourseStatistics {
  average: number
  usagePercentage: number
  usages: {
    id: string
    usageCount: number
    userId: string
    chatInstanceId: string
    dataValues: {
      userId: string
    }
  }[]
}
