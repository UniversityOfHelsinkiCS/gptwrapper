import type { FileData } from './loader.ts'

export type Chunk = {
  id: string
  content: string[]
  metadata?: {
    [key: string]: any
  }
}

export const createTitleChunks = (file: FileData): Chunk[] => {
  const lines = file.content.split('\n')

  const titleHierarchy = [file.fileName]
  let currentLevel = 0

  const chunkContent: string[] = []
  let title = file.fileName
  const chunks: Chunk[] = []

  for (const line of lines) {
    // Check if line starts with '#'
    if (line.startsWith('#')) {
      chunks.push({
        id: `${file.fileName}-${chunks.length}`,
        content: [...chunkContent],
        metadata: {
          title,
          titleHierarchy: [...titleHierarchy],
        },
      })

      title = line.replaceAll('#', '').trim()
      chunkContent.length = 0

      // Determine the level of the title
      const level = line.split('#').length - 1
      if (level > currentLevel) {
        // New section
        titleHierarchy.push(title)
        currentLevel = level
      } else {
        // Difference in level
        const diff = currentLevel - level
        for (let i = 0; i <= diff; i++) {
          titleHierarchy.pop()
        }
        titleHierarchy.push(title)
        currentLevel = level
      }
    }
    chunkContent.push(line)
  }

  // Add the last section
  if (chunkContent.length > 0) {
    chunks.push({
      id: `${file.fileName}-${chunks.length}`,
      content: [...chunkContent],
      metadata: {
        title,
        titleHierarchy: [...titleHierarchy],
      },
    })
  }

  return chunks
}

export const createSplittedTitleChunks = (file: FileData): Chunk[] => {
  return createTitleChunks(file).flatMap((chunk) => {
    const title = chunk.metadata?.title
    const titleHierarchy = chunk.metadata?.titleHierarchy

    return chunk.content
      .join('\n')
      .split('\n\n')
      .map((section, index) => ({
        id: `${chunk.id}-${index}`,
        content: section.split('\n'),
        metadata: {
          title: `${title} - ${index + 1}`,
          titleHierarchy: [...titleHierarchy, index + 1],
        },
      }))
  })
}

export const createStaticChunks = (file: FileData): Chunk[] => {
  const lines = file.content.split('\n').filter((line) => line.trim() !== '')

  if (lines.length <= 2) return []

  const chunks: Chunk[] = []

  for (let i = 1; i < lines.length - 1; i++) {
    const chunkContent = [
      lines[i - 1].trim(),
      lines[i].trim(),
      lines[i + 1].trim(),
    ]

    chunks.push({
      id: `${file.fileName}-${i}`,
      content: [...chunkContent],
      metadata: {
        title: `Chunk ${i}`,
      },
    })
  }

  return chunks
}
