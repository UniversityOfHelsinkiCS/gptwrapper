/* eslint-disable no-restricted-syntax */
import {
  OpenAIClient,
  AzureKeyCredential,
  EventStream,
  ChatCompletions,
} from '@azure/openai'
import { Tiktoken } from '@dqbd/tiktoken'
import { Response } from 'express'

import { AzureOptions, APIError } from '../types'
import { AZURE_RESOURCE, AZURE_API_KEY } from './config'
import { validModels, inProduction } from '../../config'
import logger from './logger'
import { sleep } from './util'

const endpoint = `https://${AZURE_RESOURCE}.openai.azure.com/`

const client = new OpenAIClient(endpoint, new AzureKeyCredential(AZURE_API_KEY))

export const getCompletionEvents = async ({
  model,
  messages,
}: AzureOptions) => {
  const deploymentId = validModels.find((m) => m.name === model)?.deployment

  if (!deploymentId) throw new Error(`Invalid model: ${model}`)

  try {
    const events = await client.streamChatCompletions(deploymentId, messages)

    return events
  } catch (error: any) {
    logger.error(error)

    return { error } as any as APIError
  }
}

export const streamCompletion = async (
  events: EventStream<ChatCompletions>,
  options: AzureOptions,
  encoding: Tiktoken,
  res: Response
) => {
  let i = 0
  let tokenCount = 0
  for await (const event of events) {
    // Slow sending of messages to prevent blocky output
    i += options.model === 'gpt-4' ? 150 : 50
    for (const choice of event.choices) {
      const delta = choice.delta?.content

      if (!inProduction) logger.info(delta)

      if (delta !== undefined) {
        setTimeout(() => res.write(delta), i)
        tokenCount += encoding.encode(delta).length ?? 0
      }
    }
  }

  await sleep(i)

  return tokenCount
}
