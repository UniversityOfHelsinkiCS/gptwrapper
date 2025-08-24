import type { IngestionPipelineStageKey } from './constants'

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
}

export type Locale = {
  fi?: string
  en?: string
  sv?: string
}

export type Discussion = {
  id: string
  userId: string
  courseId: string
  response: string
  metadata: {
    model: string
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
