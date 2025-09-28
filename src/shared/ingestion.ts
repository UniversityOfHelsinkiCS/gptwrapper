export const IngestionPipelineStages = {
  ingesting: 'Ingesting',
  completed: 'Completed',
  error: 'Error',
} as const

export const IngestionPipelineStageKeys = Object.keys(IngestionPipelineStages) as Array<keyof typeof IngestionPipelineStages>

export type IngestionPipelineStageKey = keyof typeof IngestionPipelineStages

export type IngestionJobStatus = {
  ragFileId: number
  progress: number | null
  eta: number | null
  message?: string
  pipelineStage: IngestionPipelineStageKey
  error?: string | null
}
