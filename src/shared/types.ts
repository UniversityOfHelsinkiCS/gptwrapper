import type { IngestionPipelineStageKey } from './ingestion'
import type { MessageContent, MessageGenerationInfo } from './chat'

export type Locales = {
  fi: string
  en: string
  sv: string
}

export type RagIndexMetadata = {
  name: string
  toolDescription?: string
  language?: 'Finnish' | 'English' | 'Swedish'
}

export type RagFileMetadata = {
  usageBytes?: number
  message?: string
  eta?: number
  advancedParsing?: boolean
}

export type RagFileAttributes = {
  id: number
  filename: string
  createdAt: string
  updatedAt: string
  ragIndexId: number
  pipelineStage: IngestionPipelineStageKey
  progress: number | null
  fileType: string
  fileSize: number
  numChunks: number | null
  userId: string
  metadata: Record<string, unknown> | null
  error: string | null
  message: string | null
}

export type RagIndexAttributes = {
  id: number
  createdAt: string
  updatedAt: string
  metadata: RagIndexMetadata
  ragFileCount?: number
  ragFiles?: RagFileAttributes[]
  chatInstances?: {
    id: string
    courseId: string
  }[]
}

export type Discussion = {
  id: string
  userId: string
  courseId: string
  response: string
  metadata: {
    generationInfo: MessageGenerationInfo
    chatMessages: {
      role: string
      content: string | MessageContent[]
    }[]
  }
  createdAt: string
}

export type Release = {
  description: string
  time: string
  title: string
  version: string
}

export interface Term {
  label: Locales
  id: number
  startDate: string
  endDate: string
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
  enrollmentCount: number
  usedTokens: number
  promptCount: number
  ragIndicesCount: number
  saveDiscussions?: boolean
}

export type CourseUsage = {
  courseId: string | null
  name: Locales
  usage: number
  limit: number
  activated: boolean
}

export interface ChatInstanceSearchResult {
  /** chatInstance.courseId (the Course Unit Realisation id), which /courses/:id expects */
  id: string
  name: Locales
  /** human interpretable course codes, e.g. ['TKT-01001'] */
  codes: string[]
  terms: Term[]
  saveDiscussions: boolean
}

export interface ChatInstanceSearchResponse {
  results: ChatInstanceSearchResult[]
  count: number
}

export interface CourseParticipant {
  id: string
  username: string
  firstNames: string | null
  lastName: string | null
  studentNumber: string | null
  role: 'teacher' | 'student'
  /** UserChatInstanceUsage id, null if the user has not used the course chat */
  courseUsageId: string | null
  /** current course usage, gets reset */
  courseUsage: number
  /** cumulative course usage, never reset */
  courseTotalUsage: number
  /** current general usage (User.usage), gets reset */
  usage: number
  /** names of the API keys the user has created */
  apiKeyNames: string[]
}

export interface CourseParticipantsResponse {
  course: {
    courseId: string
    name: Locales
    usageLimit: number
  }
  participants: CourseParticipant[]
}

export interface ApiUser {
  id: string
  username: string
  firstNames: string | null
  lastName: string | null
  studentNumber: string | null
  /** current general usage (User.usage), gets reset */
  usage: number
  /** names of the API keys the user has created */
  apiKeyNames: string[]
}
// State of the course, not about a user.
export type ChatStatus = 'NOT_STARTED' | 'EXPIRED' | 'ACTIVATED' | 'NOT_ACTIVATED'
// What this user can do. A fact about a pair.
export type AccessLevel = 'FULL' | 'STUDENT' | 'STUDENT_CLOSED'
