import { IncomingMessage } from 'http'

import { Configuration, OpenAIApi, CreateChatCompletionRequest } from 'openai'

import { ApiError, ApiResponse } from '../types'
import { OPENAI_API_KEY, TIKE_OPENAI_API_KEY } from './config'
import { inProduction } from '../../config'
import logger from './logger'

const defaultConfiguration = new Configuration({
  apiKey: OPENAI_API_KEY,
})

const tikeConfiguration = new Configuration({
  apiKey: TIKE_OPENAI_API_KEY,
})

const defaultApi = new OpenAIApi(defaultConfiguration)

const tikeApi = new OpenAIApi(tikeConfiguration)

export const createCompletion = async (
  options: CreateChatCompletionRequest
): Promise<ApiResponse> => {
  try {
    const { data } = await defaultApi.createChatCompletion(options)

    // Response data is not logged in production for privacy reasons
    if (!inProduction) logger.info('OpenAI API response', { data })

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

export const completionStream = async (
  options: CreateChatCompletionRequest,
  isTike: boolean
): Promise<IncomingMessage | ApiError> => {
  try {
    const openai = isTike ? tikeApi : defaultApi

    const response = await openai.createChatCompletion(options, {
      responseType: 'stream',
    })

    const stream = response.data as unknown as IncomingMessage

    return stream
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
