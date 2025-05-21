import { OLLAMA_URL } from '../../config'
import OpenAI from 'openai'

export const getOllamaOpenAIClient = () =>
  new OpenAI({
    apiKey: 'NOT_NEEDED',
    baseURL: OLLAMA_URL,
  })
