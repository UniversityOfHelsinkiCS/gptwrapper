import { Ollama } from 'ollama'

const ollama = new Ollama({ host: 'http://ollama:11434' })

ollama
  .pull({
    model: 'nomic-embed-text',
  })
  .then(() => {
    console.log('Model nomic-embed-text pulled successfully')
  })
  .catch((error) => {
    console.error('Error pulling model nomic-embed-text:', error)
  })
console.log('Ollama client initialized, pulling model...')

export const getEmbedding = async (prompt: string) => {
  const response = await ollama.embeddings({
    model: 'nomic-embed-text',
    prompt,
  })

  return response
}
