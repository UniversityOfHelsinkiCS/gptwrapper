import type { ResponseFileSearchToolCall } from 'openai/resources/responses/responses'

export type RagIndexMetadata = {
  name: string
  dim?: number
  azureVectorStoreId: string
  instructions?: string
}

export type RagFileAttributes = {
  id: number
  filename: string
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

export type FileSearchResult = ResponseFileSearchToolCall

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
      type: 'fileSearchDone'
      fileSearch: FileSearchResult
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
