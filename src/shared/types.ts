import type { IngestionPipelineStageKey } from './constants'
import type { ChatToolDef } from './tools'

export type RagIndexMetadata = {
  name: string
  instructions?: string
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

export type FileCitation = {
  file_id: string
  filename: string
  index: number
  type: 'file_citation'
}

export type FileSearchCompletedData = {
  status: string
  id: string
  queries: string[]
  searchedFileNames: string[]
  ragIndexId: number
}

export type FileSearchResultData = Record<string, unknown>

export type ResponseStreamEventData =
  | {
      type: 'writing'
      text: string
    }
  | {
      type: 'complete'
      prevResponseId: string // Not yet sure what to put here in v3
    }
  | ({
      type: 'toolCallStarting'
      id: string
    } & Pick<ChatToolDef, 'name'>)
  | ({
      type: 'toolCallStarted'
      id: string
    } & Pick<ChatToolDef, 'name' | 'input'>)
  | ({
      type: 'toolCallCompleted'
      id: string
    } & Pick<ChatToolDef, 'name' | 'artifacts'>)
  | {
      type: 'error'
      error: string
    }

export interface CourseAssistant {
  course_id: string | null
  name: string
  assistant_instruction: string
  vector_store_id: string | null
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
