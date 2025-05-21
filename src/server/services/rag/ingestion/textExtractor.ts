import { Transform } from 'node:stream'
import type { FileData } from './loader.ts'
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { pdfToText } from '../../../util/pdfToText.ts'
import { StageReporter } from './progressReporter.ts'
import { TransformCallback } from 'stream'

export type TextData = {
  fileName: string
  content: string
  type: 'text' | 'md' | 'pdf'
  chunkingStrategy: 'static' | 'title' | 'splittedTitle'
}

export class TextExtractor extends Transform {
  private cachePath: string
  public progressReporter: StageReporter

  constructor(cachePath: string) {
    super({ objectMode: true })

    this.cachePath = cachePath + '/texts'

    // Make sure the cache path exists
    mkdirSync(this.cachePath, { recursive: true })
  }

  async _transform(data: FileData, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    let textContent = data.type === 'text' ? data.content : ''

    if (data.type === 'pdf') {
      textContent = await pdfToText(data.content)
    }

    const textData: TextData = {
      fileName: data.fileName,
      content: textContent,
      type: data.type,
      chunkingStrategy: data.type === 'pdf' ? 'static' : 'title',
    }

    this.push(textData)

    // Save text data to cache
    const textPath = `${this.cachePath}/${data.fileName}.txt`
    await writeFile(textPath, textContent, 'utf-8')

    this.progressReporter.reportProgress([data.fileName])

    callback()
  }

  _flush(callback: TransformCallback): void {
    this.progressReporter.reportDone()
    callback()
  }
}
