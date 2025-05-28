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
  FileSearchTool,
  FunctionTool,
  ResponseInput,
  ResponseInputItem,
  ResponseStreamEvent,
} from 'openai/resources/responses/responses'

// import { ohtuRAGTest } from './functionTools'
import { fileSearchTest } from './fileSearchTools'

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
  tools: (FunctionTool | FileSearchTool)[]

  constructor(model: string, instructions?: string) {
    const deploymentId = validModels.find((m) => m.name === model)?.deployment

    if (!deploymentId)
      throw new Error(
        `Invalid model: ${model}, not one of ${validModels.map((m) => m.name).join(', ')}`
      )

    this.model = deploymentId
    this.instructions =
      instructions ||
      'Olet ohjelmistotuotanto kurssin avustaja. Jos käyttäjä kysyy jotain, niin arvioi ensin liittyykö se ohjelmistotuotannon kurssiin. Jos liittyy, niin toteuta file_search. jos et löydä sopivia tiedostoja, niin sano että haulla ei löytynyt mitään. Jos käyttäjän viesti ei liittynyt ohjelmistotuotannon kurssiin, niin kysy ystävällisesti voitko auttaa jotenkin muuten kurssimateriaalien suhteen.'
    this.tools = [
      // ohtuRAGTest.definition,
      fileSearchTest.definition,
    ]
  }

  async createResponse({
    input,
  }: {
    input: ResponseInput
  }): Promise<Stream<ResponseStreamEvent> | APIError> {
    try {
      return await client.responses.create({
        model: this.model,
        // previous_response_id=response.id // THIS MIGHT BE IT!!!!!!1
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

  async handleResponse({
    events,
    prevMessages,
    encoding,
    res,
  }: {
    events: Stream<ResponseStreamEvent>
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

        case 'response.file_search_call.completed':
          console.log('file search completed')
          break

        case 'response.output_item.done':
          console.log('OUTPUT_ITEM DONE???', JSON.stringify(event, null, 2))
          break

        case 'response.output_text.annotation.added':
          console.log('ANNOTATIONS ADDED', JSON.stringify(event, null, 2))
          break

        case 'response.function_call_arguments.done':
          // Listen to file_search instead
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
}
