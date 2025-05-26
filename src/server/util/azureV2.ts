import { Tiktoken } from '@dqbd/tiktoken'
import { Response } from 'express'

import { AZURE_RESOURCE, AZURE_API_KEY } from './config'
import { validModels, inProduction } from '../../config'
import logger from './logger'

import { APIError } from '../types'
import { AzureOpenAI } from 'openai'
// import { EventStream } from '@azure/openai'
import { Stream } from 'openai/streaming'
import { ResponseStreamEvent } from 'openai/resources/responses/responses'

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
// const getMockCompletionEvents: () => Promise<
//   EventStream<ResponseStreamEvent>
// > = async () => {
//   const mockStream = new ReadableStream<ResponseStreamEvent>({
//     start(controller) {
//       for (let i = 0; i < 10; i += 1) {
//         controller.enqueue({
//           event: "response",
//           data: ""
//         })
//       }
//       controller.close()
//     },
//   }) as EventStream<ResponseStreamEvent>

//   return mockStream
// }

export const getResponsesEvents = async ({
  model,
  input,
  stream,
}: any): Promise<
  | Stream<ResponseStreamEvent>
  // EventStream<ChatCompletionChunk>
  | APIError
  | any
> => {
  const deploymentId = validModels.find((m) => m.name === model)?.deployment

  if (!deploymentId)
    throw new Error(
      `Invalid model: ${model}, not one of ${validModels.map((m) => m.name).join(', ')}`
    )

  // Mocking disabled because it's difficult to mock a event stream for responses API.
  // if (deploymentId === 'mock') return getMockCompletionEvents()

  try {
    const events = await client.responses.create({
      model: deploymentId,
      instructions: 'Olet avulias apuri.',
      input,
      stream,
    })

    return events
  } catch (error: any) {
    logger.error(error)

    return { error } as any as APIError
  }
}

export const streamResponsesEvents = async (
  events: Stream<ResponseStreamEvent>,
  encoding: Tiktoken,
  res: Response
) => {
  let tokenCount = 0
  const contents = []

  for await (const event of events) {
    switch (event.type) {
      case 'response.output_text.delta':
        if (!inProduction) logger.info(event.delta)

        await new Promise((resolve) => {
          if (
            !res.write(event.delta, (err) => {
              if (err) logger.error(`${event.delta} ${err}`)
            })
          ) {
            logger.info(
              `${event.delta} res.write returned false, waiting for drain`
            )
            res.once('drain', resolve)
          } else {
            process.nextTick(resolve)
          }
        })
        contents.push(event.delta)
        tokenCount += encoding.encode(event.delta).length ?? 0
        break
    }
  }

  return {
    tokenCount,
    response: contents.join(''),
  }
}
