import { readdir, readFile, stat } from 'node:fs/promises'

export type FileData = { fileName: string; type: 'text' | 'md'; content: string } | { fileName: string; type: 'pdf'; content: Buffer }

export async function loadFiles(loadpath: string, callback: (fileData: FileData) => void) {
  // Check if the path is a file
  const stats = await stat(loadpath)
  if (!stats.isDirectory()) {
    loadFile(loadpath).then(callback)
    return
  }

  // Recursively read all files in the directory
  const files = await readdir(loadpath, { withFileTypes: true })

  for (const file of files) {
    if (file.isDirectory()) {
      return loadFiles(`${loadpath}/${file.name}`, callback)
    } else if (file.isFile()) {
      const filePath = `${loadpath}/${file.name}`
      console.log(`Loading file: ${filePath}`)
      loadFile(filePath).then(callback)
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
