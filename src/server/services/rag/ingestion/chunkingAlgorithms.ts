import { TextData } from './textExtractor.ts'

export type Chunk = {
  id: string
  content: string[]
  metadata?: {
    [key: string]: any
  }
}

export const createTitleChunks = (file: TextData): Chunk[] => {
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
          type: file.type,
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
        type: file.type,
      },
    })
  }

  return chunks
}

export const createSplittedTitleChunks = (file: TextData): Chunk[] => {
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
          type: file.type,
        },
      }))
  })
}

export const createStaticChunks = (file: TextData, length: number = 800, overlap: number = 400): Chunk[] => {
  const content = file.content

  const chunks: Chunk[] = []

  for (let i = overlap; i < content.length - length - overlap; i += length) {
    const chunkContent = content.slice(i - overlap, i + length + overlap)
    if (chunkContent.length > 0) {
      chunks.push({
        id: `${file.fileName}-${chunks.length}`,
        content: chunkContent.split('\n'),
        metadata: {
          title: file.fileName,
          type: file.type,
        },
      })
    }
  }

  return chunks
}

export const chunkingAlgorithms = {
  static: createStaticChunks,
  title: createTitleChunks,
  splittedTitle: createSplittedTitleChunks,
}
