export type RagIndexMetadata = {
  name: string
  dim: number
  azureVectorStoreId: string
}

export type FileCitation = {
  file_id: string
  filename: string
  index: number
  type: 'file_citation'
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
