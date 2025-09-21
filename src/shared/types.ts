import { ValidModelName } from '../config'
import type { IngestionPipelineStageKey } from './ingestion'

export type Locales = {
  fi: string
  en: string
  sv: string
}

export type RagIndexMetadata = {
  name: string
  toolDescription?: string
  language?: 'Finnish' | 'English'
}

export type RagFileMetadata = {
  usageBytes?: number
}

export type RagFileAttributes = {
  id: number
  filename: string
  createdAt: string
  updatedAt: string
  ragIndexId: number
  pipelineStage: IngestionPipelineStageKey
  fileType: string
  fileSize: number
  numChunks: number | null
  userId: string
  metadata: Record<string, unknown> | null
  error: string | null
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
    model: ValidModelName
    messages: {
      role: string
      content: string
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
  ragIndicesCount: number
}
