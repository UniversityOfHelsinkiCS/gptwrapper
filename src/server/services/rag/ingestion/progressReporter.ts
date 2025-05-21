import { Readable } from 'node:stream'
import { IngestionPipelineStageKey } from '../../../../shared/constants'

export type StageReporter = {
  reportProgress: (items: string[]) => void
  reportError: (error: string, items: string[]) => void
}

export class ProgressReporter extends Readable {
  _read() {}

  reportError(stage: IngestionPipelineStageKey, items: string[], error: string) {
    this.push(JSON.stringify({ stage, error, items }) + '\n')
  }

  reportProgress(stage: IngestionPipelineStageKey, items: string[]) {
    this.push(JSON.stringify({ stage, items }) + '\n')
  }
}
