import { Readable } from 'node:stream'

export type StageReporter = {
  reportProgress: (items: string[]) => void
  reportError: (error: string, items: string[]) => void
  reportDone: () => void
}

export class ProgressReporter extends Readable {
  _read() {}

  reportError(error: string) {
    this.push(JSON.stringify({ error }) + '\n')
  }

  getStageReporter(stageName: string, idx: number): StageReporter {
    return {
      reportProgress: (items: string[]) => {
        this.push(JSON.stringify({ stage: stageName, items, idx }) + '\n')
      },
      reportError: (error: string, items: string[]) => {
        this.push(JSON.stringify({ stage: stageName, error, items }) + '\n')
      },
      reportDone: () => {
        this.push(JSON.stringify({ stage: stageName, done: true }) + '\n')
      },
    }
  }
}
