import { OpenAIClient, AzureKeyCredential, EventStream, ChatCompletions, GetEmbeddingsOptions } from '@azure/openai'
import { Tiktoken } from '@dqbd/tiktoken'
import { Response } from 'express'

import { AzureOptions, APIError } from '../types'
import { AZURE_RESOURCE, AZURE_API_KEY } from './config'
import { validModels, inProduction } from '../../config'
import logger from './logger'
import { AzureOpenAI } from 'openai'

const endpoint = `https://${AZURE_RESOURCE}.openai.azure.com/`

const oldClient = new OpenAIClient(endpoint, new AzureKeyCredential(AZURE_API_KEY))

export const getAzureOpenAIClient = (deployment: string) =>
  new AzureOpenAI({
    apiKey: AZURE_API_KEY,
    deployment,
    apiVersion: '2025-03-01-preview',
    endpoint,
  })

/**
 * Mock stream for testing
 */
const getMockCompletionEvents: () => Promise<EventStream<ChatCompletions>> = async () => {
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

export const getCompletionEvents = async ({ model, messages, options }: AzureOptions) => {
  const deploymentId = validModels.find((m) => m.name === model)?.deployment

  if (!deploymentId) throw new Error(`Invalid model: ${model}, not one of ${validModels.map((m) => m.name).join(', ')}`)

  if (deploymentId === 'mock') return getMockCompletionEvents()

  try {
    const events = await oldClient.streamChatCompletions(deploymentId, messages, options)

    return events
  } catch (error: any) {
    logger.error(error)

    return { error } as any as APIError
  }
}

export const streamCompletion = async (events: EventStream<ChatCompletions>, options: AzureOptions, encoding: Tiktoken, res: Response) => {
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
            logger.info(`${choice.delta} res.write returned false, waiting for drain`)
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

export const getOpenAiEmbedding = async (prompt: string) => {
  const opts: GetEmbeddingsOptions = {
    dimensions: 1536,
    model: 'text-embedding-3-small',
  }

  const embedding = await oldClient.getEmbeddings('text-embedding-3-small', [prompt], opts)

  console.log(embedding)
}
