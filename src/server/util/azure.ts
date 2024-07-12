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

const endpoint = `https://${AZURE_RESOURCE}.openai.azure.com/`

const client = new OpenAIClient(endpoint, new AzureKeyCredential(AZURE_API_KEY))

/**
 * Mock stream for testing
 */
const getMockCompletionEvents: () => Promise<
  EventStream<ChatCompletions>
> = async () => {
  const mockStream = new ReadableStream<ChatCompletions>({
    start(controller) {
      for (let i = 0; i < 10; i += 1) {
        controller.enqueue({
          id: String(i),
          created: new Date(),
          promptFilterResults: [],
          choices: [
            {
              delta: {
                content: `This is completion ${i}\n`,
                role: 'system',
                toolCalls: [],
              },
              index: 0,
              finishReason: 'completed',
              logprobs: undefined,
            },
          ],
        })
      }
      controller.close()
    },
  }) as EventStream<ChatCompletions>

  return mockStream
}

export const getCompletionEvents = async ({
  model,
  messages,
  options,
}: AzureOptions) => {
  const deploymentId = validModels.find((m) => m.name === model)?.deployment

  if (!deploymentId) throw new Error(`Invalid model: ${model}`)

  if (deploymentId === 'mock') return getMockCompletionEvents()

  try {
    const events = await client.streamChatCompletions(
      deploymentId,
      messages,
      options
    )

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
  let tokenCount = 0
  for await (const event of events) {
    // Slow sending of messages to prevent blocky output
    for (const choice of event.choices) {
      const delta = choice.delta?.content

      if (!inProduction) logger.info(delta)

      if (delta !== undefined) {
        // eslint-disable-next-line
        await new Promise((resolve) => {
          if (!res.write(delta)) {
            res.once('drain', resolve)
          } else {
            process.nextTick(resolve)
          }
        })

        tokenCount += encoding.encode(delta).length ?? 0
      }
    }
  }

  return tokenCount
}
