import { Tiktoken } from '@dqbd/tiktoken'
import { Response } from 'express'
import { isError } from '../../util/parser'

import { AZURE_RESOURCE, AZURE_API_KEY } from '../config'
import { validModels, inProduction } from '../../../config'
import logger from '../logger'

import { APIError } from '../../types'
import { AzureOpenAI } from 'openai'
// import { EventStream } from '@azure/openai'
import { Stream } from 'openai/streaming'
import {
  FunctionTool,
  ResponseInput,
  ResponseInputItem,
  ResponseStreamEvent,
} from 'openai/resources/responses/responses'

import { testTool } from './tools'

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
  tools: FunctionTool[]

  constructor(model: string, instructions?: string) {
    const deploymentId = validModels.find((m) => m.name === model)?.deployment

    if (!deploymentId)
      throw new Error(
        `Invalid model: ${model}, not one of ${validModels.map((m) => m.name).join(', ')}`
      )

    this.model = deploymentId
    this.instructions = instructions || 'Olet avulias apuri.'
    this.tools = [testTool.definition]
  }

  async createResponse({
    input,
  }: {
    input: ResponseInput
  }): Promise<Stream<ResponseStreamEvent> | APIError> {
    try {
      return await client.responses.create({
        model: this.model,
        instructions: this.instructions,
        input,
        stream: true,
        tools: this.tools,
      })
    } catch (error: any) {
      logger.error(error)

      return { error } as any as APIError
    }
  }

  async handleResponse({
    events,
    prevMessages,
    encoding,
    res,
  }: {
    events: Stream<any>
    prevMessages: ResponseInput
    encoding: Tiktoken
    res: Response
  }) {
    let tokenCount = 0
    const contents = []

    for await (const event of events) {
      console.log('event type:', event.type)

      switch (event.type) {
        case 'response.output_text.delta':
          await this.writeDelta(event.delta, res)

          contents.push(event.delta)
          tokenCount += encoding.encode(event.delta).length ?? 0
          break

        case 'response.function_call_arguments.done':
          // WORK IN PROGRESS

          // const augRetrieval = await this.callToolFunction(
          //   event.arguments,
          //   event.call_id
          // )
          // const newEvents = await this.createResponse({
          //   input: [...prevMessages, augRetrieval],
          // })

          // if (isError(events)) {
          //   throw new Error(`Error creating response from function call`)
          // }

          // await this.handleResponse({
          //   events: newEvents as Stream<ResponseStreamEvent>,
          //   prevMessages: [...prevMessages, augRetrieval],
          //   encoding,
          //   res,
          // })
          break
      }
    }

    return {
      tokenCount,
      response: contents.join(''),
    }
  }

  private async writeDelta(text: string, res: Response) {
    // if (!inProduction) logger.info(text)

    await new Promise((resolve) => {
      if (
        !res.write(text, (err) => {
          if (err) logger.error(`${text} ${err}`)
        })
      ) {
        logger.info(`${text} res.write returned false, waiting for drain`)
        res.once('drain', resolve)
      } else {
        process.nextTick(resolve)
      }
    })
  }

  private async callToolFunction(
    args: string,
    callId: string
  ): Promise<ResponseInputItem[]> {
    const { query } = JSON.parse(args)
    try {
      const retrieval = await testTool.function(query)

      return [
        {
          role: 'user',
          content: retrieval.query,
        },
        {
          type: 'function_call_output',
          call_id: callId,
          output: retrieval.result,
        },
      ]
    } catch (error) {
      logger.error('Error calling tool function:', error)
      return null
    }
  }
}
