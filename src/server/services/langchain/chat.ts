import { AzureChatOpenAI } from '@langchain/openai'
import { AZURE_API_KEY, AZURE_RESOURCE } from '../../util/config'
import { validModels } from '../../../config'
import { ChatMessage, Message } from '../../../shared/llmTypes'
import { Response } from 'express'
import { AIMessageChunk } from '@langchain/core/messages'
import { IterableReadableStream } from '@langchain/core/utils/stream'
import { ResponseStreamEventData } from '../../../shared/types'
import { Tiktoken } from '@dqbd/tiktoken'

const getChatModel = (model: string) => {
  const deploymentName = validModels.find((m) => m.name === model)?.deployment
  if (!deploymentName) {
    throw new Error(`Invalid model: ${model}`)
  }

  return new AzureChatOpenAI({
    model,
    azureOpenAIApiKey: AZURE_API_KEY,
    azureOpenAIApiVersion: '2023-05-15',
    azureOpenAIApiDeploymentName: deploymentName,
    azureOpenAIApiInstanceName: AZURE_RESOURCE,
  })
}

export const createChatStream = async ({ model, systemMessage, chatMessages }: { model: string; systemMessage: string; chatMessages: ChatMessage[] }) => {
  const chatModel = getChatModel(model)

  const stream = await chatModel.stream([
    {
      role: 'system',
      content: systemMessage,
    },
    ...chatMessages,
  ])

  return stream
}

export const streamChatResponse = async (
  stream: IterableReadableStream<AIMessageChunk>,
  write: (data: ResponseStreamEventData) => Promise<void>,
  encoding: Tiktoken,
  startTS: number,
) => {
  let tokenCount = 0
  let firstTokenTS = 0
  let timeToFirstToken: number | undefined = undefined
  let fullText = ''

  for await (const chunk of stream) {
    if (!timeToFirstToken) {
      firstTokenTS = Date.now()
      timeToFirstToken = firstTokenTS - startTS
    }

    const text = chunk.content as string
    tokenCount += encoding.encode(text).length
    fullText += text

    await write({
      type: 'writing',
      text: chunk.content as string,
    })
  }

  const tokenStreamingDuration = Date.now() - firstTokenTS

  return {
    tokenCount,
    tokenStreamingDuration,
    timeToFirstToken,
    tokensPerSecond: timeToFirstToken ? (tokenCount / tokenStreamingDuration) * 1000 : undefined,
    response: fullText,
  }
}
