export const IngestionPipelineStages = {
  pending: {
    name: 'Pending',
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
} as const

export const IngestionPipelineStageKeys = Object.keys(IngestionPipelineStages) as Array<keyof typeof IngestionPipelineStages>

export type IngestionPipelineStageKey = keyof typeof IngestionPipelineStages
