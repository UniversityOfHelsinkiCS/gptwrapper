export type RagIndexMetadata = {
  name: string
  dim: number
}

export type FileCitation = {
  file_id: string
  filename: string
  index: number
  type: 'file_citation'
}

export type ResponseStreamEventData =
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
