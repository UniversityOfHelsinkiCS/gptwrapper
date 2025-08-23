import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { AIMessageChunk, BaseMessageLike } from '@langchain/core/messages'
import type { StructuredTool } from '@langchain/core/tools'
import { concat } from '@langchain/core/utils/stream'
import { AzureChatOpenAI } from '@langchain/openai'
import { validModels } from '../../../config'
import type { ChatEvent } from '../../../shared/chat'
import type { ChatMessage } from '../../../shared/llmTypes'
import type { ChatToolDef, ChatToolOutput } from '../../../shared/tools'
import type { User } from '../../../shared/user'
import { AZURE_API_KEY, AZURE_RESOURCE } from '../../util/config'
import { ToolResultStore } from './fileSearchResultsStore'
import { MockModel } from './MockModel'

const getChatModel = (model: string, tools: StructuredTool[]): BaseChatModel => {
  const deploymentName = validModels.find((m) => m.name === model)?.deployment
  if (!deploymentName) {
    throw new Error(`Invalid model: ${model}`)
  }

  const chatModel =
    deploymentName === 'mock'
      ? new MockModel()
      : new AzureChatOpenAI({
          model,
          azureOpenAIApiKey: AZURE_API_KEY,
          azureOpenAIApiVersion: '2023-05-15',
          azureOpenAIApiDeploymentName: deploymentName,
          azureOpenAIApiInstanceName: AZURE_RESOURCE,
        })

  chatModel.bindTools(tools)

  return chatModel
}

type WriteEventFunction = (data: ChatEvent) => Promise<void>

type ChatTool = StructuredTool<any, any, any, string>

export const streamChat = async ({
  model,
  systemMessage,
  chatMessages,
  tools = [],
  writeEvent,
  user,
}: {
  model: string
  systemMessage: string
  chatMessages: ChatMessage[]
  tools?: ChatTool[]
  writeEvent: WriteEventFunction
  user: User
}) => {
  const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))

  const chatModel = getChatModel(model, tools)

  const messages: BaseMessageLike[] = [
    {
      role: 'system',
      content: systemMessage,
    },
    ...chatMessages,
  ]

  const result = await chatTurn(chatModel, messages, toolsByName, writeEvent, user)

  if (result.toolCalls.length > 0) {
    const result2 = await chatTurn(chatModel, messages, toolsByName, writeEvent, user)

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

const chatTurn = async (
  model: BaseChatModel,
  messages: BaseMessageLike[],
  toolsByName: Record<string, ChatTool>,
  writeEvent: WriteEventFunction,
  user: User,
) => {
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
          type: 'toolCallStatus',
          toolName: toolCall.name as ChatToolDef['name'],
          callId: id,
          text: 'Searching',
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
        type: 'toolCallStatus',
        toolName: name,
        callId: id,
        text: `Searching for '${input.query}'`,
        input,
      })
      const result = await tool.invoke(toolCall)
      const artifact = result.artifact as ChatToolOutput
      await ToolResultStore.saveResults(id, artifact, user)
      messages.push(result)
      toolCallStatuses[id] = {
        status: 'completed',
      }
      await writeEvent({
        type: 'toolCallStatus',
        toolName: name,
        callId: id,
        text: `Completed search for '${input.query}'`,
        input,
        result: { files: artifact.map((chunk) => ({ fileName: chunk.metadata.ragFileName, score: chunk.score })) },
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
