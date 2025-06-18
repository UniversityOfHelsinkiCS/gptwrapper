import type { ResponseFileSearchToolCall } from 'openai/resources/responses/responses'
import { IngestionPipelineStageKey } from './constants'
import type { VectorStoreFile } from 'openai/resources/vector-stores/files'

export type RagIndexMetadata = {
  name: string
  dim?: number
  azureVectorStoreId: string
  instructions?: string
}

export type RagFileMetadata = {
  chunkingStrategy?: VectorStoreFile['chunking_strategy']['type']
  vectorStoreFileId?: string
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
  ragFileCount: number
  ragFiles?: RagFileAttributes[]
}

export type FileCitation = {
  file_id: string
  filename: string
  index: number
  type: 'file_citation'
}

export type FileSearchResult = ResponseFileSearchToolCall & {
  ragIndexId: number
}

export type ResponseStreamEventData =
  | {
      type: 'start'
      vectorStoreId: string | null
    }
  | {
      type: 'writing'
      text: string
    }
  | {
      type: 'complete'
      prevResponseId: string
    }
  | {
      type: 'fileSearchStarted'
    }
  | {
      type: 'fileSearchDone'
      fileSearch: FileSearchResult
    }
  | {
      type: 'fileSearchError'
      error: any
    }
  | {
      type: 'streamError'
      error: any
    }
  | {
      type: 'timeoutError'
      error: any
    }
  | {
      type: 'error'
      error: any
    }
  | {
      type: 'annotation'
      annotation: FileCitation
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
