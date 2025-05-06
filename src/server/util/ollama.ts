import { Ollama } from 'ollama'
import { OLLAMA_HOST } from '../../config'

const MODEL_NAME = 'snowflake-arctic-embed2'

const ollama = new Ollama({ host: OLLAMA_HOST })
/*
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
*/
console.log('Ollama client initialized')

export const getEmbedding = async (prompt: string) => {
  const response = await ollama.embed({
    model: MODEL_NAME,
    input: prompt,
  })

  return response
}
