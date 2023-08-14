import OpenAI from 'openai'

import { StreamingOptions, OpenAIStream, APIError } from '../types'
import { OPENAI_API_KEY, TIKE_OPENAI_API_KEY } from './config'
import logger from './logger'

const defaultApi = new OpenAI({
  apiKey: OPENAI_API_KEY,
})

const tikeApi = new OpenAI({
  apiKey: TIKE_OPENAI_API_KEY,
})

export const completionStream = async (
  options: StreamingOptions,
  isTike: boolean
): Promise<OpenAIStream | APIError> => {
  try {
    const openai = isTike ? tikeApi : defaultApi

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
