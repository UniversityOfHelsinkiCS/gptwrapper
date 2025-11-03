import { ValidModelName } from '../config'
import type { ChatMessage } from '@shared/chat'
import { Locale } from '@shared/lang'
import { Locales, Statistic, Term } from '@shared/types'
import type { UserPreferences } from '@shared/user'

/*
 * Important: This file contains types used in the client, but we should consider moving them to shared.
 * Before adding new types, consider whether they are already defined in shared or if they should be moved there.
 */

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export interface StatisticResponse {
  data: Statistic[]
  terms: Term[]
}

export interface User {
  id: string
  username: string
  language?: keyof Locale
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
  termsAcceptedAt?: string | null
  preferences?: UserPreferences
  serverVersion?: string
}

export type Prompt = {
  id: string
  name: string
  chatInstanceId: string
  systemMessage: string
  messages: ChatMessage[]
  hidden: boolean
  type: 'CHAT_INSTANCE' | 'PERSONAL'
  createdAt: string
  ragIndexId?: number
  model?: ValidModelName
  temperature?: number
}

export interface ChatInstance {
  promptCount?: number
  id: string
  name: Locales
  description: string
  usageLimit: number
  resetCron?: string
  courseId?: string
  prompts: Prompt[]
  courseUnitRealisationTypeUrn?: string
  activityPeriod: ActivityPeriod
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

export interface Responsebility {
  id: string
  createdByUserId: string | null
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
  usage: number
  limit: number
}

export type InfoText = {
  id: string
  name: string
  text: Locales
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

export type ModalInjectedProps = {
  closeModal: () => void
  nextModal: (modalId: string) => void
}

export type ModalEntry<P = any> = {
  name: string
  component: React.ComponentType<P & ModalInjectedProps>
  props?: Record<string, any>
}

export type ModalMap = Record<string, ModalEntry<any>>
