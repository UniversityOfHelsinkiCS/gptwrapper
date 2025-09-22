export const IngestionPipelineStages = {
  uploading: 'Uploading',
  parsing: 'Scanning',
  embedding: 'Creating embeddings',
  storing: 'Storing',
  completed: 'Completed',
  error: 'Error',
} as const

export const IngestionPipelineStageKeys = Object.keys(IngestionPipelineStages) as Array<keyof typeof IngestionPipelineStages>

export type IngestionPipelineStageKey = keyof typeof IngestionPipelineStages
