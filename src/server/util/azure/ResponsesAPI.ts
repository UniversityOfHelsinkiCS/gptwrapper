import { Tiktoken } from '@dqbd/tiktoken'
import { Response } from 'express'
import { isError } from '../parser'

import { AZURE_RESOURCE, AZURE_API_KEY } from '../config'
import { validModels, inProduction } from '../../../config'
import logger from '../logger'

import { APIError } from '../../types'
import { AzureOpenAI } from 'openai'

// import { EventStream } from '@azure/openai'
import { Stream } from 'openai/streaming'
import { FileSearchTool, FunctionTool, ResponseInput, ResponseInputItem, ResponseStreamEvent } from 'openai/resources/responses/responses'

import { courseAssistants, type CourseAssistant } from './courseAssistants'
import { createFileSearchTool } from './util'

import type { ResponseStreamValue } from '../../../shared/types'

const endpoint = `https://${AZURE_RESOURCE}.openai.azure.com/`

export const getAzureOpenAIClient = (deployment: string) =>
  new AzureOpenAI({
    apiKey: AZURE_API_KEY,
    deployment,
    apiVersion: '2025-03-01-preview',
    endpoint,
  })

const client = getAzureOpenAIClient(process.env.GPT_4O)

export class ResponsesClient {
  model: string
  instructions: string
  tools: FileSearchTool[]

  constructor({ model, courseId }: { model: string; courseId?: string }) {
    const deploymentId = validModels.find((m) => m.name === model)?.deployment

    if (!deploymentId) throw new Error(`Invalid model: ${model}, not one of ${validModels.map((m) => m.name).join(', ')}`)

    let courseAssistant: CourseAssistant

    if (courseId) {
      courseAssistant = courseAssistants.find((assistant) => assistant.course_id === courseId)

      if (!courseAssistant) throw new Error(`No course assistant found for course ID: ${courseId}`)
    } else {
      courseAssistant = courseAssistants.find((assistant) => assistant.name === 'default')
    }

    const fileSearchTool = courseId
      ? [
          createFileSearchTool({
            vectorStoreId: courseAssistant.vector_store_id,
          }),
        ]
      : [] // needs to retrun empty array for null

    this.model = deploymentId
    this.instructions = courseAssistant.assistant_instruction
    this.tools = fileSearchTool
  }

  async createResponse({ input, prevResponseId }: { input: ResponseInput; prevResponseId?: string }): Promise<Stream<ResponseStreamEvent> | APIError> {
    try {
      return await client.responses.create({
        model: this.model,
        previous_response_id: prevResponseId || undefined,
        instructions: this.instructions,
        input,
        stream: true,
        tools: this.tools,
        tool_choice: 'auto',
      })
    } catch (error: any) {
      logger.error(error)

      return { error } as any as APIError
    }
  }

  async handleResponse({ events, encoding, res }: { events: Stream<ResponseStreamEvent>; encoding: Tiktoken; res: Response }) {
    let tokenCount = 0
    const contents = []

    for await (const event of events) {
      console.log('event type:', event.type)

      switch (event.type) {
        case 'response.output_text.delta':
          await this.write(
            {
              status: 'writing',
              text: event.delta,
              prevResponseId: null,
            },
            res,
          )

          contents.push(event.delta)
          tokenCount += encoding.encode(event.delta).length ?? 0
          break

        case 'response.file_search_call.completed':
          console.log('file search completed')
          break

        case 'response.output_item.done':
          console.log('OUTPUT_ITEM DONE???', JSON.stringify(event, null, 2))
          break

        case 'response.output_text.annotation.added':
          console.log('ANNOTATIONS ADDED', JSON.stringify(event, null, 2))
          break

        case 'response.completed':
          await this.write(
            {
              status: 'complete',
              text: null,
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

  private async write({ status, text, prevResponseId }: ResponseStreamValue, res: Response) {
    // if (!inProduction) logger.info(message)

    await new Promise((resolve) => {
      const data: ResponseStreamValue = {
        status,
        text,
        prevResponseId: prevResponseId,
      }

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
}
