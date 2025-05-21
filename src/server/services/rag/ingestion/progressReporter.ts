import { Readable } from 'node:stream'

export type StageReporter = {
  reportProgress: (item: string) => void
  reportError: (error: string) => void
  reportDone: () => void
}

export class ProgressReporter extends Readable {
  _read() {}

  getStageReporter(stageName: string): StageReporter {
    return {
      reportProgress: (item: string) => {
        this.push(JSON.stringify({ stage: stageName, item }) + '\n')
      },
      reportError: (error: string) => {
        this.push(JSON.stringify({ stage: stageName, error }) + '\n')
      },
      reportDone: () => {
        this.push(JSON.stringify({ stage: stageName, done: true }) + '\n')
      },
    }
  }
}
