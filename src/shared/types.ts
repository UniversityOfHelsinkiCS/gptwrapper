export type RagIndexMetadata = {
  name: string
  dim: number
}

export type ResponseStreamValue = {
  status: 'writing' | 'complete' | 'error'
  text: string | null
  prevResponseId: string | null
}
