import type { Tiktoken } from '@dqbd/tiktoken'
import type { Response } from 'express'
import { z } from 'zod/v4'

import { AZURE_RESOURCE, AZURE_API_KEY } from '../config'
import { validModels } from '../../../config'
import logger from '../logger'

import type { APIError } from '../../types'
import { AzureOpenAI } from 'openai'

// import { EventStream } from '@azure/openai'
import type { Stream } from 'openai/streaming'
import type { FileSearchTool, ResponseIncludable, ResponseInput, ResponseItemsPage, ResponseStreamEvent } from 'openai/resources/responses/responses'

import { createFileSearchTool } from './util'

import type { FileCitation, ResponseStreamEventData } from '../../../shared/types'

import { createMockStream } from './mocks/MockStream'
import type { MockResponseStreamEvent } from './mocks/mockFunctions'

const endpoint = `https://${AZURE_RESOURCE}.openai.azure.com/`

export const getAzureOpenAIClient = (deployment: string) =>
  new AzureOpenAI({
    apiKey: AZURE_API_KEY,
    deployment,
    apiVersion: '2025-03-01-preview',
    endpoint,
  })

const client = getAzureOpenAIClient(process.env.GPT_4O_MINI)

const validatedInputSchema = z.object({
  role: z.enum(['assistant', 'user', 'system']),
  content: z.string().trim(),
})

type ValidatedResponseInput = z.infer<typeof validatedInputSchema>

export class ResponsesClient {
  model: string
  instructions: string
  temperature: number
  tools: FileSearchTool[]

  constructor({ model, temperature, vectorStoreId, instructions }: { model: string; temperature: number; vectorStoreId?: string; instructions?: string }) {
    const selectedModel = validModels.find((m) => m.name === model)?.deployment

    if (!selectedModel) throw new Error(`Invalid model: ${model}, not one of ${validModels.map((m) => m.name).join(', ')}`)

    const fileSearchTool = vectorStoreId
      ? [
          createFileSearchTool({
            vectorStoreId,
          }),
        ]
      : [] // needs to retrun empty array for null

    this.model = selectedModel
    this.temperature = temperature
    this.instructions = instructions
    this.tools = fileSearchTool
  }

  async createResponse({
    input,
    prevResponseId,
    include,
  }: {
    input: ResponseInput
    prevResponseId?: string
    include?: ResponseIncludable[]
  }): Promise<Stream<ResponseStreamEvent> | APIError> {
    try {
      const sanitizedInput = validatedInputSchema.parse(input)

      if (this.model === 'mock') {
        // @todo create a type that both acual requests and mock requests can implement properly. Now it is mayhem.
        return createMockStream<ValidatedResponseInput>(sanitizedInput) as unknown as Promise<Stream<ResponseStreamEvent>>
      }

      return await client.responses.create({
        model: this.model,
        previous_response_id: prevResponseId || undefined,
        instructions: this.instructions,
        temperature: this.temperature,
        input: [sanitizedInput],
        stream: true,
        tools: this.tools,
        tool_choice: 'auto',
        store: true,
        include,
        /**
         * background: true is mot currenlty supported by Azure OpenAI.
         * It breaks the text generation. But it is vital for really
         * stopping the text generation. Currently cancelling a text
         * generation is only handled on the client level.
         *
         * Waiting for Azure/openai to fix this issue.
         */
        // background: true,
      })
    } catch (error: any) {
      logger.error(error)

      return { error } as any as APIError
    }
  }

  async handleResponse({ events, encoding, res, ragIndexId }: { events: Stream<ResponseStreamEvent>; encoding: Tiktoken; res: Response; ragIndexId?: number }) {
    let tokenCount = 0
    const contents = []

    for await (const event of events) {
      // console.log('event type:', event.type)

      switch (event.type) {
        case 'response.output_text.delta':
          await this.write(
            {
              type: 'writing',
              text: event.delta,
            },
            res,
          )

          contents.push(event.delta)
          tokenCount += encoding.encode(event.delta).length ?? 0
          break

        case 'response.file_search_call.completed':
          console.log('file search completed')
          break

        case 'response.output_item.done': {
          if (event.item.type === 'file_search_call') {
            this.write(
              {
                type: 'fileSearchDone',
                fileSearch: { ...event.item, ragIndexId },
              },
              res,
            )
          }

          break
        }

        // case 'response.output_text.annotation.added':
        //   console.log(event)
        //   this.write(
        //     {
        //       type: 'annotation',
        //       annotation: event.annotation as FileCitation,
        //     },
        //     res
        //   )
        //   break

        case 'response.file_search_call.in_progress':
          this.write(
            {
              type: 'fileSearchStarted',
            },
            res,
          )
          break

        case 'response.completed':
          await this.write(
            {
              type: 'complete',
              prevResponseId: event.response.id,
            },
            res,
          )
          break
      }
    }

    return {
      tokenCount,
      response: contents.join(''),
    }
  }

  private async write(data: ResponseStreamEventData, res: Response) {
    await new Promise((resolve) => {
      const success = res.write(JSON.stringify(data) + '\n', (err) => {
        if (err) {
          logger.error(err)
        }
      })

      if (!success) {
        logger.info('res.write returned false, waiting for drain')
        res.once('drain', resolve)
      } else {
        process.nextTick(resolve)
      }
    })
  }

  static async cancelResponse({ responseId }: { responseId: string }): Promise<void> {
    try {
      await client.responses.cancel(responseId)
    } catch (error: any) {
      logger.error(`Error cancelling response ${responseId}:`, error)
      throw new Error(`Failed to cancel response: ${error.message}`)
    }
  }

  static async getResponseItemList({ responseId }: { responseId: string }): Promise<ResponseItemsPage> {
    try {
      return await client.responses.inputItems.list(responseId)
    } catch (error: any) {
      logger.error(`Error retrieving response items for ${responseId}:`, error)
      throw new Error(`Failed to retrieve response items: ${error.message}`)
    }
  }
}
