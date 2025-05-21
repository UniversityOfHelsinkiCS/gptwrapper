import type { FileData } from './loader.ts'
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { pdfToText } from '../../../util/pdfToText.ts'

export type TextData = {
  fileName: string
  content: string
  type: 'text' | 'md' | 'pdf'
  chunkingStrategy: 'static' | 'title' | 'splittedTitle'
}

export async function extractTextFromFileData(data: FileData, cachePath: string): Promise<TextData> {
  const textsDir = cachePath + '/texts'
  mkdirSync(textsDir, { recursive: true })

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

  // Save text data to cache
  const textPath = `${textsDir}/${data.fileName}.txt`
  await writeFile(textPath, textContent, 'utf-8')

  return textData
}
