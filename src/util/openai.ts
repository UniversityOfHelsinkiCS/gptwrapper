import { Configuration, OpenAIApi, CreateChatCompletionRequest } from 'openai'

import { ApiResponse } from '../types'
import { OPENAI_API_KEY } from './config'
import logger from './logger'

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
})

export const openai = new OpenAIApi(configuration)

export const createCompletion = async (
  options: CreateChatCompletionRequest
): Promise<ApiResponse> => {
  try {
    const { data } = await openai.createChatCompletion(options)

    logger.info('OpenAI API response', { data })

    return data
  } catch (err: any) {
    const error = err.response
      ? {
          status: err.response.status,
          error: err.response.data,
        }
      : {
          error: err.message,
        }

    logger.error('OpenAI API error', { error })

    return error
  }
}
