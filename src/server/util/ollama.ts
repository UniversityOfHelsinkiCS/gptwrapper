import { Ollama } from 'ollama'
import { LAAMA_API_TOKEN, LAAMA_API_URL, OLLAMA_URL } from './config'
import OpenAI from 'openai'

export const getOllamaClient = () =>
  new Ollama({
    host: LAAMA_API_URL,
    headers: {
      token: LAAMA_API_TOKEN,
    },
  })

export const getOllamaOpenAIClient = () =>
  new OpenAI({
    apiKey: 'NOT_NEEDED',
    baseURL: OLLAMA_URL,
  })
