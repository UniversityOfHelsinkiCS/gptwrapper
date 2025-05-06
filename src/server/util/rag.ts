import { readFile, readdir } from 'node:fs/promises'
import {
  createIndex,
  existsDocument,
  insertDocument,
  searchEmbedding,
} from './redisEmbedding'

/**
 * Reads all markdown documents from directory ./data, splits them into chunks,
 * and inserts them into Redis with embeddings.
 */
export const initRag = async () => {
  // 1. Create a vector index for your documents
  await createIndex()

  // 2. Read all markdown documents from the directory
  const files = await readdir('./data')
  console.log('Files:', files)

  // Limit to first file
  // const filesDev = files.slice(0, 1)

  for (const file of files) {
    const filePath = `./data/${file}`
    const fileContent = await readFile(filePath, 'utf-8')

    const lines = fileContent.split('\n')

    const section = []
    let title = file
    const sections = []

    for (const line of lines) {
      // Check if line starts with '#'
      if (line.startsWith('#')) {
        const content = section.join('\n')
        if (content.length > 0) {
          sections.push({
            id: `${file}-${sections.length}`,
            title,
            content,
          })
        }
        title = line.replace('#', '').trim()
        section.length = 0
      }
      section.push(line)
    }

    // Add the last section
    if (section.length > 0) {
      const content = section.join('\n')
      sections.push({
        id: `${file}-${sections.length}`,
        title: 'Last Section',
        content,
      })
    }

    // 3. Insert each section into Redis with embeddings
    for (const section of sections) {
      const { id, title, content } = section
      if (await existsDocument(id)) {
        console.log(`Document ${id} already exists, skipping...`)
      } else {
        console.log(`Inserting document ${id}...`)
        await insertDocument(id, title, content)
      }
    }
  }

  await searchEmbedding('What is the purpose of this document?')
}

export const searchRag = async (prompt: string) => {
  const res = await searchEmbedding(prompt)
  return res
}
