import { AzureChatOpenAI } from '@langchain/openai'
import { AZURE_API_KEY, AZURE_RESOURCE } from '../../util/config'
import { validModels } from '../../../config'
import { ChatMessage, Message } from '../../../shared/llmTypes'
import { Response } from 'express'
import { AIMessageChunk, BaseMessage, BaseMessageLike } from '@langchain/core/messages'
import { IterableReadableStream } from '@langchain/core/utils/stream'
import { ResponseStreamEventData } from '../../../shared/types'
import { Tiktoken } from '@dqbd/tiktoken'
import { FakeStreamingChatModel } from '@langchain/core/utils/testing'
import { MockModel } from './MockModel'
import { StructuredTool } from '@langchain/core/tools'
import { concat } from '@langchain/core/utils/stream'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { Runnable } from '@langchain/core/runnables'
import logger from '../../util/logger'
import { BaseLanguageModelInput } from '@langchain/core/language_models/base'
import { ToolCall } from '@langchain/core/messages/tool'
import { ChatToolDef } from '../../../shared/tools'

const getChatModel = (model: string, tools: StructuredTool[]): BaseChatModel => {
  const deploymentName = validModels.find((m) => m.name === model)?.deployment
  if (!deploymentName) {
    throw new Error(`Invalid model: ${model}`)
  }

  if (deploymentName === 'mock') {
    return new MockModel()
  }

  return new AzureChatOpenAI({
    model,
    azureOpenAIApiKey: AZURE_API_KEY,
    azureOpenAIApiVersion: '2023-05-15',
    azureOpenAIApiDeploymentName: deploymentName,
    azureOpenAIApiInstanceName: AZURE_RESOURCE,
  }).bindTools(tools) as BaseChatModel
}

type WriteEventFunction = (data: ResponseStreamEventData) => Promise<void>

type ChatTool = StructuredTool<any, any, any, string>

export const streamChat = async ({
  model,
  systemMessage,
  chatMessages,
  tools = [],
  writeEvent,
}: {
  model: string
  systemMessage: string
  chatMessages: ChatMessage[]
  tools?: ChatTool[]
  writeEvent: WriteEventFunction
}) => {
  const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))

  const chatModel = getChatModel(model, tools)

  const messages = [
    {
      role: 'system',
      content: systemMessage,
    },
    ...chatMessages,
  ]

  const result = await chatTurn(chatModel, messages, toolsByName, writeEvent)

  if (result.toolCalls.length > 0) {
    const result2 = await chatTurn(chatModel, messages, toolsByName, writeEvent)

    return {
      tokenCount: result2.tokenCount,
      firstTokenTS: result2.firstTokenTS,
      inputTokenCount: result2.inputTokenCount,
      tokenStreamingDuration: result2.tokenStreamingDuration,
      timeToFirstToken: result2.timeToFirstToken,
      tokensPerSecond: result2.tokensPerSecond,
      response: (result2.fullOutput?.content ?? '') as string,
    }
  }

  return {
    tokenCount: result.tokenCount,
    firstTokenTS: result.firstTokenTS,
    inputTokenCount: result.inputTokenCount,
    tokenStreamingDuration: result.tokenStreamingDuration,
    timeToFirstToken: result.timeToFirstToken,
    tokensPerSecond: result.tokensPerSecond,
    response: (result.fullOutput?.content ?? '') as string,
  }
}

const chatTurn = async (model: BaseChatModel, messages: BaseMessageLike[], toolsByName: Record<string, ChatTool>, writeEvent: WriteEventFunction) => {
  const stream = await model.stream(messages)

  const startTS = Date.now()
  let firstTokenTS = 0
  let timeToFirstToken: number | undefined
  const toolCallStatuses: Record<string, { status: 'pending' | 'completed' | 'error' }> = {}
  let fullOutput: AIMessageChunk | undefined

  for await (const chunk of stream) {
    if (!timeToFirstToken) {
      firstTokenTS = Date.now()
      timeToFirstToken = firstTokenTS - startTS
    }

    for (const toolCall of chunk.tool_call_chunks ?? []) {
      const id = toolCall.id
      if (id && !toolCallStatuses[id]) {
        toolCallStatuses[id] = {
          status: 'pending',
        }
        await writeEvent({
          type: 'toolCallStarting',
          name: toolCall.name as ChatToolDef['name'],
          id,
        })
      }
    }

    const text = chunk.content as string
    if (text.length > 0) {
      await writeEvent({
        type: 'writing',
        text,
      })
    }

    fullOutput = fullOutput !== undefined ? concat(fullOutput, chunk) : chunk
  }

  messages.push(fullOutput as AIMessageChunk)

  const toolCalls = fullOutput?.tool_calls ?? []
  for (const toolCall of toolCalls) {
    const tool = toolsByName[toolCall.name]
    const id = toolCall.id
    const name = toolCall.name as ChatToolDef['name']
    const input = toolCall.args as ChatToolDef['input']
    if (id && tool) {
      await writeEvent({
        type: 'toolCallStarted',
        name,
        input,
        id,
      })
      const result = await tool.invoke(toolCall)
      messages.push(result)
      toolCallStatuses[id] = {
        status: 'completed',
      }
      await writeEvent({
        type: 'toolCallCompleted',
        name,
        artifacts: result.artifact,
        id,
      })
    }
  }

  const tokenCount = fullOutput?.usage_metadata?.output_tokens ?? 0
  const inputTokenCount = fullOutput?.usage_metadata?.input_tokens ?? 0
  const tokenStreamingDuration = Date.now() - firstTokenTS

  return {
    tokenCount,
    firstTokenTS,
    timeToFirstToken,
    tokensPerSecond: (tokenCount / tokenStreamingDuration) * 1000,
    inputTokenCount,
    tokenStreamingDuration,
    toolCalls,
    fullOutput,
  }
}
