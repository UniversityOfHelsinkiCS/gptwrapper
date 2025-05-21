export const IngestionPipelineStages = {
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
} as const

export const IngestionPipelineStageKeys = Object.keys(IngestionPipelineStages) as Array<keyof typeof IngestionPipelineStages>

export type IngestionPipelineStageKey = keyof typeof IngestionPipelineStages
