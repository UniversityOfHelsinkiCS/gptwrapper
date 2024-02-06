import OpenAI from 'openai'
import { ChatCompletionChunk } from 'openai/resources/chat'
import { Stream } from 'openai/streaming'
import { Tiktoken } from '@dqbd/tiktoken'
import { Response } from 'express'

import { inProduction } from '../../config'
import { StreamingOptions, APIError } from '../types'
import { TIKE_OPENAI_API_KEY } from './config'
import logger from './logger'

const openai = new OpenAI({
  apiKey: TIKE_OPENAI_API_KEY,
})

export const completionStream = async (
  options: StreamingOptions
): Promise<Stream<ChatCompletionChunk> | APIError> => {
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

// Tike uses its own API key and OpenAI API instead of Azure. Hopefully get rid of this in the future.
export const handleTike = async (
  stream: Stream<ChatCompletionChunk>,
  encoding: Tiktoken,
  res: Response
) => {
  let tokenCount = 0

  // eslint-disable-next-line no-restricted-syntax
  for await (const part of stream) {
    try {
      const text = part.choices[0].delta?.content

      if (!inProduction) logger.info(text)

      if (text) {
        res.write(text)
        tokenCount += encoding.encode(text).length || 0
      }
    } catch (error) {
      logger.error(error)
    }
  }

  return tokenCount
}
