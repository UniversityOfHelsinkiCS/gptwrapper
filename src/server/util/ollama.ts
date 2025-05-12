import { Ollama } from 'ollama'
import { OLLAMA_HOST } from '../../config'

const MODEL_NAME = 'snowflake-arctic-embed2'

const initOllama = () => {
  try {
    const ollama = new Ollama({ host: OLLAMA_HOST })
    ollama
      .pull({
        model: MODEL_NAME,
      })
      .then(() => {
        console.log(`Model ${MODEL_NAME} pulled successfully`)
      })
      .catch((error) => {
        console.error('Error pulling model:', error)
      })
    console.log('Ollama client initialized, pulling model...')
    return ollama
  } catch (error) {
    console.error('Error initializing Ollama client:', error)
    return null
  }
}
export const ollama = initOllama()
export const getEmbedding = async (prompt: string) => {
  const response = await ollama.embed({
    model: MODEL_NAME,
    input: prompt,
  })

  return response
}
