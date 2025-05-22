import { Tiktoken } from '@dqbd/tiktoken'
import { Response } from 'express'

import { AZURE_RESOURCE, AZURE_API_KEY } from './config'
import { validModels, inProduction } from '../../config'
import logger from './logger'

import { APIError, AzureOptionsV2 } from '../types'
import { AzureOpenAI } from 'openai'
import type { EventStream } from '@azure/openai'
import type { Stream } from 'openai/streaming'
import type { ChatCompletionChunk } from 'openai/resources/chat'

const endpoint = `https://${AZURE_RESOURCE}.openai.azure.com/`

export const getAzureOpenAIClient = (deployment: string) =>
  new AzureOpenAI({
    apiKey: AZURE_API_KEY,
    deployment,
    apiVersion: '2025-03-01-preview',
    endpoint,
  })

const client = getAzureOpenAIClient(process.env.GPT_4O)

/**
 * Mock stream for testing
 */
const getMockCompletionEvents: () => Promise<
  EventStream<ChatCompletionChunk>
> = async () => {
  const mockStream = new ReadableStream<ChatCompletionChunk>({
    start(controller) {
      for (let i = 0; i < 10; i += 1) {
        controller.enqueue({
          id: String(i),
          object: 'chat.completion.chunk',
          model: 'mock-model',
          created: Date.now(),
          choices: [
            {
              delta: {
                content: `This is completion ${i}\n`,
                role: 'system',
                tool_calls: [],
              },
              index: 0,
              finish_reason: 'stop',
              logprobs: undefined,
            },
          ],
        })
      }
      controller.close()
    },
  }) as EventStream<ChatCompletionChunk>

  return mockStream
}

export const getCompletionEventsV2 = async ({
  model,
  messages,
  options,
}: AzureOptionsV2): Promise<
  Stream<ChatCompletionChunk> | EventStream<ChatCompletionChunk> | APIError
> => {
  const deploymentId = validModels.find((m) => m.name === model)?.deployment

  if (!deploymentId)
    throw new Error(
      `Invalid model: ${model}, not one of ${validModels.map((m) => m.name).join(', ')}`
    )

  if (deploymentId === 'mock') return getMockCompletionEvents()

  try {
    const events = await client.chat.completions.create({
      messages,
      model: deploymentId,
      stream: true,
    })

    return events
  } catch (error: any) {
    logger.error(error)

    return { error } as any as APIError
  }
}

export const streamCompletionV2 = async (
  events: Stream<ChatCompletionChunk> | EventStream<ChatCompletionChunk>,
  options: AzureOptionsV2,
  encoding: Tiktoken,
  res: Response
) => {
  let tokenCount = 0
  const contents = []
  for await (const event of events) {
    for (const choice of event.choices) {
      const delta = choice.delta?.content

      if (!inProduction) logger.info(delta)

      if (delta) {
        await new Promise((resolve) => {
          if (
            !res.write(delta, (err) => {
              if (err) logger.error(`${choice.delta} ${err}`)
            })
          ) {
            logger.info(
              `${choice.delta} res.write returned false, waiting for drain`
            )
            res.once('drain', resolve)
          } else {
            process.nextTick(resolve)
          }
        })
        contents.push(delta)
        tokenCount += encoding.encode(delta).length ?? 0
      }
    }
  }

  return {
    tokenCount,
    response: contents.join(''),
  }
}
