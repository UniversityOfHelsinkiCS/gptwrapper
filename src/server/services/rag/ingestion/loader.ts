import { readdir, readFile, stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { StageReporter } from './progressReporter';

export type FileData = { fileName: string; type: 'text' | 'md'; content: string } | { fileName: string; type: 'pdf'; content: Buffer }

async function* loadFiles(loadpath: string): AsyncGenerator<FileData> {
  // Check if the path is a file
  const stats = await stat(loadpath)
  if (!stats.isDirectory()) {
    yield await loadFile(loadpath)
    return
  }

  // Recursively read all files in the directory
  const files = await readdir(loadpath, { withFileTypes: true })

  for (const file of files) {
    if (file.isDirectory()) {
      return loadFiles(`${loadpath}/${file.name}`)
    } else if (file.isFile()) {
      const filePath = `${loadpath}/${file.name}`
      console.log(`Loading file: ${filePath}`)
      yield await loadFile(filePath)
    }
  }
}

const loadFile = async (filePath: string): Promise<FileData> => {
  const extension = filePath.split('.').pop()
  const fileName = filePath.split('/').pop() || 'unknown'

  if (extension === 'pdf') {
    const content = await readFile(filePath)
    return {
      fileName,
      content,
      type: 'pdf',
    }
  }

  const content = await readFile(filePath, 'utf-8')
  return {
    fileName,
    content,
    type: extension === 'md' ? 'md' : 'text',
  }
}

export class FileLoader extends Readable {
  private files: AsyncGenerator<FileData>
  public progressReporter: StageReporter

  constructor(loadpath: string) {
    super({ objectMode: true })
    this.files = loadFiles(loadpath)
  }

  _read() {
    this.files.next().then((file) => {
      if (file.done) {
        this.push(null)
        this.progressReporter.reportDone()
      } else {
        this.push(file.value)
        this.progressReporter.reportProgress(file.value.fileName)
      }
    })
  }
}
