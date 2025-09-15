export const IngestionPipelineStages = {
  uploaded: 'Uploaded',
  parsed: 'Parsed',
  completed: 'Completed',
  error: 'Error',
} as const

export const IngestionPipelineStageKeys = Object.keys(IngestionPipelineStages) as Array<keyof typeof IngestionPipelineStages>

export type IngestionPipelineStageKey = keyof typeof IngestionPipelineStages
