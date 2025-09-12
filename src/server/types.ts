import { Request } from 'express'
import { ChatRequestMessage, GetChatCompletionsOptions } from '@azure/openai'
import type { User } from '@shared/user'
import type { ValidModelName } from '@config'

export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>

export interface RequestWithUser extends Request {
  user: User
  hijackedBy?: User
}

export interface CustomMessage {
  role: Role
  content: string
}
export type Role = 'system' | 'assistant' | 'user'

export type AzureOptions = {
  model: ValidModelName
  messages: ChatRequestMessage[]
  options: GetChatCompletionsOptions
}

export interface ChatInstance {
  id: string
  name: Locales
  description: string
  usageLimit: number
  activityPeriod: ActivityPeriod
}

export type ActivityPeriod = {
  startDate: string
  endDate: string
}

export type CourseUnitRealisation = {
  id: string
  name: Locales
  nameSpecifier: object
  activityPeriod: ActivityPeriod
}

export type Enrollment = {
  id: string
  personId: string
  state: string
  courseUnitRealisation: CourseUnitRealisation
}

export type Locales = {
  fi: string
  en: string
  sv: string
}

export interface CourseUnit {
  code: string
  organisations: {
    id: string
    code: string
    name: {
      en: string
      fi: string
      sv: string
    }
  }[]
}

type Programme = {
  key: string
  name: Locales
  level: string
  companionFaculties: Array<string>
  international: boolean
}

export interface OrganisationData {
  code: string
  name: Locales
  programmes: Array<Programme>
}

export interface SisuCourseUnit {
  id: string
  name: Locales
  validityPeriod: ActivityPeriod
}
export interface SisuResponsibilityInfo {
  roleUrn: string
  personId: string
}

export interface SisuCourseWithRealization {
  id: string
  courseUnitRealisationTypeUrn: string
  flowState: string
  courseUnits: SisuCourseUnit[]
  name: Locales
  activityPeriod: ActivityPeriod
  responsibilityInfos: SisuResponsibilityInfo[]
}

export interface ResponsibilityRow {
  id?: string
  chatInstanceId: string
  userId: string
}
