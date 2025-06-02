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
import { FileSearchTool, FunctionTool, ResponseInput, ResponseInputItem, ResponseStreamEvent, ResponseTextAnnotationDeltaEvent } from 'openai/resources/responses/responses'

import { courseAssistants } from './courseAssistants'
import { createFileSearchTool } from './util'

import type { CourseAssistant, FileCitation, ResponseStreamEventData } from '../../../shared/types'

const endpoint = `https://${AZURE_RESOURCE}.openai.azure.com/`

export const getAzureOpenAIClient = (deployment: string) =>
  new AzureOpenAI({
    apiKey: AZURE_API_KEY,
    deployment,
    apiVersion: '2025-03-01-preview',
    endpoint,
  })

const client = getAzureOpenAIClient(process.env.GPT_4O_MINI)

export class ResponsesClient {
  model: string
  instructions: string
  tools: FileSearchTool[]
  courseAssistant: CourseAssistant

  constructor({ model, courseId, vectorStoreId }: { model: string; courseId?: string; vectorStoreId?: string }) {
    const deploymentId = validModels.find((m) => m.name === model)?.deployment

    if (!deploymentId) throw new Error(`Invalid model: ${model}, not one of ${validModels.map((m) => m.name).join(', ')}`)

    if (courseId) {
      this.courseAssistant = courseAssistants.find((assistant) => assistant.course_id === courseId)

      if (!this.courseAssistant) throw new Error(`No course assistant found for course ID: ${courseId}`)
    } else {
      this.courseAssistant = courseAssistants.find((assistant) => assistant.name === 'default')
    }

    const fileSearchTool = courseId
      ? [
          createFileSearchTool({
            vectorStoreId,
          }),
        ]
      : [] // needs to retrun empty array for null

    this.model = deploymentId
    this.instructions = this.courseAssistant.assistant_instruction
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
        store: true,
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

        case 'response.output_item.done':
          console.log('OUTPUT_ITEM DONE???', JSON.stringify(event, null, 2))
          break

        case 'response.output_text.annotation.added':
          this.write(
            {
              type: 'annotation',
              annotation: event.annotation as FileCitation,
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
}
