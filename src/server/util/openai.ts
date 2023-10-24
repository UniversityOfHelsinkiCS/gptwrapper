import OpenAI from 'openai'

import { StreamingOptions, OpenAIStream, APIError } from '../types'
import { TIKE_OPENAI_API_KEY } from './config'
import logger from './logger'

const openai = new OpenAI({
  apiKey: TIKE_OPENAI_API_KEY,
})

export const completionStream = async (
  options: StreamingOptions
): Promise<OpenAIStream | APIError> => {
  try {
    const stream = await openai.chat.completions.create(options)

    return stream
  } catch (error: any) {
    if (error instanceof OpenAI.APIError) {
      const { status, message, code, type } = error
      logger.error('OpenAI API error', { status, message, code, type })
    } else {
      logger.error(error)
    }

    return error
  }
}
