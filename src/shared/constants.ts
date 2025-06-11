export const IngestionPipelineStages = {
  pending: {
    name: 'Pending',
  },
  upload: {
    name: 'Uploading',
  },
  readFiles: {
    name: 'Read files',
  },
  extractText: {
    name: 'Extract text',
  },
  chunk: {
    name: 'Generate chunks',
  },
  embed: {
    name: 'Generate embeddings',
  },
  store: {
    name: 'Save to database',
  },
  completed: {
    name: 'Completed',
  },
  deleting: {
    name: 'Being deleted',
  },
} as const

export const IngestionPipelineStageKeys = Object.keys(IngestionPipelineStages) as Array<keyof typeof IngestionPipelineStages>

export type IngestionPipelineStageKey = keyof typeof IngestionPipelineStages
